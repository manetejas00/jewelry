import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now } from '../server/db.js';
import { KURTA_SIZES } from '../shared/kurta-sizes.js';
import { MSK_KURTA_STYLES as KURTA_STYLES } from '../scripts/msk-kurtas-data.js';
import { KurtaCategorySeeder } from './KurtaCategorySeeder.js';
import { KurtaVariantSeeder } from './KurtaVariantSeeder.js';

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
      let repSku = style.sku ? `CCK-${style.sku}-XS` : `CCK-${code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8)}-XS`;

      const priceNum = Number(style.price || 1299);

      const kurtaPayload = {
        sku: repSku,
        product_code: code,
        slug: code,
        name: style.name,
        category_id: catId,
        category: style.category || 'Kurta',
        description: style.description,
        fabric: style.fabric,
        pattern: style.craftsmanship || 'Handcrafted Lucknowi Chikankari',
        fit: style.fit || 'Straight Fit',
        sleeve_type: style.sleeve_type || 'Three-Quarter Sleeves',
        neck_type: style.neck_type || 'Mandarin / Round Notch',
        occasion: style.occasion || 'Festive / Traditional',
        gender: 'Women',
        available_sizes: JSON.stringify(sizesList),
        available_colors: JSON.stringify(colorsList),
        material: style.fabric,
        price: priceNum,
        sale_price: priceNum,
        fixed_price: priceNum,
        stock: 140,
        status: 'published',
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
          const variantSku = style.sku ? `CCK-${style.sku}-${sizeInfo.code}` : `CCK-${code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8)}-${sizeInfo.code}`;
          const variantSlug = sizeInfo.code === 'XS' ? code : `${code}-${sizeInfo.code.toLowerCase()}`;
          const baseStock = 20;

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

          // Sync with storefront products table
          const existingProd = await t('products').where({ sku: variantSku }).first();
          const prodData = {
            product_code: code,
            sku: variantSku,
            slug: variantSlug,
            name: style.name,
            category: 'Kurta',
            is_kurta: 1,
            description: style.description,
            metal: style.fabric,
            purity: style.craftsmanship || 'Handcrafted Lucknowi Chikankari',
            size: sizeInfo.label,
            finish: 'Hand Embroidered',
            color: col.name,
            color_code: col.code,
            hex_color: col.hex,
            image: colorHeroUrl,
            pricing_mode: 'FIXED',
            fixed_price: String(priceNum.toFixed(2)),
            making_flat: '0.00',
            making_percent: '0.00',
            stone_charge: '0.00',
            other_charge: '0.00',
            stock: baseStock,
            status: 'published',
            source_timestamp: timestamp,
            updated_at: timestamp
          };
          if (existingProd) {
            await t('products').where({ id: existingProd.id }).update(prodData);
          } else {
            await t('products').insert(prodData);
          }
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

      // Seed images in kurta_images and product_images
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

      if (await t.schema.hasTable('product_images')) {
        for (const img of imageRows) {
          const existingPImg = await t('product_images').where({
            product_code: code,
            url: img.url
          }).first();
          if (!existingPImg) {
            await t('product_images').insert({
              product_code: code,
              sku: null,
              role: img.role,
              url: img.url,
              alt_text: img.alt_text,
              sort_order: img.sort_order,
              color: img.color,
              created_at: timestamp,
              updated_at: timestamp
            });
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
