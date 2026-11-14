import { listingThumbnail } from '../../../../shared/listing-media.js';

export class CoinResource {
  static toStorefrontCard(coin, priceResult = null, rating = null) {
    const price = priceResult?.total ?? coin.fixed_price ?? null;
    const origPrice = priceResult?.original_total ?? null;
    const discount = priceResult?.discount_amount ?? 0;

    return {
      id: coin.id,
      item_type: 'coin',
      sku: coin.sku,
      product_code: coin.sku,
      slug: coin.slug || coin.sku.toLowerCase(),
      name: coin.name,
      metal: coin.metal,
      category: coin.coin_type || (coin.metal === 'Gold' ? 'Gold Coin' : 'Silver Coin'),
      coin_type: coin.coin_type,
      purity: coin.purity,
      weight_g: coin.weight_g,
      dimension: coin.dimension,
      denomination: coin.denomination,
      pricing_mode: coin.pricing_mode,
      price,
      original_price: origPrice,
      discount_amount: discount,
      offer: priceResult?.offer || null,
      breakdown: priceResult || null,
      image: coin.image,
      thumbnail: coin.image,
      image_kind: coin.image_kind,
      images: coin.images || [],
      stock: coin.stock,
      checkout_available: coin.stock > 0 && Number.isFinite(price),
      rating_average: rating?.average || null,
      rating_count: rating?.count || 0,
      rating: {
        average: rating?.average || null,
        count: rating?.count || 0
      },
      url: `/coin/${coin.slug || encodeURIComponent(coin.sku)}`
    };
  }

  static toStorefrontDetail(coin, priceResult = null, rating = null) {
    const card = this.toStorefrontCard(coin, priceResult, rating);
    return {
      ...card,
      mint: coin.mint,
      collection: coin.collection,
      edition: coin.edition,
      year_of_issue: coin.year_of_issue,
      certification: coin.certification,
      making_charge: coin.making_charge,
      description: coin.description || card.name,
      seo_title: coin.seo_title,
      meta_description: coin.meta_description,
      variants: coin.variants || [],
      images: coin.images || []
    };
  }

  static toAdminItem(coin, priceResult = null) {
    return {
      id: coin.id,
      item_type: 'coin',
      sku: coin.sku,
      slug: coin.slug,
      name: coin.name,
      metal: coin.metal,
      coin_type: coin.coin_type,
      category_id: coin.category_id,
      purity: coin.purity,
      weight_g: coin.weight_g,
      dimension: coin.dimension,
      denomination: coin.denomination,
      mint: coin.mint,
      collection: coin.collection,
      edition: coin.edition,
      year_of_issue: coin.year_of_issue,
      certification: coin.certification,
      making_charge: coin.making_charge,
      pricing_mode: coin.pricing_mode,
      fixed_price: coin.fixed_price,
      calculated_price: priceResult?.total ?? coin.fixed_price ?? null,
      breakdown: priceResult,
      stock: coin.stock,
      description: coin.description,
      image: coin.image,
      image_kind: coin.image_kind,
      status: coin.status,
      supplier: coin.supplier,
      seo_title: coin.seo_title,
      meta_description: coin.meta_description,
      images: coin.images || [],
      variants: coin.variants || [],
      source_timestamp: coin.source_timestamp,
      created_at: coin.created_at,
      updated_at: coin.updated_at
    };
  }
}
