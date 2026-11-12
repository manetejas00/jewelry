import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validationError} from './errors.js';

const now = () => new Date().toISOString();
const json = value => JSON.stringify(value);
const parse = (value, fallback = {}) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.cursor/skills');
const tones = ['Luxury', 'Professional', 'Friendly'];
const claimPatterns = [
  [/hallmark(?:ed|ing)?/i, 'hallmark'],
  [/\b(?:certified|certificate|certification)\b/i, 'certification'],
  [/\b(?:GIA|IGI|HRD|BIS)\b/g, 'laboratory or BIS name'],
  [/\bcarats?\b/i, 'carat'],
  [/\bclarity\b/i, 'clarity'],
  [/\bcut grade\b/i, 'cut grade'],
  [/\bpolish grade\b/i, 'polish grade'],
  [/\bsymmetry grade\b/i, 'symmetry grade'],
  [/\blab[ -]grown\b/i, 'lab-grown'],
  [/\bnatural diamond\b/i, 'natural diamond'],
  [/\b(?:VVS\d?|VS[12]|SI[12])\b/g, 'clarity grade']
];

export const copySkills = {
  'product-description-generator': {
    label: 'Product description',
    file: 'product-description-generator/SKILL.md',
    requireDescription: true
  },
  'product-title-optimization': {
    label: 'Product title',
    file: 'product-title-optimization/SKILL.md',
    requireName: true
  },
  'product-page-seo': {
    label: 'Product page SEO',
    file: 'product-page-seo/SKILL.md',
    requireDescription: true
  }
};

export function listCopySkills() {
  return Object.entries(copySkills).map(([id, skill]) => ({id, label: skill.label}));
}

export function productFacts(product) {
  return {
    sku: product.sku,
    product_code: product.product_code,
    name: product.name,
    category: product.category,
    description: product.description || '',
    metal: product.metal,
    purity: product.purity,
    net_weight_g: product.net_weight_g,
    size: product.size,
    finish: product.finish
  };
}

export function unsupportedClaims(source, generated) {
  const found = [];
  for (const [pattern, label] of claimPatterns) {
    pattern.lastIndex = 0;
    const inGenerated = pattern.test(generated);
    pattern.lastIndex = 0;
    const inSource = pattern.test(source);
    if (inGenerated && !inSource) found.push(label);
  }
  return [...new Set(found)];
}

export function parseCopyJson(text) {
  const trimmed = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw validationError('The copy service returned an unreadable response.', 502);
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw validationError('The copy service returned invalid copy.', 502);
  }
}

function clip(value, max) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw validationError('The copy service returned an unexpected field.', 502);
  const text = value.trim();
  if (!text) return null;
  return {text: text.slice(0, max), truncated: text.length > max};
}

export function normaliseProposal(skillId, data) {
  const skill = copySkills[skillId];
  if (!skill || !data || typeof data !== 'object') throw validationError('The copy service returned an unexpected response.', 502);
  const name = clip(data.proposed_name, 200);
  const description = clip(data.proposed_description, 5000);
  const seoTitle = clip(data.seo_title, 70);
  const meta = clip(data.meta_description, 160);
  const notes = clip(data.notes, 1000);
  if (skill.requireName && !name) throw validationError('The copy service did not return a product name.', 502);
  if (skill.requireDescription && !description) throw validationError('The copy service did not return a description.', 502);
  if (!name && !description) throw validationError('The copy service did not return catalogue text.', 502);
  const warnings = [];
  if (name?.truncated) warnings.push('name shortened to 200 characters');
  if (description?.truncated) warnings.push('description shortened to 5000 characters');
  const metaText = meta?.text || (description ? description.text.slice(0, 160) : null);
  return {
    proposed_name: name?.text || null,
    proposed_description: description?.text || null,
    seo_title: seoTitle?.text || null,
    meta_description: metaText,
    notes: notes?.text || null,
    limit_notes: warnings
  };
}

