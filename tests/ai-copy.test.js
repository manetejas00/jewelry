import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  unsupportedClaims,
  parseCopyJson,
  normaliseProposal,
  completeCopy,
  createCatalogueDraft,
  approveCatalogueDraft,
  rejectCatalogueDraft,
  listCatalogueDrafts
} from '../server/ai-copy.js';

function memoryDb() {
  const tables = {products: [], ai_drafts: [], audit: []};
  let nextId = 1;
  function query(name) {
    const state = {filters: [], sort: null, max: Infinity};
    const api = {
      where(filter) { state.filters.push(filter); return api; },
      orderBy(column, direction) { state.sort = {column, direction}; return api; },
      limit(max) { state.max = max; return api; },
      async first() { return rows()[0] || undefined; },
      async update(patch) {
        const matched = rows();
        for (const row of matched) Object.assign(row, patch);
        return matched.length;
      },
      async insert(row) {
        const stored = {...row};
        if (name !== 'audit') stored.id = nextId++;
        tables[name].push(stored);
        return [stored.id];
      },
      then(resolve, reject) { return Promise.resolve(rows()).then(resolve, reject); }
    };
    function rows() {
      let list = tables[name].filter(row => state.filters.every(filter => Object.entries(filter).every(([key, value]) => row[key] === value)));
      if (state.sort?.direction === 'desc') list = [...list].sort((a, b) => b[state.sort.column] - a[state.sort.column]);
      return list.slice(0, state.max);
    }
    return api;
  }
  const db = name => query(name);
  db.schema = {hasTable: async name => name in tables};
  db.transaction = async work => work(db);
  return db;
}

let k;

function model(content, status = 200) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({choices: [{message: {content}}]})
  });
}

function seedProduct() {
  k = memoryDb();
  return k('products').insert({
    sku: 'AI-RING',
    product_code: 'ai-ring',
    slug: 'ai-ring',
    name: 'Quiet gold ring',
    category: 'Rings',
    description: 'A polished gold band.',
    metal: 'Gold',
    purity: '18K',
    net_weight_g: 3.2,
    size: '12',
    finish: 'Polished',
    pricing_mode: 'FIXED',
    fixed_price: 24000,
    stock: 4,
    status: 'published',
    supplier: 'Preview atelier'
  });
}

test('catalogue copy is wired into the studio without a public route', () => {
  const server = fs.readFileSync('server/index.js', 'utf8');
  const studio = fs.readFileSync('src/main.jsx', 'utf8');
  assert.match(server, /\/api\/admin\/ai\/drafts/);
  assert.match(server, /auth\(\['owner','manager'\]\)/);
  assert.match(studio, /Catalogue copy/);
  assert.equal(server.includes('/api/ai/'), false);
});

test('claim check flags certification that is absent from the product', () => {
  assert.deepEqual(unsupportedClaims('A polished gold band.', 'GIA certified 1 carat ring'), ['certification', 'laboratory or BIS name', 'carat']);
  assert.deepEqual(unsupportedClaims('Hallmarked 18K gold band.', 'A hallmarked gold band'), []);
});

test('copy parser accepts fenced JSON and enforces description output', () => {
  const parsed = parseCopyJson('```json\n{"proposed_description":"A quiet band."}\n```');
  assert.equal(normaliseProposal('product-description-generator', parsed).proposed_description, 'A quiet band.');
  assert.throws(() => normaliseProposal('product-title-optimization', parsed), /product name/);
});

test('missing credentials fail before any network call', async () => {
  let called = false;
  await assert.rejects(
    () => completeCopy({env: {}, fetchImpl: () => { called = true; }, messages: []}),
    /AI_API_KEY/
  );
  assert.equal(called, false);
});

