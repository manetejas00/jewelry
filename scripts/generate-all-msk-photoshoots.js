import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { db, now } from '../server/db.js';
import { MSK_KURTA_STYLES } from './msk-kurtas-data.js';

const masterDir = '/Users/tejasmane/.gemini/antigravity/brain/60b1e6c9-b137-491f-a4c5-3d0afb3f1d40';
const scratchPagesDir = '/Users/tejasmane/.gemini/antigravity/brain/eb05e5f1-166f-4663-939f-533c70a9ae3b/scratch/pages';
const publicDir = path.resolve('public/assets/products');

// Master photoshoot files
const rawMasters = {
  ivory_front: path.join(masterDir, 'lucknowi_ivory_chikankari_cotton_kurta_front_1794634186187.jpg'),
  ivory_right: path.join(masterDir, 'lucknowi_ivory_kurta_right_1794634249493.jpg'),
  ivory_left: path.join(masterDir, 'lucknowi_ivory_kurta_left_1794634265198.jpg'),
  ivory_back: path.join(masterDir, 'lucknowi_ivory_kurta_back_1794634279872.jpg'),
  ivory_model: path.join(masterDir, 'lucknowi_ivory_kurta_model_1794634296846.jpg'),
  ivory_modal: path.join(masterDir, 'lucknowi_ivory_kurta_modal_1794634316562.jpg'),

  blush_front: path.join(masterDir, 'rose_blush_kurta_front_1794634259861.jpg'),
  blush_right: path.join(masterDir, 'rose_blush_kurta_right_1794634277409.jpg'),
  blush_left: path.join(masterDir, 'rose_blush_kurta_left_1794634294118.jpg'),
  blush_back: path.join(masterDir, 'rose_blush_kurta_back_1794634311870.jpg'),

  sage_front: path.join(masterDir, 'sage_green_kurta_front_1794634265852.jpg'),
  sage_right: path.join(masterDir, 'sage_green_kurta_right_1794634284515.jpg'),
  sage_left: path.join(masterDir, 'sage_green_kurta_left_1794634300890.jpg')
};

// Map each of the 30 MSK styles to master and calibrated color modulation
const STYLE_PHOTOSHOOT_CONFIGS = {
  1:  { base: 'ivory', mod: { hue: 270, saturation: 1.15, brightness: 1.02 } }, // Noor Lilac Mulmul Anarkali
  2:  { base: 'blush', mod: { hue: 355, saturation: 1.40, brightness: 0.90 } }, // Gulabi Crimson Rayon Set
  3:  { base: 'blush', mod: { hue: 340, saturation: 1.18, brightness: 1.04 } }, // Nazm Orchid Pink Muslin Kurti
  4:  { base: 'sage',  mod: { hue: 195, saturation: 1.30, brightness: 0.90 } }, // Firoza Peacock Blue Rayon Set
  5:  { base: 'ivory', mod: { hue: 35,  saturation: 0.85, brightness: 1.04 } }, // Aafreen Ivory Viscose Set
  6:  { base: 'blush', mod: { hue: 325, saturation: 1.40, brightness: 0.80 } }, // Rukhsaar Wine Saree / Set
  7:  { base: 'blush', mod: { hue: 358, saturation: 1.45, brightness: 0.92 } }, // Laila Scarlet Rayon Kurti
  8:  { base: 'sage',  mod: { hue: 105, saturation: 0.95, brightness: 1.00 } }, // Bahaar Sage Rayon Kurti
  9:  { base: 'ivory', mod: { hue: 0,   saturation: 0.08, brightness: 0.55 } }, // Shab Midnight Black Modal Set
  10: { base: 'ivory', mod: { hue: 0,   saturation: 0.80, brightness: 1.06 } }, // Noor-e-Jahan White Georgette
  11: { base: 'sage',  mod: { hue: 75,  saturation: 1.25, brightness: 1.05 } }, // Zeenat Chartreuse Lime Kurti
  12: { base: 'sage',  mod: { hue: 175, saturation: 1.25, brightness: 0.88 } }, // Gulzar Teal Printed Kurti
  13: { base: 'blush', mod: { hue: 18,  saturation: 1.30, brightness: 0.92 } }, // Sitara Rust Terracotta Kurti
  14: { base: 'sage',  mod: { hue: 120, saturation: 1.25, brightness: 0.95 } }, // Ananya Botanical Green Set
  15: { base: 'ivory', mod: { hue: 48,  saturation: 1.35, brightness: 1.06 } }, // Mehr Buttercup Yellow Kurti
  16: { base: 'blush', mod: { hue: 315, saturation: 1.35, brightness: 0.86 } }, // Rania Berry Magenta Set
  17: { base: 'blush', mod: { hue: 20,  saturation: 1.20, brightness: 1.04 } }, // Roohi Coral Peach Set
  18: { base: 'sage',  mod: { hue: 85,  saturation: 1.20, brightness: 0.85 } }, // Mumtaz Shahi Olive Set
  19: { base: 'ivory', mod: { hue: 205, saturation: 1.20, brightness: 1.02 } }, // Dariya Sky Blue Kurti
  20: { base: 'ivory', mod: { hue: 235, saturation: 1.15, brightness: 1.02 } }, // Gul-e-Kashmir Periwinkle
  21: { base: 'ivory', mod: { hue: 0,   saturation: 0.85, brightness: 1.05 } }, // Noor-e-Awadh Pure White
  22: { base: 'blush', mod: { hue: 355, saturation: 1.45, brightness: 0.90 } }, // Zohra Scarlet Rayon Set
  23: { base: 'ivory', mod: { hue: 38,  saturation: 0.85, brightness: 1.04 } }, // Sunehri White Cotton Pants
  24: { base: 'ivory', mod: { hue: 42,  saturation: 1.40, brightness: 0.98 } }, // Meher Ochre Mulmul Gown
  25: { base: 'ivory', mod: { hue: 195, saturation: 1.20, brightness: 1.04 } }, // Aira Sky Blue Crepe Kurti
  26: { base: 'ivory', mod: { hue: 0,   saturation: 0.08, brightness: 0.52 } }, // Tarana Midnight Black Set
  27: { base: 'ivory', mod: { hue: 40,  saturation: 0.80, brightness: 1.05 } }, // Afreen White Mul Dobby
  28: { base: 'ivory', mod: { hue: 0,   saturation: 0.06, brightness: 0.50 } }, // Kaiserbagh Black Modal Anarkali
  29: { base: 'blush', mod: { hue: 330, saturation: 1.45, brightness: 0.78 } }, // Shehnai Maroon Chanderi Set
  30: { base: 'sage',  mod: { hue: 52,  saturation: 1.35, brightness: 1.05 } }  // Basant Sunshine Yellow Set
};

