import { KURTA_SIZES } from '../Constants/KurtaConstants.js';
import { expandCombinedKurtaVariant, variantMatchesKurtaSize } from '../../../../shared/kurta-sizes.js';
import { listingThumbnail } from '../../../../shared/listing-media.js';
import { matchOffer, priceFixedCataloguePiece } from '../../../pricing.js';

function pricedKurtaVariant(variant, kurta, rule, offer) {
  const base = variant.price ?? variant.fixed_price ?? kurta.price ?? kurta.fixed_price ?? 0;
  const priced = priceFixedCataloguePiece(base, rule, offer);
  const total = priced?.total ?? Number(base || 0);
  return {
    ...variant,
    name: variant.name || kurta.name,
    product_code: variant.product_code || kurta.product_code,
    slug: variant.slug || kurta.slug,
    metal: variant.metal || kurta.fabric,
    purity: variant.purity || kurta.material || 'Handcrafted Lucknowi Chikankari',
    price: total,
    original_price: priced?.original_total ?? null,
    discount_amount: priced?.discount_amount ?? 0,
    checkout_available: Number(variant.stock) > 0 && Number.isFinite(total),
    breakdown: priced
  };
}

export class KurtaResource {
  static toStorefrontCard(kurta, offers = [], ratings = new Map(), rule = null) {
    const offer = matchOffer({...kurta, is_kurta:true}, offers);
    const sourceVariants = kurta.variants || [];
    const pricedVariants = sourceVariants.map(variant => pricedKurtaVariant(variant, kurta, rule, offer));
    const variants = pricedVariants.flatMap(variant => expandCombinedKurtaVariant(variant, { slug: kurta.slug }));
    const images = kurta.images || [];
    const entered = priceFixedCataloguePiece(kurta.price ?? kurta.fixed_price ?? 0, rule, offer);

    let minPrice = entered?.total ?? (kurta.price || kurta.fixed_price || 0);
    let maxPrice = minPrice;
    let totalStock = kurta.stock || 0;
    const availableSizes = [];

    if (pricedVariants.length > 0) {
      minPrice = Math.min(...pricedVariants.map(v => v.price || v.fixed_price || 0));
      maxPrice = Math.max(...pricedVariants.map(v => v.price || v.fixed_price || 0));
      totalStock = pricedVariants.reduce((acc, v) => acc + (v.stock || 0), 0);
      for (const v of variants) {
        if (v.stock > 0 && !availableSizes.includes(v.size)) {
          availableSizes.push(v.size);
        }
      }
    }

    // Color grouping
    const colorMap = new Map();
    for (const v of variants) {
      if (v.color && !colorMap.has(v.color)) {
        const colorImgs = images.filter(img => img.color === v.color);
        const repImg = colorImgs[0]?.url || v.image || kurta.image;
        colorMap.set(v.color, {
          name: v.color,
          code: v.color_code || v.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          hex: v.hex_color || '#d4af37',
          image: repImg,
          price: v.price || kurta.price,
          in_stock: variants.some(item => item.color === v.color && item.stock > 0)
        });
      }
    }

    const sizes = KURTA_SIZES.map(s => {
      const v = variants.find(item => variantMatchesKurtaSize(item.size, s.code));
      return {
        ...s,
        sku: v?.sku,
        stock: v?.stock || 0,
        in_stock: (v?.stock || 0) > 0
      };
    });

    const ratingData = ratings.get(kurta.product_code) || ratings.get(kurta.id) || null;

    return {
      id: kurta.id,
      product_code: kurta.product_code,
      sku: kurta.sku,
      slug: kurta.slug,
      name: kurta.name,
      category: kurta.category || 'Kurtas',
      gender: kurta.gender || 'Not Specified',
      is_kurta: true,
      description: kurta.description,
      fabric: kurta.fabric,
      purity: kurta.material || 'Handcrafted Lucknowi Chikankari',
      metal: kurta.fabric,
      price: minPrice,
      fixed_price: minPrice,
      minPrice,
      maxPrice,
      totalStock,
      stock: totalStock,
      status: kurta.status,
      image: kurta.image,
      thumbnail: listingThumbnail({ image: kurta.image, name: kurta.name }),
      images,
      colors: [...colorMap.values()],
      sizes,
      availableSizes,
      checkout_available: totalStock > 0,
      variants,
      rating_average: ratingData ? ratingData.average : null,
      rating_count: ratingData ? ratingData.count : 0,
      rating: {
        average: ratingData ? ratingData.average : null,
        count: ratingData ? ratingData.count : 0
      }
    };
  }

