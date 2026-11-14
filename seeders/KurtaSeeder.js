import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';

export const kurtaSupplier = 'Lucknow Heritage Maison';

export const kurtaProducts = [
  {
    product_code: 'lucknowi-ivory-chikankari-cotton-kurta',
    name: 'Noor-e-Awadh Ivory Chikankari Mulmul Kurta',
    category: 'Chicken Curry Kurtas for Women',
    description: 'An ode to Awadhi heritage, the Noor-e-Awadh kurta is meticulously handcrafted from feather-light pure mulmul cotton. Features traditional tone-on-tone Lucknowi Chikankari needlework—blending delicate Bakhiya (shadow work) and Phanda (pearl stitch) motifs across the Mandarin collar, placket, and hemline. Breathable weave and tailored side slits offer effortless elegance for daytime celebrations.',
    metal: 'Pure Mulmul Cotton',
    purity: 'Handcrafted Chikankari',
    finish: 'White-on-White Shadow Work',
    image: '/assets/products/lucknowi-ivory-chikankari-cotton-kurta/hero.webp',
    pricing_mode: 'FIXED',
    base_price: 2990,
    seo_title: 'Noor-e-Awadh Ivory Chikankari Cotton Kurta | Veyora',
    meta_description: 'Pure mulmul cotton Lucknowi Chikankari embroidered kurta for women in pristine ivory white. Handcrafted floral needlework with side slits and soft drape.',
    variants: [
      { sku: 'CCK-IVORY-XS', size: 'XS (34)', stock: 8 },
      { sku: 'CCK-IVORY-S', size: 'S (36)', stock: 12 },
      { sku: 'CCK-IVORY-M', size: 'M (38)', stock: 15 },
      { sku: 'CCK-IVORY-L', size: 'L (40)', stock: 18 },
      { sku: 'CCK-IVORY-XL', size: 'XL (42)', stock: 10 },
      { sku: 'CCK-IVORY-XXL', size: 'XXL (44)', stock: 8 },
      { sku: 'CCK-IVORY-XXXL', size: 'XXXL (46)', stock: 5 }
    ]
  },
  {
    product_code: 'rose-blush-georgette-chikankari-kurta',
    name: 'Gulzar Rose Blush Georgette Chikankari Kurta',
    category: 'Chicken Curry Kurtas for Women',
    description: 'Adorned in a romantic blush pink hue, the Gulzar kurta is tailored in fluid viscose georgette with intricate all-over floral jaal embroidery. Embellished with delicate Ghaspatti and Keel Kangan stitches, complemented by matching inner lining and scalloped sleeve hems. Perfect for festive celebrations and evening gatherings.',
    metal: 'Viscose Georgette',
    purity: 'Handcrafted Chikankari',
    finish: 'Floral Jaal Embroidery',
    image: '/assets/products/rose-blush-georgette-chikankari-kurta/hero.webp',
    pricing_mode: 'FIXED',
    base_price: 3490,
    seo_title: 'Gulzar Rose Blush Georgette Chikankari Kurta | Veyora',
    meta_description: 'Exquisite blush pink viscose georgette Chikankari kurta with intricate floral jaal embroidery, scalloped borders, and flattering festive silhouette.',
    variants: [
      { sku: 'CCK-BLUSH-XS', size: 'XS (34)', stock: 6 },
      { sku: 'CCK-BLUSH-S', size: 'S (36)', stock: 10 },
      { sku: 'CCK-BLUSH-M', size: 'M (38)', stock: 14 },
      { sku: 'CCK-BLUSH-L', size: 'L (40)', stock: 16 },
      { sku: 'CCK-BLUSH-XL', size: 'XL (42)', stock: 8 },
      { sku: 'CCK-BLUSH-XXL', size: 'XXL (44)', stock: 6 },
      { sku: 'CCK-BLUSH-XXXL', size: 'XXXL (46)', stock: 4 }
    ]
  },
  {
    product_code: 'sage-green-chanderi-chikankari-kurta',
    name: 'Nazakat Sage Green Chanderi Chikankari Kurta',
    category: 'Chicken Curry Kurtas for Women',
    description: 'Crafted in shimmering handloom Chanderi silk with a serene sage green tint. The Nazakat kurta features heritage Murri and Tepchi needlework intertwined with subtle zari accents along the V-neckline and sleeve borders. Combines regal poise with contemporary comfort.',
    metal: 'Chanderi Silk',
    purity: 'Handcrafted Chikankari',
    finish: 'Murri & Zari Needlework',
    image: '/assets/products/sage-green-chanderi-chikankari-kurta/hero.webp',
    pricing_mode: 'FIXED',
    base_price: 3890,
    seo_title: 'Nazakat Sage Green Chanderi Chikankari Kurta | Veyora',
    meta_description: 'Luxury sage green handloom Chanderi silk kurta with authentic Chikankari needlework and subtle zari borders. Regal poise for festive occasions.',
    variants: [
      { sku: 'CCK-SAGE-XS', size: 'XS (34)', stock: 5 },
      { sku: 'CCK-SAGE-S', size: 'S (36)', stock: 8 },
      { sku: 'CCK-SAGE-M', size: 'M (38)', stock: 12 },
      { sku: 'CCK-SAGE-L', size: 'L (40)', stock: 14 },
      { sku: 'CCK-SAGE-XL', size: 'XL (42)', stock: 7 },
      { sku: 'CCK-SAGE-XXL', size: 'XXL (44)', stock: 5 },
      { sku: 'CCK-SAGE-XXXL', size: 'XXXL (46)', stock: 3 }
    ]
  },
  {
    product_code: 'sky-blue-mulmul-chikankari-kurta',
    name: 'Fiza Sky Blue Hand-Embroidered Chikankari Kurta',
    category: 'Chicken Curry Kurtas for Women',
    description: 'Capturing the serene calm of morning skies, the Fiza kurta features authentic white cotton thread embroidery on pastel sky-blue mulmul cotton. Detailed with floral sprigs (butis), a gracefully embroidered round slit neckline, and fine side-slit finishings.',
    metal: 'Fine Mulmul Cotton',
    purity: 'Handcrafted Chikankari',
    finish: 'Pastel Shadow Needlework',
    image: '/assets/products/sky-blue-mulmul-chikankari-kurta/hero.webp',
    pricing_mode: 'FIXED',
    base_price: 2790,
    seo_title: 'Fiza Sky Blue Mulmul Chikankari Kurta | Veyora',
    meta_description: 'Breezy sky blue fine cotton Chikankari kurta for women with hand-embroidered floral motifs and delicate neckline. Everyday elegance.',
    variants: [
      { sku: 'CCK-SKY-XS', size: 'XS (34)', stock: 7 },
      { sku: 'CCK-SKY-S', size: 'S (36)', stock: 10 },
      { sku: 'CCK-SKY-M', size: 'M (38)', stock: 15 },
      { sku: 'CCK-SKY-L', size: 'L (40)', stock: 16 },
      { sku: 'CCK-SKY-XL', size: 'XL (42)', stock: 9 },
      { sku: 'CCK-SKY-XXL', size: 'XXL (44)', stock: 6 },
      { sku: 'CCK-SKY-XXXL', size: 'XXXL (46)', stock: 4 }
    ]
  }
];

