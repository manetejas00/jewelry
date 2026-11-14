import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';
import { KURTA_SIZES } from '../src/kurta-constants.js';
import { KURTA_STYLES } from '../scripts/seed-expanded-kurtas.js';

export const kurtaSupplier = 'Lucknow Heritage Maison';

export async function KurtaSeeder(k = db) {
  if (!(await k.schema.hasTable('products'))) {
    throw Error('Run migrations before running KurtaSeeder.');
  }

  const hasIsKurta = await k.schema.hasColumn('products', 'is_kurta');
  const hasColor = await k.schema.hasColumn('products', 'color');
  const timestamp = now();

  const productRows = [];
  const imageRows = [];
  const supplierRows = [];

  const angleRoles = [
    { role: 'hero', file: 'hero.webp', label: 'Hero Catalog Shot' },
    { role: 'front', file: 'front.webp', label: 'Front Angle' },
    { role: 'model', file: 'model.webp', label: 'On-Model Wearing View' },
    { role: 'back', file: 'back.webp', label: 'Back View & Draped Embroidery' },
    { role: 'left', file: 'left.webp', label: 'Left Silhouette Profile' },
    { role: 'right', file: 'right.webp', label: 'Right Silhouette Profile' },
    { role: 'detail', file: 'detail.webp', label: 'Handcrafted Stitchwork Detail' },
    { role: 'modal', file: 'modal.webp', label: 'High-Resolution Zoom & Drape' },
    { role: 'neckline', file: 'neckline.webp', label: 'Artisan Neckline & Placket' },
    { role: 'embroidery', file: 'embroidery.webp', label: 'Tonal Bakhiya & Shadow Work' },
    { role: 'fabric', file: 'fabric.webp', label: 'Natural Weave & Texture' },
    { role: 'sleeve', file: 'sleeve.webp', label: 'Intricate Sleeve Border' }
  ];

  for (const [sIdx, style] of KURTA_STYLES.entries()) {
    const code = style.product_code;

    for (const [cIdx, col] of style.colors.entries()) {
      const isPrimaryColor = cIdx === 0;
      const colorSubdir = isPrimaryColor ? '' : `${col.code}/`;
      const colorHeroUrl = `/assets/products/${code}/${colorSubdir}hero.webp`;

      // 12 Angle Images per color variant
      for (const [order, angle] of angleRoles.entries()) {
        const imgUrl = `/assets/products/${code}/${colorSubdir}${angle.file}`;
        const altText = `${style.name} in ${col.name} - ${angle.label}`;
        imageRows.push({
          product_code: code,
          sku: null,
          role: angle.role,
          url: imgUrl,
          alt_text: altText,
          sort_order: isPrimaryColor ? (order + 1) : (100 + cIdx * 20 + order + 1),
          color: col.code,
          created_at: timestamp,
          updated_at: timestamp
        });
      }

      // 7 Size Variants (XS, S, M, L, XL, XXL, XXXL)
      for (const [sizeIdx, sizeInfo] of KURTA_SIZES.entries()) {
        let variantSku;
        let variantName;

        if (isPrimaryColor && code === 'lucknowi-ivory-chikankari-cotton-kurta') {
          variantSku = `CCK-IVORY-${sizeInfo.code}`;
          variantName = 'Noor-e-Awadh Ivory Chikankari Mulmul Kurta';
        } else if (isPrimaryColor && code === 'rose-blush-georgette-chikankari-kurta') {
          variantSku = `CCK-BLUSH-${sizeInfo.code}`;
          variantName = 'Gulzar Rose Blush Georgette Chikankari Kurta';
        } else if (isPrimaryColor && code === 'sage-green-chanderi-chikankari-kurta') {
          variantSku = `CCK-SAGE-${sizeInfo.code}`;
          variantName = 'Nazakat Sage Green Chanderi Chikankari Kurta';
        } else if (isPrimaryColor && code === 'sky-blue-mulmul-chikankari-kurta') {
          variantSku = `CCK-SKY-${sizeInfo.code}`;
          variantName = 'Fiza Sky Blue Hand-Embroidered Chikankari Kurta';
        } else {
          const codePrefix = code.split('-').slice(0, 2).map(w => w.slice(0, 3).toUpperCase()).join('');
          const colPrefix = col.code.slice(0, 3).toUpperCase();
          variantSku = `CCK-${codePrefix}-${colPrefix}-${sizeInfo.code}`;
          variantName = `${style.name} - ${col.name}`;
        }

        const sizeSlug = sizeInfo.code.toLowerCase();
        const variantSlug = isPrimaryColor && sizeIdx === 0
          ? code
          : `${code}-${col.code}-${sizeSlug}`;

        const baseStock = 8 + ((sIdx * 3 + cIdx * 7 + sizeInfo.code.charCodeAt(0)) % 14);

        const productData = {
          supplier: kurtaSupplier,
          product_code: code,
          sku: variantSku,
          slug: variantSlug,
          name: variantName,
          category: 'Chicken Curry Kurtas',
          description: style.description,
          metal: style.fabric,
          purity: style.craftsmanship,
          net_weight_g: null,
          size: sizeInfo.label,
          finish: 'Hand Embroidered',
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
        };

        if (hasIsKurta) {
          productData.is_kurta = 1;
        }

        if (hasColor) {
          productData.color = col.name;
          productData.color_code = col.code;
          productData.hex_color = col.hex;
        }

        productRows.push(productData);
        supplierRows.push({
          supplier: kurtaSupplier,
          supplier_sku: variantSku,
          sku: variantSku
        });
      }
    }
  }

  return k.transaction(async (trx) => {
    // 1. Delete existing kurta images
    const kurtaCodes = KURTA_STYLES.map(s => s.product_code);
    await trx('product_images').whereIn('product_code', kurtaCodes).del();

    // 2. Insert all product_images in batches
    const batchSize = 100;
    for (let i = 0; i < imageRows.length; i += batchSize) {
      await trx('product_images').insert(imageRows.slice(i, i + batchSize));
    }

    // 3. Delete existing kurta products
    await trx('products').where(function () {
      this.where({ is_kurta: 1 })
        .orWhere({ category: 'Chicken Curry Kurtas' })
        .orWhere({ category: 'Chicken Curry Kurtas for Women' })
        .orWhereIn('product_code', kurtaCodes);
    }).del();

    // 4. Insert all kurta variants in batches
    for (let i = 0; i < productRows.length; i += batchSize) {
      await trx('products').insert(productRows.slice(i, i + batchSize));
    }

    // 5. Insert supplier SKUs
    for (let i = 0; i < supplierRows.length; i += batchSize) {
      await trx('supplier_skus')
        .insert(supplierRows.slice(i, i + batchSize))
        .onConflict(['supplier', 'supplier_sku'])
        .merge();
    }

    return {
      stylesCount: KURTA_STYLES.length,
      totalVariants: productRows.length,
      totalImages: imageRows.length
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