  static toStorefrontDetail(kurta, offers = [], ratings = new Map(), options = {}, rule = null) {
    const offer = matchOffer({...kurta, is_kurta:true}, offers, options.code);
    const variants = (kurta.variants || [])
      .map(variant => pricedKurtaVariant(variant, kurta, rule, offer))
      .flatMap(variant => expandCombinedKurtaVariant(variant, { slug: kurta.slug }));
    const images = kurta.images || [];
    const distinctImages = images.filter((img, i, all) => all.findIndex(o => o.url === img.url) === i);

    const rep = variants.find(v => v.slug === kurta.slug) ||
                variants.find(v => v.stock > 0) ||
                variants[0] ||
                kurta;

    const colorMap = new Map();
    for (const v of variants) {
      if (v.color && !colorMap.has(v.color)) {
        const colorImgs = distinctImages.filter(img => img.color === v.color);
        colorMap.set(v.color, {
          name: v.color,
          code: v.color_code || v.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          hex: v.hex_color || '#d4af37',
          image: colorImgs[0]?.url || v.image || kurta.image
        });
      }
    }

    const activeColor = options.color || rep.color;
    const activeColorVariants = activeColor
      ? variants.filter(v => v.color === activeColor)
      : variants.slice(0, 7);

    const finalVariants = activeColorVariants.length > 0 ? activeColorVariants : variants.slice(0, 7);
    const ratingData = ratings.get(kurta.product_code) || ratings.get(kurta.id) || null;

    return {
      id: rep.id || kurta.id,
      kurta_id: kurta.id,
      product_code: kurta.product_code,
      sku: rep.sku || kurta.sku,
      slug: kurta.slug,
      name: kurta.name,
      category: kurta.category || 'Kurtas',
      gender: kurta.gender || 'Not Specified',
      is_kurta: true,
      description: kurta.description,
      fabric: kurta.fabric,
      purity: kurta.material || 'Handcrafted Lucknowi Chikankari',
      metal: kurta.fabric,
      price: rep.price || kurta.price,
      fixed_price: rep.fixed_price || kurta.fixed_price,
      stock: rep.stock != null ? rep.stock : kurta.stock,
      image: rep.image || kurta.image,
      thumbnail: listingThumbnail({ image: rep.image || kurta.image, name: kurta.name }),
      images: distinctImages,
      angle_images: distinctImages,
      variants: finalVariants,
      all_variants: variants,
      colors: [...colorMap.values()],
      rating_average: ratingData ? ratingData.average : null,
      rating_count: ratingData ? ratingData.count : 0,
      rating: {
        average: ratingData ? ratingData.average : null,
        count: ratingData ? ratingData.count : 0
      },
      size_chart: KURTA_SIZES,
      checkout_available: (rep.stock != null ? rep.stock : kurta.stock) > 0,
      seo_title: kurta.seo_title || `${kurta.name} | Veyora`,
      meta_description: kurta.meta_description || `${kurta.name} in authentic handcrafted Lucknowi Chikankari.`
    };
  }

  static toAdminItem(kurta) {
    const variants = kurta.variants || [];
    const images = kurta.images || [];

    const sizes = {};
    const stocks = {};
    let totalStock = 0;
    const colorMap = new Map();

    for (const v of variants) {
      totalStock += (v.stock || 0);
      if (v.color && !colorMap.has(v.color)) {
        colorMap.set(v.color, {
          name: v.color,
          code: v.color_code || v.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          hex: v.hex_color || '#e0d8cc'
        });
      }
      if (v.size) {
        sizes[v.size] = {
          id: v.id,
          sku: v.sku,
          slug: v.slug,
          stock: v.stock,
          price: v.price || kurta.price
        };
        stocks[v.size] = v.stock;
      }
    }

    if (variants.length === 0) {
      totalStock = kurta.stock || 0;
    }

    return {
      id: kurta.id,
      product_code: kurta.product_code,
      sku: kurta.sku,
      slug: kurta.slug,
      name: kurta.name,
      category: kurta.category || 'Kurtas',
      description: kurta.description || '',
      fabric: kurta.fabric || 'Pure Mulmul Cotton',
      craftsmanship: kurta.material || 'Handcrafted Lucknowi Chikankari',
      metal: kurta.fabric || 'Pure Mulmul Cotton',
      purity: kurta.material || 'Handcrafted Lucknowi Chikankari',
      price: Number(kurta.price || kurta.fixed_price || 0),
      status: kurta.status,
      image: kurta.image,
      images,
      totalStock,
      sizes,
      stocks,
      variantCount: variants.length,
      colors: [...colorMap.values()],
      seo_title: kurta.seo_title || '',
      meta_description: kurta.meta_description || ''
    };
  }
}