export async function KurtaSeeder(k = db) {
  if (!await k.schema.hasTable('products')) {
    throw Error('Run migrations before running KurtaSeeder.');
  }

  const hasIsKurta = await k.schema.hasColumn('products', 'is_kurta');

  return k.transaction(async (t) => {
    let insertedProducts = 0;
    let updatedProducts = 0;
    let insertedImages = 0;
    const timestamp = now();

    for (const style of kurtaProducts) {
      const code = style.product_code;

      // Clean existing records for this style to allow clean re-indexing across XS-XXXL
      await t('products').where({ product_code: code }).delete();

      for (const [idx, v] of style.variants.entries()) {
        const sizeSlug = v.size.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const slug = idx === 0 ? code : `${code}-${sizeSlug}`;

        const productData = {
          supplier: kurtaSupplier,
          product_code: code,
          slug,
          sku: v.sku,
          name: style.name,
          category: style.category,
          description: style.description,
          metal: style.metal,
          purity: style.purity,
          net_weight_g: null,
          size: v.size,
          finish: style.finish,
          image: style.image,
          pricing_mode: style.pricing_mode,
          fixed_price: style.base_price,
          making_flat: 0,
          making_percent: 0,
          stone_charge: 0,
          other_charge: 0,
          stock: v.stock,
          status: 'published',
          source_timestamp: timestamp,
          updated_at: timestamp,
          seo_title: style.seo_title,
          meta_description: style.meta_description
        };

        if (hasIsKurta) {
          productData.is_kurta = true;
        }

        await t('products').insert(productData);
        await t('supplier_skus').insert({
          supplier: kurtaSupplier,
          supplier_sku: v.sku,
          sku: v.sku
        }).onConflict(['supplier', 'supplier_sku']).merge();
        insertedProducts++;
      }

      // 2. Populate product_images table for all multi-angle views
      const imageRoles = [
        { role: 'hero', file: 'hero.webp', alt: `${style.name} Hero View` },
        { role: 'front', file: 'front.webp', alt: `${style.name} Front View` },
        { role: 'left', file: 'left.webp', alt: `${style.name} Left Profile View` },
        { role: 'right', file: 'right.webp', alt: `${style.name} Right Profile View` },
        { role: 'back', file: 'back.webp', alt: `${style.name} Back View` },
        { role: 'model', file: 'model.webp', alt: `${style.name} On-Model Lifestyle View` },
        { role: 'detail', file: 'modal.webp', alt: `${style.name} Hand Embroidery Craftsmanship Detail` }
      ];

      for (const [order, img] of imageRoles.entries()) {
        const url = `/assets/products/${code}/${img.file}`;
        const existingImg = await t('product_images').where({
          product_code: code,
          role: img.role
        }).first();

        if (existingImg) {
          await t('product_images').where({ id: existingImg.id }).update({
            url,
            alt_text: img.alt,
            sort_order: order + 1,
            updated_at: timestamp
          });
        } else {
          await t('product_images').insert({
            product_code: code,
            sku: null,
            role: img.role,
            url,
            alt_text: img.alt,
            sort_order: order + 1,
            created_at: timestamp,
            updated_at: timestamp
          });
          insertedImages++;
        }
      }
    }

    return {
      insertedProducts,
      updatedProducts,
      totalVariants: kurtaProducts.length * 7,
      insertedImages
    };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const res = await KurtaSeeder();
    console.log('KurtaSeeder complete:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('KurtaSeeder failed:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