test('catalogue copy drafts publish only after approval', async () => {
  await seedProduct();
  await assert.rejects(
    () => createCatalogueDraft(k, {sku: 'AI-RING', skill: 'product-description-generator', staffId: 7, env: {AI_API_KEY: 'test'}, fetchImpl: model('not json')}),
    /unreadable response/
  );
  await assert.rejects(
    () => createCatalogueDraft(k, {sku: 'AI-RING', skill: 'product-description-generator', staffId: 7, env: {AI_API_KEY: 'test'}, fetchImpl: async () => ({ok: false, status: 429, json: async () => ({})})}),
    /rate limited/
  );
  const product = await k('products').where({sku: 'AI-RING'}).first();
  assert.equal(product.description, 'A polished gold band.');
  assert.equal(Number(product.fixed_price), 24000);
  const failed = await k('ai_drafts').where({status: 'failed'});
  assert.equal(failed.length, 2);

  const copy = JSON.stringify({
    proposed_name: null,
    proposed_description: 'An 18K gold band with a polished finish, sized for everyday wear.',
    seo_title: 'Quiet 18K gold ring',
    meta_description: 'An 18K gold band with a polished finish.',
    notes: 'Used the stored purity and finish.'
  });
  const draft = await createCatalogueDraft(k, {
    sku: 'AI-RING',
    skill: 'product-description-generator',
    tone: 'Luxury',
    staffId: 7,
    env: {AI_API_KEY: 'test'},
    fetchImpl: model(copy)
  });
  assert.equal(draft.status, 'pending');
  assert.equal((await k('products').where({sku: 'AI-RING'}).first()).description, 'A polished gold band.');

  await assert.rejects(
    () => createCatalogueDraft(k, {sku: 'AI-RING', skill: 'product-description-generator', staffId: 7, env: {AI_API_KEY: 'test'}, fetchImpl: model(copy)}),
    /pending draft already exists/
  );

  await approveCatalogueDraft(k, draft.id, {applyDescription: true, staffId: 7});
  const published = await k('products').where({sku: 'AI-RING'}).first();
  assert.equal(published.description, 'An 18K gold band with a polished finish, sized for everyday wear.');
  assert.equal(published.name, 'Quiet gold ring');
  assert.equal(Number(published.stock), 4);
  assert.equal(Number(published.fixed_price), 24000);
  assert.equal((await k('ai_drafts').where({id: draft.id}).first()).status, 'approved');

  const before = await k('products').where({sku: 'AI-RING'}).first();
  const seoDraft = await createCatalogueDraft(k, {
    sku: 'AI-RING',
    skill: 'product-page-seo',
    staffId: 7,
    env: {AI_API_KEY: 'test'},
    fetchImpl: model(JSON.stringify({
      proposed_description: 'A GIA certified diamond ring with VS1 clarity.',
      meta_description: 'GIA certified diamond ring.'
    }))
  });
  assert.ok(seoDraft.output.warnings.includes('certification'));
  await assert.rejects(() => approveCatalogueDraft(k, seoDraft.id, {applyDescription: true, staffId: 7}), /claim warnings/);
  assert.equal((await k('products').where({sku: 'AI-RING'}).first()).description, before.description);
  await approveCatalogueDraft(k, seoDraft.id, {applyDescription: true, acknowledgeWarnings: true, staffId: 7});
  assert.match((await k('products').where({sku: 'AI-RING'}).first()).description, /GIA certified/);

  const rejected = await createCatalogueDraft(k, {
    sku: 'AI-RING',
    skill: 'product-title-optimization',
    staffId: 7,
    env: {AI_API_KEY: 'test'},
    fetchImpl: model(JSON.stringify({proposed_name: 'Everyday gold ring'}))
  });
  await rejectCatalogueDraft(k, rejected.id, 7);
  assert.equal((await k('products').where({sku: 'AI-RING'}).first()).name, 'Quiet gold ring');
  const history = await listCatalogueDrafts(k, {sku: 'AI-RING'});
  assert.ok(history.some(row => row.status === 'rejected'));
});