function skillText(relativePath) {
  const file = path.join(skillRoot, relativePath);
  if (!fs.existsSync(file)) throw validationError('A catalogue copy skill file is missing on the server.', 500);
  return fs.readFileSync(file, 'utf8');
}

export function buildCopyMessages(skillId, product, tone) {
  const skill = copySkills[skillId];
  if (!skill) throw validationError('Unknown catalogue copy skill');
  if (!tones.includes(tone)) throw validationError('Choose Luxury, Professional, or Friendly');
  const facts = productFacts(product);
  const system = [
    skillText('veyora-catalogue-copy/SKILL.md'),
    skillText(skill.file),
    'Return one JSON object and no markdown. Keys: proposed_name, proposed_description, seo_title, meta_description, notes. Use null for a key you are not changing. The live meta description is the first 160 characters of the published description.'
  ].join('\n\n');
  const user = json({
    platform: 'Veyora Jewels storefront',
    tone,
    skill: skillId,
    product: facts,
    instruction: 'Draft catalogue copy from these fields. Leave proposed_name null when the current name should stay.'
  });
  return [
    {role: 'system', content: system},
    {role: 'user', content: user}
  ];
}

export async function completeCopy({env = process.env, fetchImpl = globalThis.fetch, messages, signal}) {
  if (!env.AI_API_KEY) throw validationError('Catalogue copy is unavailable until AI_API_KEY is set on the server.', 503);
  const base = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = env.AI_MODEL || 'gpt-4o-mini';
  let response;
  try {
    response = await fetchImpl(`${base}/chat/completions`, {
      method: 'POST',
      signal: signal || AbortSignal.timeout(40000),
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}`},
      body: json({model, temperature: 0.4, messages})
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw validationError('The copy service timed out. No live catalogue text was changed.', 504);
    throw validationError('The copy service could not be reached. No live catalogue text was changed.', 502);
  }
  if (response.status === 429) throw validationError('The copy service is rate limited. Wait and try again. No live catalogue text was changed.', 429);
  if (!response.ok) throw validationError('The copy service rejected the request. No live catalogue text was changed.', 502);
  let body;
  try {
    body = await response.json();
  } catch {
    throw validationError('The copy service returned an unreadable response.', 502);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw validationError('The copy service returned an empty response.', 502);
  return content;
}

async function ensureTable(k) {
  if (!(await k.schema.hasTable('ai_drafts'))) throw validationError('Catalogue copy storage is not available. Apply migration 013_ai_drafts.js when you are ready.', 503);
}

function present(row) {
  if (!row) return null;
  return {
    ...row,
    input: parse(row.input_json, {}),
    output: parse(row.output_json, null),
    published_fields: parse(row.published_fields, null)
  };
}

function logCopy(event, fields) {
  console.info(json({event, ...fields}));
}

async function recordFailure(k, fields, error) {
  await k('ai_drafts').insert({
    ...fields,
    status: 'failed',
    output_json: null,
    error: String(error.message || 'Copy request failed').slice(0, 500),
    created_at: now()
  });
  await k('audit').insert({staff_id: fields.staff_id, action: 'ai_draft_failed', details: json({skill: fields.skill, sku: fields.sku, status: error.status || 502}), created_at: now()});
}

export async function createCatalogueDraft(k, {sku, skill, tone = 'Luxury', staffId, env, fetchImpl}) {
  await ensureTable(k);
  if (!copySkills[skill]) throw validationError('Unknown catalogue copy skill');
  const product = await k('products').where({sku: String(sku || '')}).first();
  if (!product) throw validationError('Product not found', 404);
  const chosenTone = tone || 'Luxury';
  const pending = await k('ai_drafts').where({sku: product.sku, skill, status: 'pending'}).first();
  if (pending) throw validationError(`A pending draft already exists for this product and skill (draft ${pending.id}). Review it before running the skill again.`, 409);
  const facts = productFacts(product);
  const base = {skill, sku: product.sku, tone: chosenTone, input_json: json(facts), staff_id: staffId || null};
  const started = Date.now();
  try {
    const messages = buildCopyMessages(skill, product, chosenTone);
    const raw = await completeCopy({env, fetchImpl, messages});
    const proposal = normaliseProposal(skill, parseCopyJson(raw));
    const source = Object.values(facts).join('\n');
    const generated = [proposal.proposed_name, proposal.proposed_description, proposal.seo_title, proposal.meta_description, proposal.notes].filter(Boolean).join('\n');
    proposal.warnings = [...proposal.limit_notes, ...unsupportedClaims(source, generated)];
    delete proposal.limit_notes;
    const inserted = await k('ai_drafts').insert({...base, status: 'pending', output_json: json(proposal), error: null, created_at: now()});
    const id = Array.isArray(inserted) ? inserted[0] : inserted;
    await k('audit').insert({staff_id: staffId || null, action: 'ai_draft_created', details: json({id, skill, sku: product.sku}), created_at: now()});
    logCopy('ai_draft_created', {id, skill, sku: product.sku, staffId: staffId || null, ms: Date.now() - started});
    return present(await k('ai_drafts').where({id}).first());
  } catch (error) {
    await recordFailure(k, base, error);
    logCopy('ai_draft_failed', {skill, sku: product.sku, staffId: staffId || null, status: error.status || 500, ms: Date.now() - started});
    throw error;
  }
}

export async function listCatalogueDrafts(k, {sku, status} = {}) {
  await ensureTable(k);
  let query = k('ai_drafts').orderBy('id', 'desc').limit(50);
  if (sku) query = query.where({sku: String(sku)});
  if (status) query = query.where({status: String(status)});
  return (await query).map(present);
}

export async function approveCatalogueDraft(k, id, {applyName = false, applyDescription = false, acknowledgeWarnings = false, staffId}) {
  await ensureTable(k);
  const draft = await k('ai_drafts').where({id}).first();
  if (!draft || draft.status !== 'pending') throw validationError('Draft is not awaiting review', 404);
  const output = parse(draft.output_json, {});
  if (output.warnings?.length && !acknowledgeWarnings) throw validationError('Review the claim warnings and confirm them before publishing.');
  const patch = {updated_at: now()};
  const published = [];
  if (applyName) {
    if (!output.proposed_name) throw validationError('This draft has no name to publish');
    patch.name = output.proposed_name;
    published.push('name');
  }
  if (applyDescription) {
    if (!output.proposed_description) throw validationError('This draft has no description to publish');
    patch.description = output.proposed_description;
    published.push('description');
  }
  if (!published.length) throw validationError('Choose the name, the description, or both');
  await k.transaction(async t => {
    const count = await t('products').where({sku: draft.sku}).update(patch);
    if (!count) throw validationError('Product not found', 404);
    const reviewed = await t('ai_drafts').where({id, status: 'pending'}).update({status: 'approved', reviewed_at: now(), reviewed_by: staffId || null, published_fields: json(published)});
    if (!reviewed) throw validationError('Draft is not awaiting review', 409);
    await t('audit').insert({staff_id: staffId || null, action: 'ai_draft_approved', details: json({id, sku: draft.sku, published}), created_at: now()});
  });
  logCopy('ai_draft_approved', {id, sku: draft.sku, staffId: staffId || null, published});
  return present(await k('ai_drafts').where({id}).first());
}

export async function rejectCatalogueDraft(k, id, staffId) {
  await ensureTable(k);
  const draft = await k('ai_drafts').where({id}).first();
  if (!draft || draft.status !== 'pending') throw validationError('Draft is not awaiting review', 404);
  await k.transaction(async t => {
    await t('ai_drafts').where({id}).update({status: 'rejected', reviewed_at: now(), reviewed_by: staffId || null});
    await t('audit').insert({staff_id: staffId || null, action: 'ai_draft_rejected', details: json({id, sku: draft.sku, skill: draft.skill}), created_at: now()});
  });
  logCopy('ai_draft_rejected', {id, sku: draft.sku, staffId: staffId || null});
  return present(await k('ai_drafts').where({id}).first());
}
