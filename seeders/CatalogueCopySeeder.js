import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {db, now} from '../server/db.js';
import {productFacts} from '../server/ai-copy.js';

const marker = 'Preview catalogue copy seed';

const plans = [
  {
    sku: 'VEY-LP-01',
    skill: 'product-description-generator',
    tone: 'Luxury',
    output(product) {
      const material = [product.purity, product.metal, product.finish].filter(Boolean).join(' ');
      return {
        proposed_name: null,
        proposed_description: `${product.name} is a ${product.category || 'jewellery'} preview${material ? ` in ${material}` : ''}. The stored catalogue fields are the only product facts used here.`,
        seo_title: null,
        meta_description: null,
        notes: `${marker}. The live description stays as it is until this draft is approved.`,
        warnings: []
      };
    }
  },
  {
    sku: 'VEY-ER-12',
    skill: 'product-title-optimization',
    tone: 'Professional',
    output(product) {
      const material = [product.purity, product.metal].filter(Boolean).join(' ');
      return {
        proposed_name: material ? `${product.name}, ${material}` : product.name,
        proposed_description: null,
        seo_title: null,
        meta_description: null,
        notes: `${marker}. The live name stays as it is until this draft is approved.`,
        warnings: []
      };
    }
  },
  {
    sku: 'VEY-AC-01',
    skill: 'product-page-seo',
    tone: 'Friendly',
    output(product) {
      const material = [product.purity, product.metal].filter(Boolean).join(' ');
      return {
        proposed_name: null,
        proposed_description: null,
        seo_title: `${product.name} | Veyora Jewels`,
        meta_description: `${product.name}${material ? `, ${material}` : ''}. Preview catalogue page for Veyora Jewels.`,
        notes: `${marker}. Publish search text to set the page title and Google snippet. The on-page description stays as it is.`,
        warnings: []
      };
    }
  }
];

export async function CatalogueCopySeeder(k = db) {
  if (!await k.schema.hasTable('ai_drafts')) throw Error('Run npm run migrate before CatalogueCopySeeder.');
  if (!await k.schema.hasTable('products')) throw Error('Products are required before CatalogueCopySeeder.');
  const stamp = now();
  const inserted = [];
  const skipped = [];
  for (const plan of plans) {
    const product = await k('products').where({sku: plan.sku}).first();
    if (!product) {
      skipped.push({sku: plan.sku, skill: plan.skill, reason: 'product not found'});
      continue;
    }
    const prior = await k('ai_drafts').where({sku: plan.sku, skill: plan.skill}).select('id', 'output_json');
    if (prior.some(row => String(row.output_json || '').includes(marker))) {
      skipped.push({sku: plan.sku, skill: plan.skill, reason: 'already seeded'});
      continue;
    }
    const facts = productFacts(product);
    const [id] = await k('ai_drafts').insert({
      skill: plan.skill,
      sku: product.sku,
      status: 'pending',
      tone: plan.tone,
      input_json: JSON.stringify(facts),
      output_json: JSON.stringify(plan.output(product)),
      error: null,
      published_fields: null,
      staff_id: null,
      reviewed_by: null,
      created_at: stamp,
      reviewed_at: null
    });
    inserted.push({id, sku: product.sku, skill: plan.skill});
  }
  return {inserted, skipped, message: `Seeded ${inserted.length} catalogue copy drafts. Live product text was not changed.`};
}

export default CatalogueCopySeeder;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await CatalogueCopySeeder(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