async function generateAllPhotoshoots() {
  console.log('--- Generating Website-Matched Photoshoots for 30 MSK Kurtas ---');

  // Load master buffers
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

  const timestamp = now();
  const allProductImages = [];
  const allKurtaImages = [];

  for (let idx = 0; idx < MSK_KURTA_STYLES.length; idx++) {
    const style = MSK_KURTA_STYLES[idx];
    const pageNum = style.page;
    const code = style.product_code;
    const cfg = STYLE_PHOTOSHOOT_CONFIGS[pageNum] || { base: 'ivory', mod: { hue: 0, saturation: 1.0, brightness: 1.0 } };
    const baseKey = cfg.base;
    const colorModulate = cfg.mod;

    const outDir = path.join(publicDir, code);
    await fs.mkdir(outDir, { recursive: true });

    // Select master sources according to baseKey
    const frontSource = baseKey === 'blush' ? masters.blush_front : baseKey === 'sage' ? masters.sage_front : masters.ivory_front;
    const rightSource = baseKey === 'blush' ? masters.blush_right : baseKey === 'sage' ? masters.sage_right : masters.ivory_right;
    const leftSource = baseKey === 'blush' ? masters.blush_left : baseKey === 'sage' ? masters.sage_left : masters.ivory_left;
    const backSource = baseKey === 'blush' ? masters.blush_back : baseKey === 'sage' ? masters.sage_front : masters.ivory_back;
    const modelSource = masters.ivory_model;
    const modalSource = masters.ivory_modal;

    // Load authentic catalog page for Chikankari macro crops
    const pageFile = path.join(scratchPagesDir, `page_${pageNum}.jpg`);
    let pageBuf = null;
    try {
      pageBuf = await fs.readFile(pageFile);
    } catch {}

    // 1. Hero Shot: 4:5 Full-length Editorial Catalog View (800x1000)
    const heroBuf = await sharp(frontSource)
      .modulate(colorModulate)
      .resize(800, 1000, { fit: 'cover', position: 'center', background: { r: 248, g: 246, b: 240, alpha: 1 } })
      .webp({ quality: 92 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'hero.webp'), heroBuf);

    // Hero Thumbnail (600x750)
    const heroThumbBuf = await sharp(heroBuf)
      .resize(600, 750, { fit: 'cover' })
      .webp({ quality: 84 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'hero-thumb.webp'), heroThumbBuf);

    // 2. Front Shot: 4:5 Front Silhouette View (800x1000)
    const frontBuf = await sharp(frontSource)
      .modulate(colorModulate)
      .resize(800, 1000, { fit: 'cover', position: 'top', background: { r: 248, g: 246, b: 240, alpha: 1 } })
      .webp({ quality: 90 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'front.webp'), frontBuf);

    // Front Thumbnail (600x750)
    const frontThumbBuf = await sharp(frontBuf)
      .resize(600, 750, { fit: 'cover' })
      .webp({ quality: 84 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'front-thumb.webp'), frontThumbBuf);

    // 3. Model Shot: Architectural Lookbook Photoshoot (800x1000)
    const modelBuf = await sharp(modelSource)
      .modulate(colorModulate)
      .extract({ left: 40, top: 20, width: 780, height: 1100 })
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'model.webp'), modelBuf);

    // 4. Back View: 4:5 Draped Embroidery Back View (800x1000)
    const backBuf = await sharp(backSource)
      .modulate(colorModulate)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'back.webp'), backBuf);

    // 5. Left Profile (800x1000)
    const leftBuf = await sharp(leftSource)
      .modulate(colorModulate)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'left.webp'), leftBuf);

    // 6. Right Profile (800x1000)
    const rightBuf = await sharp(rightSource)
      .modulate(colorModulate)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'right.webp'), rightBuf);

    // 7. Detail: Handcrafted Chikankari Embroidery Macro (800x800)
    let detailBuf;
    if (pageBuf) {
      // Extract authentic bodice embroidery from catalog page (y: 20% to 55%, x: 20% to 80%)
      const meta = await sharp(pageBuf).metadata();
      const pw = meta.width, ph = meta.height;
      const left = Math.round(pw * 0.20);
      const top = Math.round(ph * 0.18);
      const width = Math.round(pw * 0.60);
      const height = Math.round(ph * 0.35);
      detailBuf = await sharp(pageBuf)
        .extract({ left, top, width, height })
        .resize(800, 800, { fit: 'cover' })
        .sharpen()
        .webp({ quality: 88 })
        .toBuffer();
    } else {
      detailBuf = await sharp(frontSource)
        .modulate(colorModulate)
        .extract({ left: 240, top: 180, width: 440, height: 440 })
        .resize(800, 800, { fit: 'cover' })
        .webp({ quality: 88 })
        .toBuffer();
    }
    await fs.writeFile(path.join(outDir, 'detail.webp'), detailBuf);

    // 8. Neckline: Artisan Neckline & Placket Workmanship (800x800)
    let neckBuf;
    if (pageBuf) {
      const meta = await sharp(pageBuf).metadata();
      const pw = meta.width, ph = meta.height;
      const left = Math.round(pw * 0.25);
      const top = Math.round(ph * 0.10);
      const width = Math.round(pw * 0.50);
      const height = Math.round(ph * 0.30);
      neckBuf = await sharp(pageBuf)
        .extract({ left, top, width, height })
        .resize(800, 800, { fit: 'cover' })
        .sharpen()
        .webp({ quality: 88 })
        .toBuffer();
    } else {
      neckBuf = await sharp(frontSource)
        .modulate(colorModulate)
        .extract({ left: 280, top: 90, width: 420, height: 420 })
        .resize(800, 800, { fit: 'cover' })
        .webp({ quality: 88 })
        .toBuffer();
    }
    await fs.writeFile(path.join(outDir, 'neckline.webp'), neckBuf);

    // 9. Hem: Border & Palazzo Lace Detail (800x800)
    let hemBuf;
    if (pageBuf) {
      const meta = await sharp(pageBuf).metadata();
      const pw = meta.width, ph = meta.height;
      const left = Math.round(pw * 0.20);
      const top = Math.round(ph * 0.62);
      const width = Math.round(pw * 0.60);
      const height = Math.round(ph * 0.32);
      hemBuf = await sharp(pageBuf)
        .extract({ left, top, width, height })
        .resize(800, 800, { fit: 'cover' })
        .sharpen()
        .webp({ quality: 88 })
        .toBuffer();
    } else {
      hemBuf = await sharp(frontSource)
        .modulate(colorModulate)
        .extract({ left: 200, top: 550, width: 480, height: 480 })
        .resize(800, 800, { fit: 'cover' })
        .webp({ quality: 88 })
        .toBuffer();
    }
    await fs.writeFile(path.join(outDir, 'hem.webp'), hemBuf);

    // 10. Modal: High-Resolution Zoom & Drape (800x800)
    const modalBuf = await sharp(modalSource)
      .modulate(colorModulate)
      .extract({ left: 180, top: 120, width: 560, height: 560 })
      .resize(800, 800, { fit: 'cover' })
      .webp({ quality: 88 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'modal.webp'), modalBuf);

    // 11. Embroidery: Tonal Bakhiya & Shadow Work (800x800)
    const embroideryBuf = await sharp(frontSource)
      .modulate(colorModulate)
      .extract({ left: 320, top: 260, width: 330, height: 330 })
      .resize(800, 800, { fit: 'cover' })
      .webp({ quality: 88 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'embroidery.webp'), embroideryBuf);

    // 12. Fabric: Natural Weave & Texture (800x800)
    const fabricBuf = await sharp(frontSource)
      .modulate(colorModulate)
      .extract({ left: 200, top: 420, width: 310, height: 310 })
      .resize(800, 800, { fit: 'cover' })
      .webp({ quality: 88 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'fabric.webp'), fabricBuf);

    // 13. Sleeve: Intricate Sleeve Border (800x800)
    const sleeveBuf = await sharp(frontSource)
      .modulate(colorModulate)
      .extract({ left: 90, top: 340, width: 360, height: 360 })
      .resize(800, 800, { fit: 'cover' })
      .webp({ quality: 88 })
      .toBuffer();
    await fs.writeFile(path.join(outDir, 'sleeve.webp'), sleeveBuf);

    // Register all roles for database synchronization
    const angleRoles = [
      { role: 'hero', file: 'hero.webp', label: 'Full Length Editorial Lookbook View', order: 1 },
      { role: 'front', file: 'front.webp', label: 'Front Silhouette View', order: 2 },
      { role: 'model', file: 'model.webp', label: 'On-Model Wearing View', order: 3 },
      { role: 'detail', file: 'detail.webp', label: 'Handcrafted Chikankari Embroidery Macro Detail', order: 4 },
      { role: 'neckline', file: 'neckline.webp', label: 'Artisan Neckline and Placket Workmanship', order: 5 },
      { role: 'hem', file: 'hem.webp', label: 'Embroidered Border and Palazzo Lace Detail', order: 6 },
      { role: 'back', file: 'back.webp', label: 'Back View & Draped Embroidery', order: 7 },
      { role: 'left', file: 'left.webp', label: 'Left Silhouette Profile', order: 8 },
      { role: 'right', file: 'right.webp', label: 'Right Silhouette Profile', order: 9 },
      { role: 'modal', file: 'modal.webp', label: 'High-Resolution Zoom & Drape', order: 10 },
      { role: 'embroidery', file: 'embroidery.webp', label: 'Tonal Bakhiya & Shadow Work', order: 11 },
      { role: 'fabric', file: 'fabric.webp', label: 'Natural Weave & Texture', order: 12 },
      { role: 'sleeve', file: 'sleeve.webp', label: 'Intricate Sleeve Border', order: 13 }
    ];

    // Find kurta record in kurtas table
    const kurtaRec = await db('kurtas').where({ product_code: code }).first();
    const kurtaId = kurtaRec ? kurtaRec.id : null;

    for (const angle of angleRoles) {
      const url = `/assets/products/${code}/${angle.file}`;
      const alt = `${style.name} - ${angle.label}`;

      allProductImages.push({
        product_code: code,
        sku: null,
        role: angle.role,
        url,
        alt_text: alt,
        sort_order: angle.order,
        color: style.colors[0]?.name || 'Default',
        created_at: timestamp,
        updated_at: timestamp
      });

      if (kurtaId) {
        allKurtaImages.push({
          kurta_id: kurtaId,
          product_code: code,
          sku: null,
          role: angle.role,
          url,
          alt_text: alt,
          sort_order: angle.order,
          color: style.colors[0]?.name || 'Default',
          created_at: timestamp,
          updated_at: timestamp
        });
      }
    }

    console.log(`[${pageNum.toString().padStart(2, '0')}/30] Generated 14 photoshoot webp assets for ${code}`);
  }

  // Synchronize database image tables
  await db.transaction(async (trx) => {
    // 1. Clear old kurta records from product_images
    await trx('product_images').where('product_code', 'like', 'msk-%').del();

    // 2. Batch insert product_images
    const batchSize = 100;
    for (let i = 0; i < allProductImages.length; i += batchSize) {
      await trx('product_images').insert(allProductImages.slice(i, i + batchSize));
    }

    // 3. Clear old MSK records from kurta_images
    if (await trx.schema.hasTable('kurta_images')) {
      await trx('kurta_images').where('product_code', 'like', 'msk-%').del();
      for (let i = 0; i < allKurtaImages.length; i += batchSize) {
        await trx('kurta_images').insert(allKurtaImages.slice(i, i + batchSize));
      }
    }
  });

  console.log(`✓ Successfully created photoshoot image collections across all 30 MSK kurtas!`);
  console.log(`✓ Inserted ${allProductImages.length} gallery image records into product_images and kurta_images.`);
  process.exit(0);
}

generateAllPhotoshoots().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
