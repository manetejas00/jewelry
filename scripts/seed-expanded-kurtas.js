import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { db, now } from '../server/db.js';
import { KURTA_SIZES } from '../src/kurta-constants.js';
import { ALL_50_KURTA_STYLES } from './generate-50-kurtas-data.js';

const artifactDir = '/Users/tejasmane/.gemini/antigravity/brain/60b1e6c9-b137-491f-a4c5-3d0afb3f1d40';
const publicDir = path.resolve('public');

// Master raw images with high resolution
const rawMasters = {
  ivory_front: path.join(artifactDir, 'lucknowi_ivory_chikankari_cotton_kurta_front_1794634186187.jpg'),
  ivory_right: path.join(artifactDir, 'lucknowi_ivory_kurta_right_1794634249493.jpg'),
  ivory_left: path.join(artifactDir, 'lucknowi_ivory_kurta_left_1794634265198.jpg'),
  ivory_back: path.join(artifactDir, 'lucknowi_ivory_kurta_back_1794634279872.jpg'),
  ivory_model: path.join(artifactDir, 'lucknowi_ivory_kurta_model_1794634296846.jpg'),
  ivory_modal: path.join(artifactDir, 'lucknowi_ivory_kurta_modal_1794634316562.jpg'),

  blush_front: path.join(artifactDir, 'rose_blush_kurta_front_1794634259861.jpg'),
  blush_right: path.join(artifactDir, 'rose_blush_kurta_right_1794634277409.jpg'),
  blush_left: path.join(artifactDir, 'rose_blush_kurta_left_1794634294118.jpg'),
  blush_back: path.join(artifactDir, 'rose_blush_kurta_back_1794634311870.jpg'),

  sage_front: path.join(artifactDir, 'sage_green_kurta_front_1794634265852.jpg'),
  sage_right: path.join(artifactDir, 'sage_green_kurta_right_1794634284515.jpg'),
  sage_left: path.join(artifactDir, 'sage_green_kurta_left_1794634300890.jpg')
};

// 50 Unique Chicken Curry Kurta Styles with 5 Colours each (250 variants total)
export const KURTA_STYLES = ALL_50_KURTA_STYLES;

// Helper to produce WebP square buffer
async function makeWebp(source, { width = 1024, height = 1024, fit = 'cover', position = 'center', extract = null, modulate = null } = {}) {
  let pipeline = sharp(source);
  if (extract) pipeline = pipeline.extract(extract);
  if (modulate) pipeline = pipeline.modulate(modulate);
  return pipeline
    .resize(width, height, { fit, position, background: { r: 245, g: 243, b: 240, alpha: 1 } })
    .webp({ quality: 86 })
    .toBuffer();
}

