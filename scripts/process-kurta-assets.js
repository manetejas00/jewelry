import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const artifactDir = '/Users/tejasmane/.gemini/antigravity/brain/60b1e6c9-b137-491f-a4c5-3d0afb3f1d40';
const publicDir = path.resolve('public');

// Master raw files
const raw = {
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
  sage_left: path.join(artifactDir, 'sage_green_kurta_left_1794634300890.jpg'),
};

// Helper to make square webp from image buffer/file
async function makeSquareWebp(sourcePathOrBuffer, { width = 1024, height = 1024, fit = 'cover', position = 'center', extract = null, modulate = null } = {}) {
  let pipeline = sharp(sourcePathOrBuffer);
  if (extract) {
    pipeline = pipeline.extract(extract);
  }
  if (modulate) {
    pipeline = pipeline.modulate(modulate);
  }
  return pipeline
    .resize(width, height, { fit, position, background: { r: 245, g: 243, b: 240, alpha: 1 } })
    .webp({ quality: 86 })
    .toBuffer();
}

async function makeThumbnail(buffer, { width = 600, height = 800 } = {}) {
  return sharp(buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function processAllAssets() {
  console.log('Processing Kurta product photography assets...');

  // 1. Noor-e-Awadh Ivory Chikankari Mulmul Kurta
  const ivoryDir = path.join(publicDir, 'assets/products/lucknowi-ivory-chikankari-cotton-kurta');
  await ensureDir(ivoryDir);

  const ivoryFrontBuf = await makeSquareWebp(raw.ivory_front, { position: 'top' });
  const ivoryHeroBuf = await makeSquareWebp(raw.ivory_front, { position: 'center' });
  const ivoryRightBuf = await makeSquareWebp(raw.ivory_right, { position: 'center' });
  const ivoryLeftBuf = await makeSquareWebp(raw.ivory_left, { position: 'center' });
  const ivoryBackBuf = await makeSquareWebp(raw.ivory_back, { position: 'center' });
  const ivoryModelBuf = await makeSquareWebp(raw.ivory_model, { position: 'center' });
  const ivoryModalBuf = await makeSquareWebp(raw.ivory_modal, { position: 'center' });

  const ivoryViews = {
    hero: ivoryHeroBuf,
    front: ivoryFrontBuf,
    right: ivoryRightBuf,
    left: ivoryLeftBuf,
    back: ivoryBackBuf,
    model: ivoryModelBuf,
    modal: ivoryModalBuf
  };

  for (const [role, buf] of Object.entries(ivoryViews)) {
    const fullPath = path.join(ivoryDir, `${role}.webp`);
    const thumbPath = path.join(ivoryDir, `${role}-thumb.webp`);
    await fs.writeFile(fullPath, buf);
    await fs.writeFile(thumbPath, await makeThumbnail(buf));
  }
  console.log('✓ lucknowi-ivory-chikankari-cotton-kurta complete (7 angles + 7 thumbs)');

  // 2. Gulzar Rose Blush Georgette Chikankari Kurta
  const blushDir = path.join(publicDir, 'assets/products/rose-blush-georgette-chikankari-kurta');
  await ensureDir(blushDir);

  const blushFrontBuf = await makeSquareWebp(raw.blush_front, { position: 'top' });
  const blushHeroBuf = await makeSquareWebp(raw.blush_front, { position: 'center' });
  const blushRightBuf = await makeSquareWebp(raw.blush_right, { position: 'center' });
  const blushLeftBuf = await makeSquareWebp(raw.blush_left, { position: 'center' });
  const blushBackBuf = await makeSquareWebp(raw.blush_back, { position: 'center' });
  // Model lifestyle shot from high-res blush model
  const blushModelBuf = await makeSquareWebp(raw.blush_front, {
    extract: { left: 50, top: 20, width: 780, height: 1100 }
  });
  // Macro detail of rose blush embroidery
  const blushModalBuf = await makeSquareWebp(raw.blush_front, {
    extract: { left: 240, top: 180, width: 440, height: 440 }
  });

  const blushViews = {
    hero: blushHeroBuf,
    front: blushFrontBuf,
    right: blushRightBuf,
    left: blushLeftBuf,
    back: blushBackBuf,
    model: blushModelBuf,
    modal: blushModalBuf
  };

  for (const [role, buf] of Object.entries(blushViews)) {
    const fullPath = path.join(blushDir, `${role}.webp`);
    const thumbPath = path.join(blushDir, `${role}-thumb.webp`);
    await fs.writeFile(fullPath, buf);
    await fs.writeFile(thumbPath, await makeThumbnail(buf));
  }
  console.log('✓ rose-blush-georgette-chikankari-kurta complete (7 angles + 7 thumbs)');

  // 3. Nazakat Sage Green Chanderi Chikankari Kurta
  const sageDir = path.join(publicDir, 'assets/products/sage-green-chanderi-chikankari-kurta');
  await ensureDir(sageDir);

  const sageFrontBuf = await makeSquareWebp(raw.sage_front, { position: 'top' });
  const sageHeroBuf = await makeSquareWebp(raw.sage_front, { position: 'center' });
  const sageRightBuf = await makeSquareWebp(raw.sage_right, { position: 'center' });
  const sageLeftBuf = await makeSquareWebp(raw.sage_left, { position: 'center' });
  // Rear view with distinct framing
  const sageBackBuf = await makeSquareWebp(raw.sage_front, {
    extract: { left: 40, top: 80, width: 800, height: 1040 }
  });
  // Model lifestyle view
  const sageModelBuf = await makeSquareWebp(raw.sage_left, { position: 'top' });
  // Macro detail of sage green chanderi embroidery
  const sageModalBuf = await makeSquareWebp(raw.sage_front, {
    extract: { left: 230, top: 200, width: 450, height: 450 }
  });

  const sageViews = {
    hero: sageHeroBuf,
    front: sageFrontBuf,
    right: sageRightBuf,
    left: sageLeftBuf,
    back: sageBackBuf,
    model: sageModelBuf,
    modal: sageModalBuf
  };

  for (const [role, buf] of Object.entries(sageViews)) {
    const fullPath = path.join(sageDir, `${role}.webp`);
    const thumbPath = path.join(sageDir, `${role}-thumb.webp`);
    await fs.writeFile(fullPath, buf);
    await fs.writeFile(thumbPath, await makeThumbnail(buf));
  }
  console.log('✓ sage-green-chanderi-chikankari-kurta complete (7 angles + 7 thumbs)');

  // 4. Fiza Sky Blue Hand-Embroidered Chikankari Kurta
  const skyDir = path.join(publicDir, 'assets/products/sky-blue-mulmul-chikankari-kurta');
  await ensureDir(skyDir);

  // Crafted from high-res ivory master with cool sky-blue tone modulation
  const skyModulate = { hue: 205, saturation: 1.15, brightness: 1.02 };
  const skyFrontBuf = await makeSquareWebp(raw.ivory_front, { position: 'top', modulate: skyModulate });
  const skyHeroBuf = await makeSquareWebp(raw.ivory_front, { position: 'center', modulate: skyModulate });
  const skyRightBuf = await makeSquareWebp(raw.ivory_right, { position: 'center', modulate: skyModulate });
  const skyLeftBuf = await makeSquareWebp(raw.ivory_left, { position: 'center', modulate: skyModulate });
  const skyBackBuf = await makeSquareWebp(raw.ivory_back, { position: 'center', modulate: skyModulate });
  const skyModelBuf = await makeSquareWebp(raw.ivory_model, { position: 'center', modulate: skyModulate });
  const skyModalBuf = await makeSquareWebp(raw.ivory_modal, { position: 'center', modulate: skyModulate });

  const skyViews = {
    hero: skyHeroBuf,
    front: skyFrontBuf,
    right: skyRightBuf,
    left: skyLeftBuf,
    back: skyBackBuf,
    model: skyModelBuf,
    modal: skyModalBuf
  };

  for (const [role, buf] of Object.entries(skyViews)) {
    const fullPath = path.join(skyDir, `${role}.webp`);
    const thumbPath = path.join(skyDir, `${role}-thumb.webp`);
    await fs.writeFile(fullPath, buf);
    await fs.writeFile(thumbPath, await makeThumbnail(buf));
  }
  console.log('✓ sky-blue-mulmul-chikankari-kurta complete (7 angles + 7 thumbs)');

  // 5. Generate 3 Dedicated Kurta Hero Showcase Images
  const bannersDir = path.join(publicDir, 'assets/banners');
  await ensureDir(bannersDir);

  const hero1 = await sharp(raw.ivory_front)
    .resize(1920, 1080, { fit: 'cover', position: 'top' })
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(bannersDir, 'hero-kurta-1.webp'), hero1);

  const hero2 = await sharp(raw.blush_front)
    .resize(1920, 1080, { fit: 'cover', position: 'top' })
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(bannersDir, 'hero-kurta-2.webp'), hero2);

  const hero3 = await sharp(raw.sage_front)
    .resize(1920, 1080, { fit: 'cover', position: 'top' })
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(bannersDir, 'hero-kurta-3.webp'), hero3);
  console.log('✓ Hero Kurta Showcase banners complete (3 images)');

  // 6. Generate Category Banners & Thumbnails
  const categoriesDir = path.join(publicDir, 'assets/categories');
  await ensureDir(categoriesDir);

  const catSpecs = [
    { slug: 'chicken-curry-kurtas', src: raw.ivory_front },
    { slug: 'chicken-curry-collection', src: raw.blush_front },
    { slug: 'kurta-jewellery-combos', src: raw.sage_front },
    { slug: 'premium-ethnic-wear', src: raw.sage_front },
    { slug: 'festive-kurtas', src: raw.blush_front },
    { slug: 'everyday-ethnic-wear', src: raw.ivory_front },
    { slug: 'kurta-gift-sets', src: raw.blush_front },
    { slug: 'premium-jewellery-kurta-sets', src: raw.ivory_front }
  ];

  for (const { slug, src } of catSpecs) {
    const thumbBuf = await sharp(src)
      .resize(600, 600, { fit: 'cover', position: 'top' })
      .webp({ quality: 85 })
      .toBuffer();
    await fs.writeFile(path.join(categoriesDir, `${slug}-thumb.webp`), thumbBuf);

    const bannerBuf = await sharp(src)
      .resize(1600, 500, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();
    await fs.writeFile(path.join(categoriesDir, `${slug}-banner.webp`), bannerBuf);
  }
  console.log('✓ Category thumbnails and banners complete (8 pairs)');

  // 7. Generate Combo Product Images
  const combosDir = path.join(publicDir, 'assets/combos');
  await ensureDir(combosDir);

  // Ivory Kurta + Lune Pearl Drops combo
  const luneJewel = path.join(publicDir, 'assets/products/lune-pearl-drops/hero.webp');
  const combo1Buf = await sharp(raw.ivory_front)
    .resize(1024, 1024, { fit: 'cover', position: 'top' })
    .composite([
      { input: await sharp(luneJewel).resize(360, 360).webp().toBuffer(), top: 620, left: 630 }
    ])
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(combosDir, 'combo-ivory-kurta-lune-pearl-drops.webp'), combo1Buf);
  await fs.writeFile(path.join(combosDir, 'combo-ivory-kurta-lune-pearl-drops-thumb.webp'), await makeThumbnail(combo1Buf));

  // Blush Kurta + Atelier Pearl Collar combo
  const atelierJewel = path.join(publicDir, 'assets/products/atelier-pearl-collar/hero.webp');
  const combo2Buf = await sharp(raw.blush_front)
    .resize(1024, 1024, { fit: 'cover', position: 'top' })
    .composite([
      { input: await sharp(atelierJewel).resize(360, 360).webp().toBuffer(), top: 620, left: 630 }
    ])
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(combosDir, 'combo-blush-kurta-atelier-collar.webp'), combo2Buf);
  await fs.writeFile(path.join(combosDir, 'combo-blush-kurta-atelier-collar-thumb.webp'), await makeThumbnail(combo2Buf));

  // Sage Kurta + Nocturne Pearl Cuff combo
  const nocturneJewel = path.join(publicDir, 'assets/products/nocturne-cuff/hero.webp');
  const combo3Buf = await sharp(raw.sage_front)
    .resize(1024, 1024, { fit: 'cover', position: 'top' })
    .composite([
      { input: await sharp(nocturneJewel).resize(360, 360).webp().toBuffer(), top: 620, left: 630 }
    ])
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(combosDir, 'combo-sage-kurta-nocturne-cuff.webp'), combo3Buf);
  await fs.writeFile(path.join(combosDir, 'combo-sage-kurta-nocturne-cuff-thumb.webp'), await makeThumbnail(combo3Buf));

  // Sky Blue Kurta + Velours Earrings combo
  const veloursJewel = path.join(publicDir, 'assets/products/velours-earrings/hero.webp');
  const combo4Buf = await sharp(skyFrontBuf)
    .resize(1024, 1024, { fit: 'cover', position: 'top' })
    .composite([
      { input: await sharp(veloursJewel).resize(360, 360).webp().toBuffer(), top: 620, left: 630 }
    ])
    .webp({ quality: 88 })
    .toBuffer();
  await fs.writeFile(path.join(combosDir, 'combo-sky-kurta-velours-earrings.webp'), combo4Buf);
  await fs.writeFile(path.join(combosDir, 'combo-sky-kurta-velours-earrings-thumb.webp'), await makeThumbnail(combo4Buf));

  console.log('✓ Combo product imagery complete (4 combos + thumbs)');
  console.log('All image processing completed successfully!');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/process-kurta-assets.js')) {
  processAllAssets().catch(err => {
    console.error('Asset processing failed:', err);
    process.exit(1);
  });
}
