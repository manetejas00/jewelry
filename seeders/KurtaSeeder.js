import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';
import { KURTA_SIZES } from '../src/kurta-constants.js';
import { KURTA_STYLES } from '../scripts/seed-expanded-kurtas.js';
import { KurtaCategorySeeder } from './KurtaCategorySeeder.js';
import { KurtaVariantSeeder } from './KurtaVariantSeeder.js';

export const kurtaSupplier = 'Lucknow Heritage Maison';

export async function KurtaSeeder(k = db) {
  if (!await k.schema.hasTable('kurtas')) {
    throw Error('Table kurtas does not exist. Run migrations before running KurtaSeeder.');
  }

  // Ensure kurta categories exist
  await KurtaCategorySeeder(k);
  const categories = await k('kurta_categories').select('id', 'name', 'slug');
  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

  const timestamp = now();
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

  return k.transaction(async (t) => {
    let insertedStyles = 0;
    let updatedStyles = 0;
    let totalVariants = 0;

    for (let sIdx = 0; sIdx < KURTA_STYLES.length; sIdx++) {
      const style = KURTA_STYLES[sIdx];
      const code = style.product_code;
      const catId = catMap.get('chicken curry kurtas') || categories[0]?.id || null;
      const primaryColor = style.colors[0];
      const repHero = `/assets/products/${code}/hero.webp`;

      const sizesList = KURTA_SIZES.map(s => s.label);
      const colorsList = style.colors.map(c => ({ name: c.name, code: c.code, hex: c.hex }));

      // Sku generation logic matching system
      const skuPrefix = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);
      let repSku;
      if (code === 'lucknowi-ivory-chikankari-cotton-kurta') repSku = 'CCK-IVORY-XS';
      else if (code === 'rose-blush-georgette-chikankari-kurta') repSku = 'CCK-BLUSH-XS';
      else if (code === 'sage-green-chanderi-chikankari-kurta') repSku = 'CCK-SAGE-XS';
      else if (code === 'sky-blue-mulmul-chikankari-kurta') repSku = 'CCK-SKY-XS';
      else repSku = `CCK-${skuPrefix}-XS`;

      const priceNum = Number(style.price || 3299);

      const kurtaPayload = {
        sku: repSku,
        product_code: code,
        slug: code,
        name: style.name,
        category_id: catId,
        category: 'Chicken Curry Kurtas',
        description: style.description,
        fabric: style.fabric,
        pattern: 'Handcrafted Lucknowi Chikankari',
        fit: 'Straight Fit',
        sleeve_type: 'Full Sleeves',
        neck_type: 'Mandarin Collar with Keyhole Placket',
        occasion: 'Festive, Formal & Daily Casual',
        gender: 'Women',
        available_sizes: JSON.stringify(sizesList),
        available_colors: JSON.stringify(colorsList),
        material: style.fabric,
        price: priceNum,
        sale_price: priceNum,
        fixed_price: priceNum,
        stock: 350,
        status: 'published',
        supplier: kurtaSupplier,
        image: repHero,
        seo_title: `${style.name} | Lucknowi Chikankari Kurta`,
        meta_description: style.description,
        source_timestamp: timestamp,
        updated_at: timestamp
      };

      const existingKurta = await t('kurtas').where({ product_code: code }).first();
      let kurtaId;

      if (!existingKurta) {
        const [newId] = await t('kurtas').insert({
          ...kurtaPayload,
          created_at: timestamp
        });
        kurtaId = newId;
        insertedStyles++;
      } else {
        kurtaId = existingKurta.id;
        await t('kurtas').where({ id: existingKurta.id }).update({
          name: kurtaPayload.name,
          category_id: kurtaPayload.category_id,
          description: kurtaPayload.description,
          fabric: kurtaPayload.fabric,
          available_sizes: kurtaPayload.available_sizes,
          available_colors: kurtaPayload.available_colors,
          price: kurtaPayload.price,
          fixed_price: kurtaPayload.fixed_price,
          image: kurtaPayload.image,
          seo_title: kurtaPayload.seo_title,
          meta_description: kurtaPayload.meta_description,
          updated_at: timestamp
        });
        updatedStyles++;
      }

      // Prepare variants for this style
      const styleVariants = [];
      const imageRows = [];

      for (let cIdx = 0; cIdx < style.colors.length; cIdx++) {
        const col = style.colors[cIdx];
        const isDefaultColor = cIdx === 0;
        const colorSubdir = isDefaultColor ? '' : `${col.code}/`;
        const colorHeroUrl = isDefaultColor
          ? `/assets/products/${code}/hero.webp`
          : `/assets/products/${code}/${col.code}/hero.webp`;

        const skuColorCode = col.code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'CLR';

        for (const sizeInfo of KURTA_SIZES) {
          let variantSku;
          let variantSlug;

          if (code === 'lucknowi-ivory-chikankari-cotton-kurta') {
            if (isDefaultColor) {
              variantSku = `CCK-IVORY-${sizeInfo.code}`;
              variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            } else {
              variantSku = `CCK-IVORY-${skuColorCode}-${sizeInfo.code}`;
              variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            }
          } else if (code === 'rose-blush-georgette-chikankari-kurta') {
            if (isDefaultColor) {
              variantSku = `CCK-BLUSH-${sizeInfo.code}`;
              variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            } else {
              variantSku = `CCK-BLUSH-${skuColorCode}-${sizeInfo.code}`;
              variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            }
          } else if (code === 'sage-green-chanderi-chikankari-kurta') {
            if (isDefaultColor) {
              variantSku = `CCK-SAGE-${sizeInfo.code}`;
              variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            } else {
              variantSku = `CCK-SAGE-${skuColorCode}-${sizeInfo.code}`;
              variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            }
          } else if (code === 'sky-blue-mulmul-chikankari-kurta') {
            if (isDefaultColor) {
              variantSku = `CCK-SKY-${sizeInfo.code}`;
              variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            } else {
              variantSku = `CCK-SKY-${skuColorCode}-${sizeInfo.code}`;
              variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            }
          } else {
            if (isDefaultColor) {
              variantSku = `CCK-${skuPrefix}-${sizeInfo.code}`;
              variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
            } else {
              variantSku = `CCK-${skuPrefix}-${skuColorCode}-${sizeInfo.code}`;
              variantSlug = `${code}-${col.code}-${sizeInfo.code.toLowerCase()}`;
            }
          }

          const baseStock = 8 + ((sIdx * 3 + cIdx * 7 + sizeInfo.code.charCodeAt(0)) % 14);

          styleVariants.push({
            product_code: code,
            sku: variantSku,
            slug: variantSlug,
            size: sizeInfo.label,
            color: col.name,
            color_code: col.code,
            hex_color: col.hex,
            finish: 'Hand Embroidered',
            price: priceNum,
            fixed_price: priceNum,
            stock: baseStock,
            image: colorHeroUrl,
            status: 'published'
          });
        }

        // 12 Angle Images per color variant
        for (let rIdx = 0; rIdx < angleRoles.length; rIdx++) {
          const angle = angleRoles[rIdx];
          const imgUrl = isDefaultColor
            ? `/assets/products/${code}/${angle.file}`
            : `/assets/products/${code}/${col.code}/${angle.file}`;
          const altText = `${style.name} in ${col.name} - ${angle.label}`;
          imageRows.push({
            kurta_id: kurtaId,
            product_code: code,
            sku: null,
            role: angle.role,
            url: imgUrl,
            alt_text: altText,
            sort_order: isDefaultColor ? (rIdx + 1) : (100 + cIdx * 20 + rIdx + 1),
            color: col.name,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }

      // Seed variants
      await KurtaVariantSeeder(t, kurtaId, styleVariants);
      totalVariants += styleVariants.length;

      // Seed images
      if (await t.schema.hasTable('kurta_images')) {
        for (const img of imageRows) {
          const existingImg = await t('kurta_images').where({
            kurta_id: kurtaId,
            url: img.url
          }).first();
          if (!existingImg) {
            await t('kurta_images').insert(img);
          }
        }
      }
    }

    return {
      insertedStyles,
      updatedStyles,
      totalStyles: KURTA_STYLES.length,
      totalVariants
    };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await KurtaSeeder(), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
