export class JewelryEntity {
  constructor(data = {}) {
    this.id = data.id || null;
    this.sku = data.sku || '';
    this.product_code = data.product_code || '';
    this.slug = data.slug || '';
    this.name = data.name || '';
    this.category_id = data.category_id || null;
    this.category = data.category || 'Rings';
    this.description = data.description || '';
    this.metal = data.metal || 'Gold';
    this.purity = data.purity || '18K';
    this.gross_weight_g = data.gross_weight_g != null ? Number(data.gross_weight_g) : null;
    this.net_weight_g = data.net_weight_g != null ? Number(data.net_weight_g) : null;
    this.stone_details = data.stone_details || null;
    this.diamond_details = data.diamond_details || null;
    this.gemstone_details = data.gemstone_details || null;
    this.making_charges = data.making_charges != null ? Number(data.making_charges) : 0;
    this.making_percent = data.making_percent != null ? Number(data.making_percent) : 0;
    this.gst = data.gst != null ? Number(data.gst) : 3.00;
    this.base_price = data.base_price != null ? Number(data.base_price) : null;
    this.selling_price = data.selling_price != null ? Number(data.selling_price) : null;
    this.fixed_price = data.fixed_price != null ? Number(data.fixed_price) : null;
    this.pricing_mode = data.pricing_mode || 'GOLD_LINKED';
    this.stone_charge = data.stone_charge != null ? Number(data.stone_charge) : 0;
    this.other_charge = data.other_charge != null ? Number(data.other_charge) : 0;
    this.stock = data.stock != null ? Number(data.stock) : 0;
    this.status = data.status || 'published';
    this.supplier = data.supplier || 'Merchant';
    this.image = data.image || '';
    this.seo_title = data.seo_title || null;
    this.meta_description = data.meta_description || null;
    this.source_timestamp = data.source_timestamp || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.variants = Array.isArray(data.variants) ? data.variants : [];
    this.images = Array.isArray(data.images) ? data.images : [];
  }

  isPublished() {
    return this.status === 'published';
  }

  isInStock() {
    return this.stock > 0;
  }
}

export class JewelryVariantEntity {
  constructor(data = {}) {
    this.id = data.id || null;
    this.jewelry_id = data.jewelry_id || null;
    this.product_code = data.product_code || '';
    this.sku = data.sku || '';
    this.size = data.size || null;
    this.finish = data.finish || null;
    this.metal = data.metal || 'Gold';
    this.purity = data.purity || '18K';
    this.gross_weight_g = data.gross_weight_g != null ? Number(data.gross_weight_g) : null;
    this.net_weight_g = data.net_weight_g != null ? Number(data.net_weight_g) : null;
    this.price = data.price != null ? Number(data.price) : null;
    this.fixed_price = data.fixed_price != null ? Number(data.fixed_price) : null;
    this.stock = data.stock != null ? Number(data.stock) : 0;
    this.image = data.image || null;
    this.status = data.status || 'published';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }
}
