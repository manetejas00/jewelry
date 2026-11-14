import { listingThumbnail } from '../../../../shared/listing-media.js';

export class JewelryResource {
  static toStorefrontCard(jewelry, priceResult = null, rating = null) {
    const price = priceResult?.total ?? jewelry.fixed_price ?? null;
    const origPrice = priceResult?.original_total ?? null;
    const discount = priceResult?.discount_amount ?? 0;

    return {
      id: jewelry.id,
      item_type: 'jewelry',
      sku: jewelry.sku,
      product_code: jewelry.product_code,
      slug: jewelry.slug,
      name: jewelry.name,
      category: jewelry.category,
      category_id: jewelry.category_id,
      metal: jewelry.metal,
      purity: jewelry.purity,
      net_weight_g: jewelry.net_weight_g,
      description: jewelry.description,
      pricing_mode: jewelry.pricing_mode,
      price,
      original_price: origPrice,
      discount_amount: discount,
      offer: priceResult?.offer || null,
      breakdown: priceResult || null,
      image: jewelry.image,
      thumbnail: jewelry.image,
      images: jewelry.images || [],
      stock: jewelry.stock,
      checkout_available: jewelry.stock > 0 && Number.isFinite(price),
      rating_average: rating?.average || null,
      rating_count: rating?.count || 0,
      rating: {
        average: rating?.average || null,
        count: rating?.count || 0
      },
      url: `/jewelry/${jewelry.slug}`
    };
  }

  static toStorefrontDetail(jewelry, priceResult = null, rating = null) {
    const card = this.toStorefrontCard(jewelry, priceResult, rating);
    return {
      ...card,
      gross_weight_g: jewelry.gross_weight_g,
      stone_details: jewelry.stone_details,
      diamond_details: jewelry.diamond_details,
      gemstone_details: jewelry.gemstone_details,
      making_charges: jewelry.making_charges,
      making_percent: jewelry.making_percent,
      gst: jewelry.gst,
      stone_charge: jewelry.stone_charge,
      other_charge: jewelry.other_charge,
      supplier: jewelry.supplier,
      seo_title: jewelry.seo_title,
      meta_description: jewelry.meta_description,
      variants: jewelry.variants || [],
      images: jewelry.images || []
    };
  }

  static toAdminItem(jewelry) {
    return {
      id: jewelry.id,
      item_type: 'jewelry',
      sku: jewelry.sku,
      product_code: jewelry.product_code,
      slug: jewelry.slug,
      name: jewelry.name,
      category: jewelry.category,
      category_id: jewelry.category_id,
      metal: jewelry.metal,
      purity: jewelry.purity,
      gross_weight_g: jewelry.gross_weight_g,
      net_weight_g: jewelry.net_weight_g,
      stone_details: jewelry.stone_details,
      diamond_details: jewelry.diamond_details,
      gemstone_details: jewelry.gemstone_details,
      making_charges: jewelry.making_charges,
      making_percent: jewelry.making_percent,
      gst: jewelry.gst,
      pricing_mode: jewelry.pricing_mode,
      fixed_price: jewelry.fixed_price,
      base_price: jewelry.base_price,
      selling_price: jewelry.selling_price,
      stone_charge: jewelry.stone_charge,
      other_charge: jewelry.other_charge,
      stock: jewelry.stock,
      status: jewelry.status,
      supplier: jewelry.supplier,
      image: jewelry.image,
      seo_title: jewelry.seo_title,
      meta_description: jewelry.meta_description,
      images: jewelry.images || [],
      variants: jewelry.variants || [],
      source_timestamp: jewelry.source_timestamp,
      created_at: jewelry.created_at,
      updated_at: jewelry.updated_at
    };
  }
}