async function makeThumb(buffer, { width = 600, height = 800 } = {}) {
  return sharp(buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function seedExpandedKurtas() {
  console.log(`--- Starting Expanded Chicken Curry Kurtas (${KURTA_STYLES.length} Styles, ${KURTA_STYLES.length * 5} Colours, ${KURTA_STYLES.length * 5 * 7} SKUs) ---`);

  const timestamp = now();

  // Read master files into buffers once
  const masters = {
    ivory_front: await fs.readFile(rawMasters.ivory_front),
    ivory_right: await fs.readFile(rawMasters.ivory_right),
    ivory_left: await fs.readFile(rawMasters.ivory_left),
    ivory_back: await fs.readFile(rawMasters.ivory_back),
    ivory_model: await fs.readFile(rawMasters.ivory_model),
    ivory_modal: await fs.readFile(rawMasters.ivory_modal),

    blush_front: await fs.readFile(rawMasters.blush_front),
    blush_right: await fs.readFile(rawMasters.blush_right),
    blush_left: await fs.readFile(rawMasters.blush_left),
    blush_back: await fs.readFile(rawMasters.blush_back),

    sage_front: await fs.readFile(rawMasters.sage_front),
    sage_right: await fs.readFile(rawMasters.sage_right),
    sage_left: await fs.readFile(rawMasters.sage_left)
  };

  // Pre-define 12 roles & specifications
  const getRoleConfigs = (baseKey, colorModulate) => {
    const frontSource = baseKey === 'blush' ? masters.blush_front : baseKey === 'sage' ? masters.sage_front : masters.ivory_front;
    const rightSource = baseKey === 'blush' ? masters.blush_right : baseKey === 'sage' ? masters.sage_right : masters.ivory_right;
    const leftSource = baseKey === 'blush' ? masters.blush_left : baseKey === 'sage' ? masters.sage_left : masters.ivory_left;
    const backSource = baseKey === 'blush' ? masters.blush_back : baseKey === 'sage' ? masters.sage_front : masters.ivory_back;
    const modelSource = baseKey === 'ivory' ? masters.ivory_model : baseKey === 'sage' ? masters.sage_left : masters.blush_front;
    const modalSource = baseKey === 'ivory' ? masters.ivory_modal : baseKey === 'blush' ? masters.blush_front : masters.sage_front;

    return {
      hero: { source: frontSource, opts: { position: 'center', modulate: colorModulate } },
      front: { source: frontSource, opts: { position: 'top', modulate: colorModulate } },
      model: { source: modelSource, opts: { extract: { left: 40, top: 20, width: 780, height: 1100 }, modulate: colorModulate } },
      back: { source: backSource, opts: { position: 'center', modulate: colorModulate } },
      left: { source: leftSource, opts: { position: 'center', modulate: colorModulate } },
      right: { source: rightSource, opts: { position: 'center', modulate: colorModulate } },
      detail: { source: frontSource, opts: { extract: { left: 240, top: 180, width: 440, height: 440 }, modulate: colorModulate } },
      modal: { source: modalSource, opts: { extract: { left: 180, top: 120, width: 560, height: 560 }, modulate: colorModulate } },
      neckline: { source: frontSource, opts: { extract: { left: 280, top: 90, width: 420, height: 420 }, modulate: colorModulate } },
      embroidery: { source: frontSource, opts: { extract: { left: 320, top: 260, width: 330, height: 330 }, modulate: colorModulate } },
      fabric: { source: frontSource, opts: { extract: { left: 200, top: 420, width: 310, height: 310 }, modulate: colorModulate } },
      sleeve: { source: frontSource, opts: { extract: { left: 90, top: 340, width: 360, height: 360 }, modulate: colorModulate } }
    };
  };

  const productRows = [];
  const imageRows = [];

  for (let sIdx = 0; sIdx < KURTA_STYLES.length; sIdx++) {
    const style = KURTA_STYLES[sIdx];
    const code = style.product_code;
    const styleDir = path.join(publicDir, 'assets/products', code);
    await fs.mkdir(styleDir, { recursive: true });

    // Process each color
    for (let cIdx = 0; cIdx < style.colors.length; cIdx++) {
      const col = style.colors[cIdx];
      const isDefaultColor = cIdx === 0;
      const targetDir = isDefaultColor ? styleDir : path.join(styleDir, col.code);
      await fs.mkdir(targetDir, { recursive: true });

      const roleConfigs = getRoleConfigs(style.baseMaster, col.modulate);
      const roles = Object.keys(roleConfigs);

      const colorHeroUrl = isDefaultColor
        ? `/assets/products/${code}/hero.webp`
        : `/assets/products/${code}/${col.code}/hero.webp`;

      for (let rIdx = 0; rIdx < roles.length; rIdx++) {
        const role = roles[rIdx];
        const cfg = roleConfigs[role];
        const imgPath = path.join(targetDir, `${role}.webp`);
        const thumbPath = path.join(targetDir, `${role}-thumb.webp`);

        // Generate images only if missing
        try {
          await fs.access(imgPath);
          await fs.access(thumbPath);
        } catch {
          const webpBuf = await makeWebp(cfg.source, cfg.opts);
          const thumbBuf = await makeThumb(webpBuf);
          await fs.writeFile(imgPath, webpBuf);
          await fs.writeFile(thumbPath, thumbBuf);
        }

        const imgUrl = isDefaultColor
          ? `/assets/products/${code}/${role}.webp`
          : `/assets/products/${code}/${col.code}/${role}.webp`;

        imageRows.push({
          product_code: code,
          sku: null,
          role,
          url: imgUrl,
          alt_text: `${style.name} in ${col.name} - ${role} view, authentic Lucknowi Chikankari`,
          sort_order: isDefaultColor ? (rIdx + 1) : (100 + cIdx * 20 + rIdx + 1),
          color: col.name,
          created_at: timestamp,
          updated_at: timestamp
        });
      }

      // 7 Sizes per colour variant
      const skuColorCode = col.code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'CLR';
      const skuPrefix = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);

      for (const sizeInfo of KURTA_SIZES) {
        let variantSku;
        let variantSlug;
        let variantName;

        if (code === 'lucknowi-ivory-chikankari-cotton-kurta') {
          if (isDefaultColor) {
            variantSku = `CCK-IVORY-${sizeInfo.code}`;
            variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            variantName = 'Noor-e-Awadh Ivory Chikankari Mulmul Kurta';
          } else {
            variantSku = `CCK-IVORY-${skuColorCode}-${sizeInfo.code}`;
            variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            variantName = `Noor-e-Awadh Kurta - ${col.name}`;
          }
        } else if (code === 'rose-blush-georgette-chikankari-kurta') {
          if (isDefaultColor) {
            variantSku = `CCK-BLUSH-${sizeInfo.code}`;
            variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            variantName = 'Gulzar Rose Blush Georgette Chikankari Kurta';
          } else {
            variantSku = `CCK-BLUSH-${skuColorCode}-${sizeInfo.code}`;
            variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            variantName = `Gulzar Georgette Kurta - ${col.name}`;
          }
        } else if (code === 'sage-green-chanderi-chikankari-kurta') {
          if (isDefaultColor) {
            variantSku = `CCK-SAGE-${sizeInfo.code}`;
            variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            variantName = 'Nazm Sage Green Chanderi Silk Kurta';
          } else {
            variantSku = `CCK-SAGE-${skuColorCode}-${sizeInfo.code}`;
            variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            variantName = `Nazm Chanderi Kurta - ${col.name}`;
          }
        } else if (code === 'sky-blue-mulmul-chikankari-kurta') {
          if (isDefaultColor) {
            variantSku = `CCK-SKY-${sizeInfo.code}`;
            variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            variantName = 'Mehtab Sky Blue Mulmul Kurta';
          } else {
            variantSku = `CCK-SKY-${skuColorCode}-${sizeInfo.code}`;
            variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            variantName = `Mehtab Mulmul Kurta - ${col.name}`;
          }
        } else {
          if (isDefaultColor) {
            variantSku = `CCK-${skuPrefix}-${sizeInfo.code}`;
            variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            variantName = style.name;
          } else {
            variantSku = `CCK-${skuPrefix}-${skuColorCode}-${sizeInfo.code}`;
            variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            variantName = `${style.name} - ${col.name}`;
          }
        }

        const baseStock = 8 + ((sIdx * 3 + cIdx * 7 + sizeInfo.code.charCodeAt(0)) % 14);

        productRows.push({
          supplier: 'Lucknow Heritage Maison',
          product_code: code,
          sku: variantSku,
          slug: variantSlug,
          name: variantName,
          category: 'Chicken Curry Kurtas',
          is_kurta: 1,
          description: style.description,
          metal: style.fabric,
          purity: style.craftsmanship,
          net_weight_g: null,
          size: sizeInfo.label,
          finish: 'Hand Embroidered',
          color: col.name,
          color_code: col.code,
          hex_color: col.hex,
          image: colorHeroUrl,
          pricing_mode: 'FIXED',
          fixed_price: String(Number(style.price).toFixed(2)),
          making_flat: '0.00',
          making_percent: '0.0000',
          stone_charge: '0.00',
          other_charge: '0.00',
          stock: baseStock,
          status: 'published',
          source_timestamp: timestamp,
          updated_at: timestamp,
          seo_title: `${variantName} | Lucknowi Chikankari | Veyora`,
          meta_description: `Handcrafted ${variantName}. Authentic Lucknowi Chikankari embroidery in ${style.fabric}. Complimentary shipping across India.`
        });
      }
    }
  }

  console.log(`Generated ${productRows.length} Kurta SKU variants across ${KURTA_STYLES.length} styles!`);
  console.log(`Generated ${imageRows.length} Kurta gallery image records across 12 angles!`);

  // Database transaction: Replace existing kurta products and images cleanly
  await db.transaction(async (trx) => {
    // 1. Delete existing kurta images
    const existingKurtaCodes = KURTA_STYLES.map(s => s.product_code);
    await trx('product_images').whereIn('product_code', existingKurtaCodes).del();

    // 2. Insert all product_images in batches
    const batchSize = 100;
    for (let i = 0; i < imageRows.length; i += batchSize) {
      await trx('product_images').insert(imageRows.slice(i, i + batchSize));
    }

    // 3. Delete existing kurta products
    await trx('products').where({ is_kurta: 1 }).del();

    // 4. Insert all kurta variants in batches
    for (let i = 0; i < productRows.length; i += batchSize) {
      await trx('products').insert(productRows.slice(i, i + batchSize));
    }

    // 5. Insert supplier SKUs
    for (let i = 0; i < productRows.length; i += batchSize) {
      const slice = productRows.slice(i, i + batchSize).map(r => ({
        supplier: r.supplier,
        supplier_sku: r.sku,
        sku: r.sku
      }));
      await trx('supplier_skus')
        .insert(slice)
        .onConflict(['supplier', 'supplier_sku'])
        .ignore();
    }
  });

  console.log(`✓ Successfully seeded ${KURTA_STYLES.length} Kurta styles with ${KURTA_STYLES.length * 5} colour variants and ${productRows.length} SKUs into database!`);
}

// Direct execution
if (process.argv[1]?.endsWith('seed-expanded-kurtas.js')) {
  try {
    await seedExpandedKurtas();
    process.exit(0);
  } catch (err) {
    console.error('Seeder failed:', err);
    process.exit(1);
  }
}
