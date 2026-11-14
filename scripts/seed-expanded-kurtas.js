import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { db, now } from '../server/db.js';
import { KURTA_SIZES } from '../src/kurta-constants.js';

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

// 20 Unique Chicken Curry Kurta Styles with 3+ Colours each
export const KURTA_STYLES = [
  {
    product_code: 'lucknowi-ivory-chikankari-cotton-kurta',
    name: 'Noor-e-Awadh Royal Mulmul Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Authentic Lucknowi Chikankari · Tepchi & Bakhiya Stitches',
    description: 'Handcrafted in pre-washed, ultra-soft pure mulmul cotton with heirloom Bakhiya shadow-work and delicate floral butis along the daman.',
    price: 3299,
    baseMaster: 'ivory',
    colors: [
      { name: 'Ivory White', code: 'ivory', hex: '#FFFFF0', modulate: { hue: 0, saturation: 1.0, brightness: 1.02 } },
      { name: 'Rose Blush', code: 'blush', hex: '#F7CAC9', modulate: { hue: 345, saturation: 1.15, brightness: 1.02 } },
      { name: 'Sky Blue', code: 'sky', hex: '#87CEEB', modulate: { hue: 205, saturation: 1.2, brightness: 1.02 } }
    ]
  },
  {
    product_code: 'rose-blush-georgette-chikankari-kurta',
    name: 'Gulzar Flowing Georgette Chikankari Kurta',
    fabric: 'Viscose Georgette (with Cotton Inner)',
    craftsmanship: 'All-Over Floral Jaal & Raised Phanda Knots',
    description: 'Flowing viscose georgette kurta featuring intricate pearl-like Phanda knotting and all-over floral jaal embroidery. Includes matching slip.',
    price: 3499,
    baseMaster: 'blush',
    colors: [
      { name: 'Rose Blush', code: 'blush', hex: '#F7CAC9', modulate: { hue: 0, saturation: 1.0, brightness: 1.0 } },
      { name: 'Powder Blue', code: 'powder-blue', hex: '#B0E0E6', modulate: { hue: 200, saturation: 1.15, brightness: 1.05 } },
      { name: 'Sage Green', code: 'sage', hex: '#9CAF88', modulate: { hue: 100, saturation: 0.95, brightness: 1.0 } }
    ]
  },
  {
    product_code: 'sage-green-chanderi-chikankari-kurta',
    name: 'Nazm Shahi Chanderi Silk Chikankari Kurta',
    fabric: 'Handloom Chanderi Silk',
    craftsmanship: 'Murri & Keel Kangan Needlework with Zari Accents',
    description: 'Shimmering handloom Chanderi silk with fine rice-grain Murri needlecraft and delicate gold zari tipping along the collar and cuffs.',
    price: 3699,
    baseMaster: 'sage',
    colors: [
      { name: 'Sage Green', code: 'sage', hex: '#9CAF88', modulate: { hue: 0, saturation: 1.0, brightness: 1.0 } },
      { name: 'Ivory Gold', code: 'ivory-gold', hex: '#FAF0E6', modulate: { hue: 40, saturation: 0.8, brightness: 1.08 } },
      { name: 'Mustard Ochre', code: 'mustard', hex: '#E1AD01', modulate: { hue: 45, saturation: 1.35, brightness: 1.0 } }
    ]
  },
  {
    product_code: 'sky-blue-mulmul-chikankari-kurta',
    name: 'Mehtab Breathable Mulmul Chikankari Kurta',
    fabric: 'Fine Count Breathable Mulmul Cotton',
    craftsmanship: 'Delicate Keel Kangan Vines & Ghaspatti Stitch',
    description: 'Breezy daytime mulmul silhouette adorned with flowing leafy vines and traditional Awadhi ghaspatti embroidery.',
    price: 3199,
    baseMaster: 'ivory',
    colors: [
      { name: 'Sky Blue', code: 'sky', hex: '#87CEEB', modulate: { hue: 205, saturation: 1.25, brightness: 1.02 } },
      { name: 'Lilac Lavender', code: 'lilac', hex: '#E6E6FA', modulate: { hue: 265, saturation: 1.1, brightness: 1.05 } },
      { name: 'Peach Whisper', code: 'peach', hex: '#FFE5B4', modulate: { hue: 22, saturation: 1.2, brightness: 1.04 } }
    ]
  },
  {
    product_code: 'nazaakat-angrakha-chikankari-kurta',
    name: 'Nazaakat Royal Flared Angrakha Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Asymmetric Tie-Up with Cutwork Jaali',
    description: 'Regal Mughal-inspired overlapping front with hand-tied tassels, detailed with fine needle-pulled jaali cutwork and shadow embroidery.',
    price: 3899,
    baseMaster: 'ivory',
    colors: [
      { name: 'Ivory Cream', code: 'ivory-cream', hex: '#FFFFF5', modulate: { hue: 10, saturation: 0.9, brightness: 1.03 } },
      { name: 'Mint Mist', code: 'mint-mist', hex: '#E0EEE0', modulate: { hue: 130, saturation: 0.9, brightness: 1.04 } },
      { name: 'Dusty Rose', code: 'dusty-rose', hex: '#DCAE96', modulate: { hue: 350, saturation: 1.05, brightness: 0.98 } }
    ]
  },
  {
    product_code: 'anarkali-darbar-chikankari-kurta',
    name: 'Darbar Kalidar Anarkali Chikankari Kurta',
    fabric: 'Fluid Viscose Georgette',
    craftsmanship: '24-Kali Flared Ghera with Pearl Phanda Knots',
    description: 'Sweeping 24-kali flared Anarkali silhouette designed with dense pearl Phanda knots and scalloped embroidered border.',
    price: 4299,
    baseMaster: 'blush',
    colors: [
      { name: 'Royal Navy', code: 'royal-navy', hex: '#1B2F4E', modulate: { hue: 215, saturation: 1.35, brightness: 0.78 } },
      { name: 'Wine Burgundy', code: 'wine', hex: '#722F37', modulate: { hue: 330, saturation: 1.25, brightness: 0.82 } },
      { name: 'Pearl Ivory', code: 'pearl-ivory', hex: '#FDFBF7', modulate: { hue: 30, saturation: 0.7, brightness: 1.06 } }
    ]
  },
  {
    product_code: 'zeenat-straight-chanderi-kurta',
    name: 'Zeenat Classic Straight Chanderi Kurta',
    fabric: 'Chanderi Silk Cotton',
    craftsmanship: 'Intricate Neck Yoke & Embroidered Cuffs',
    description: 'Tailored straight silhouette with a dramatic high-coverage neckline yoke and symmetrical geometric Chikankari motifs.',
    price: 3599,
    baseMaster: 'sage',
    colors: [
      { name: 'Emerald Olive', code: 'emerald-olive', hex: '#556B2F', modulate: { hue: 90, saturation: 1.15, brightness: 0.86 } },
      { name: 'Pale Amber', code: 'pale-amber', hex: '#FFBF00', modulate: { hue: 42, saturation: 1.2, brightness: 1.05 } },
      { name: 'Off-White', code: 'off-white', hex: '#F8F8FF', modulate: { hue: 15, saturation: 0.75, brightness: 1.04 } }
    ]
  },
  {
    product_code: 'ruhaani-modal-chikankari-kurta',
    name: 'Ruhaani Modal Cotton Comfort Kurta',
    fabric: 'Pure Modal Cotton',
    craftsmanship: 'Ultra-Soft Drape with Dense Bakhiya Work',
    description: 'Silky soft modal cotton fabric that drapes effortlessly, accented with signature Awadhi floral medallions and side slit embroidery.',
    price: 3399,
    baseMaster: 'ivory',
    colors: [
      { name: 'Teal Peacock', code: 'teal', hex: '#005F73', modulate: { hue: 175, saturation: 1.25, brightness: 0.85 } },
      { name: 'Lilac Mauve', code: 'mauve', hex: '#C8A2C8', modulate: { hue: 280, saturation: 1.1, brightness: 0.98 } },
      { name: 'Blush Blossom', code: 'blush-blossom', hex: '#FAD2E1', modulate: { hue: 340, saturation: 1.15, brightness: 1.03 } }
    ]
  },
  {
    product_code: 'mumtaz-kota-doria-chikankari-kurta',
    name: 'Mumtaz Kota Doria Checked Chikankari Kurta',
    fabric: 'Authentic Kota Doria Cotton',
    craftsmanship: 'Fine Khat Weave with Shadow Work Motifs',
    description: 'Featherlight geometric square-check weave with artisan shadow embroidery that glows translucently against natural light.',
    price: 3249,
    baseMaster: 'ivory',
    colors: [
      { name: 'Lemon Chiffon', code: 'lemon', hex: '#FFFACD', modulate: { hue: 52, saturation: 1.1, brightness: 1.08 } },
      { name: 'Coral Peach', code: 'coral', hex: '#F88379', modulate: { hue: 10, saturation: 1.25, brightness: 1.0 } },
      { name: 'Powder Mint', code: 'powder-mint', hex: '#D4EDDA', modulate: { hue: 135, saturation: 0.95, brightness: 1.03 } }
    ]
  },
  {
    product_code: 'shabnam-viscose-georgette-kurta',
    name: 'Shabnam Evening Viscose Georgette Kurta',
    fabric: 'Heavy Viscose Georgette',
    craftsmanship: 'Dense Front Panel & Scalloped Sleeves',
    description: 'Lustrous twilight tunic with heavy chest panel embroidery, scalloped cuffs, and matching dyed mulmul slip.',
    price: 3799,
    baseMaster: 'blush',
    colors: [
      { name: 'Midnight Onyx', code: 'black', hex: '#1A1A1A', modulate: { hue: 0, saturation: 0.1, brightness: 0.58 } },
      { name: 'Mulberry Wine', code: 'mulberry', hex: '#5C0632', modulate: { hue: 325, saturation: 1.3, brightness: 0.75 } },
      { name: 'Silver Ash', code: 'silver-ash', hex: '#DCDCDC', modulate: { hue: 0, saturation: 0.15, brightness: 1.02 } }
    ]
  },
  {
    product_code: 'afreen-organza-chikankari-kurta',
    name: 'Afreen Sheer Organza Festive Kurta',
    fabric: 'Silk Organza (with Cotton Slip)',
    craftsmanship: 'Crisp Sheer Weave with Pastel Floral Butas',
    description: 'Contemporary sheer organza structure featuring delicate hand-embroidered rosebuds and satin-finished hems.',
    price: 3999,
    baseMaster: 'sage',
    colors: [
      { name: 'Rose Quartz', code: 'rose-quartz', hex: '#F7CAC9', modulate: { hue: 345, saturation: 1.1, brightness: 1.04 } },
      { name: 'Seafoam Turquoise', code: 'seafoam', hex: '#40E0D0', modulate: { hue: 165, saturation: 1.15, brightness: 1.0 } },
      { name: 'Champagne Gold', code: 'champagne', hex: '#F7E7CE', modulate: { hue: 38, saturation: 1.0, brightness: 1.06 } }
    ]
  },
  {
    product_code: 'parizaad-tussar-silk-kurta',
    name: 'Parizaad Textured Tussar Silk Kurta',
    fabric: 'Handspun Tussar Silk',
    craftsmanship: 'Traditional Awadhi Bels & Raw Texture',
    description: 'Richly textured wild silk crafted with earth-toned threadwork, showcasing century-old Lucknow floral creepers.',
    price: 4199,
    baseMaster: 'sage',
    colors: [
      { name: 'Mustard Haldi', code: 'mustard-haldi', hex: '#E3A857', modulate: { hue: 38, saturation: 1.3, brightness: 1.0 } },
      { name: 'Terracotta Rust', code: 'terracotta', hex: '#CC4E33', modulate: { hue: 15, saturation: 1.25, brightness: 0.9 } },
      { name: 'Natural Ecru', code: 'natural-ecru', hex: '#F3ECE1', modulate: { hue: 28, saturation: 0.8, brightness: 1.04 } }
    ]
  },
  {
    product_code: 'jahanara-layered-chikankari-kurta',
    name: 'Jahanara Dual-Layer Festive Kurta',
    fabric: 'Mulmul & Sheer Georgette',
    craftsmanship: 'Tone-on-Tone Shadow & Ghaspatti Stitch',
    description: 'Two-tiered layered silhouette featuring an embroidered mulmul base and floating sheer overlay with pearl-tipped hem.',
    price: 3849,
    baseMaster: 'ivory',
    colors: [
      { name: 'Lavender Mist', code: 'lavender-mist', hex: '#E6E6FA', modulate: { hue: 260, saturation: 1.1, brightness: 1.04 } },
      { name: 'Pistachio Green', code: 'pistachio', hex: '#93C572', modulate: { hue: 95, saturation: 1.05, brightness: 1.02 } },
      { name: 'Cloud White', code: 'cloud-white', hex: '#F5F5F5', modulate: { hue: 0, saturation: 0.9, brightness: 1.03 } }
    ]
  },
  {
    product_code: 'dilkash-short-tunic-kurta',
    name: 'Dilkash Contemporary Short Tunic Kurta',
    fabric: 'Premium Cotton Slub',
    craftsmanship: 'Mandarin Collar with Minimalist Tepchi Stitches',
    description: 'Modern hip-length short kurta designed for effortless pairing with denims or trousers, finished with subtle sleeve embroidery.',
    price: 2799,
    baseMaster: 'ivory',
    colors: [
      { name: 'Indigo Sapphire', code: 'indigo', hex: '#0F52BA', modulate: { hue: 218, saturation: 1.45, brightness: 0.78 } },
      { name: 'Sage Olive', code: 'sage-olive', hex: '#8A9A5B', modulate: { hue: 85, saturation: 1.05, brightness: 0.95 } },
      { name: 'Coral Rose', code: 'coral-rose', hex: '#E07A5F', modulate: { hue: 12, saturation: 1.2, brightness: 0.96 } }
    ]
  },
  {
    product_code: 'shahzadi-heavy-jaal-kurta',
    name: 'Shahzadi Bridal Heavy Jaal Kurta',
    fabric: 'Opulent Viscose Georgette',
    craftsmanship: 'Master Artisan All-Over Heirloom Jaal Work',
    description: 'Exquisite museum-grade embroidery covering every inch of the fabric with intricate paisleys, jaalis, and raised phandas.',
    price: 4599,
    baseMaster: 'blush',
    colors: [
      { name: 'Deep Garnet', code: 'garnet', hex: '#800020', modulate: { hue: 340, saturation: 1.35, brightness: 0.78 } },
      { name: 'Regal Plum', code: 'plum', hex: '#4B0082', modulate: { hue: 280, saturation: 1.3, brightness: 0.8 } },
      { name: 'Ivory Opulence', code: 'ivory-opulence', hex: '#FFFFF0', modulate: { hue: 25, saturation: 0.8, brightness: 1.06 } }
    ]
  },
  {
    product_code: 'sitara-mirror-chikankari-kurta',
    name: 'Sitara Subtle Mirror-Work Chikankari Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Delicate Abhla Mirrors Hand-Set in Phanda Knots',
    description: 'Sparkling artisan mirrors embedded seamlessly into hand-embroidered floral motifs for understated festive shimmer.',
    price: 3549,
    baseMaster: 'ivory',
    colors: [
      { name: 'Powder Blue', code: 'powder-blue', hex: '#B0E0E6', modulate: { hue: 200, saturation: 1.2, brightness: 1.04 } },
      { name: 'Sunshine Yellow', code: 'sunshine-yellow', hex: '#FFD700', modulate: { hue: 48, saturation: 1.35, brightness: 1.04 } },
      { name: 'Vintage Rose', code: 'vintage-rose', hex: '#C47E84', modulate: { hue: 350, saturation: 1.1, brightness: 0.96 } }
    ]
  },
  {
    product_code: 'subah-cotton-linen-kurta',
    name: 'Subah Linen-Cotton Breathable Kurta',
    fabric: 'Linen Cotton Blend',
    craftsmanship: 'Geometric Tepchi Stitches & Side Slit Bels',
    description: 'Crisp and breathable everyday summer linen-cotton blend decorated with geometric linear threadwork and side slit accents.',
    price: 3149,
    baseMaster: 'sage',
    colors: [
      { name: 'Oatmeal Beige', code: 'oatmeal', hex: '#E6D7C3', modulate: { hue: 30, saturation: 0.85, brightness: 1.02 } },
      { name: 'Olive Fern', code: 'olive-fern', hex: '#6B8E23', modulate: { hue: 85, saturation: 1.1, brightness: 0.9 } },
      { name: 'Sky Azure', code: 'azure', hex: '#4682B4', modulate: { hue: 205, saturation: 1.25, brightness: 0.9 } }
    ]
  },
  {
    product_code: 'firdaus-slit-a-line-kurta',
    name: 'Firdaus Front-Slit A-Line Kurta',
    fabric: 'Pure Chanderi Silk',
    craftsmanship: 'Centred Slit with Elaborate Damask Needling',
    description: 'Regal A-line silhouette with a centre-front slit and symmetrical Mughal damask motifs down both panels.',
    price: 3749,
    baseMaster: 'sage',
    colors: [
      { name: 'Dusty Mauve', code: 'dusty-mauve', hex: '#915F6D', modulate: { hue: 320, saturation: 1.15, brightness: 0.9 } },
      { name: 'Forest Emerald', code: 'forest-emerald', hex: '#1E4D2B', modulate: { hue: 125, saturation: 1.2, brightness: 0.78 } },
      { name: 'Cream Chiffon', code: 'cream-chiffon', hex: '#FFFDD0', modulate: { hue: 35, saturation: 0.85, brightness: 1.05 } }
    ]
  },
  {
    product_code: 'noorjahan-embroidered-yoke-kurta',
    name: 'Noorjahan Scalloped Daman Kurta',
    fabric: 'Fine Viscose Georgette',
    craftsmanship: 'Cutwork Scallop Hem & High Neck Yoke',
    description: 'Dramatic scalloped hemline created with needle-cut jaali and heavy floral sprays across the front yoke and sleeves.',
    price: 3899,
    baseMaster: 'blush',
    colors: [
      { name: 'Slate Charcoal', code: 'slate-charcoal', hex: '#36454F', modulate: { hue: 200, saturation: 0.35, brightness: 0.75 } },
      { name: 'Coral Sunset', code: 'coral-sunset', hex: '#F3705A', modulate: { hue: 14, saturation: 1.3, brightness: 0.98 } },
      { name: 'Pristine Snow', code: 'pristine-snow', hex: '#FFFFFF', modulate: { hue: 0, saturation: 0.6, brightness: 1.08 } }
    ]
  },
  {
    product_code: 'rahat-relaxed-mulmul-kurta',
    name: 'Rahat Relaxed Oversized Mulmul Kurta',
    fabric: 'Featherlight Mulmul Cotton',
    craftsmanship: 'Scattered Floral Butis with Bakhiya Shadow Stitch',
    description: 'Relaxed easy-fit everyday kurta featuring breezy dolman sleeves and delicate scattered star and blossom embroidery.',
    price: 2999,
    baseMaster: 'ivory',
    colors: [
      { name: 'Marigold Saffron', code: 'marigold', hex: '#FF9933', modulate: { hue: 35, saturation: 1.4, brightness: 1.02 } },
      { name: 'Aqua Mint', code: 'aqua-mint', hex: '#7FFFD4', modulate: { hue: 165, saturation: 1.15, brightness: 1.04 } },
      { name: 'Kashmiri Peach', code: 'kashmiri-peach', hex: '#FFCBA4', modulate: { hue: 24, saturation: 1.2, brightness: 1.04 } }
    ]
  }
];

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
  console.log('--- Starting Expanded Chicken Curry Kurtas (20 Styles, 60 Colours, 420 SKUs) ---');

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

    console.log(`Processing Style ${sIdx + 1}/20: ${style.name} (${code})...`);

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
          sort_order: rIdx + 1,
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

  console.log(`Generated ${productRows.length} Kurta SKU variants across 20 styles!`);
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

    // 4. Insert all 420 kurta variants in batches
    for (let i = 0; i < productRows.length; i += batchSize) {
      await trx('products').insert(productRows.slice(i, i + batchSize));
    }
  });

  console.log('✓ Successfully seeded 20 Kurta styles with 60 colour variants and 420 SKUs into database!');
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
