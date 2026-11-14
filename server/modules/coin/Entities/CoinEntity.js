export class CoinEntity {
  constructor(data = {}) {
    this.id = data.id || null;
    this.sku = data.sku || '';
    this.name = data.name || '';
    this.slug = data.slug || (data.sku ? data.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
    this.metal = data.metal || 'Gold';
    this.coin_type = data.coin_type || (this.metal === 'Gold' ? 'Gold Coin' : 'Silver Coin');
    this.category_id = data.category_id || null;
    this.purity = data.purity || (this.metal === 'Gold' ? '24K' : '999');
    this.weight_g = data.weight_g != null ? Number(data.weight_g) : 1;
    this.dimension = data.dimension || null;
    this.denomination = data.denomination || `${this.weight_g} Gram${this.weight_g > 1 ? 's' : ''}`;
    this.mint = data.mint || data.supplier || 'Veyora Bullion Refinery';
    this.collection = data.collection || null;
    this.edition = data.edition || null;
    this.year_of_issue = data.year_of_issue || null;
    this.certification = data.certification || 'NABL Accredited Assay Card';
    this.making_charge = data.making_charge != null ? Number(data.making_charge) : 0;
    this.pricing_mode = data.pricing_mode || 'METAL_LINKED';
    this.fixed_price = data.fixed_price != null ? Number(data.fixed_price) : null;
    this.stock = data.stock != null ? Number(data.stock) : 0;
    this.description = data.description || '';
    this.image = data.image || '';
    this.image_kind = data.image_kind || 'illustration';
    this.status = data.status || 'published';
    this.supplier = data.supplier || 'Merchant';
    this.seo_title = data.seo_title || `${this.name} | Veyora Bullion`;
    this.meta_description = data.meta_description || this.description;
    this.source_timestamp = data.source_timestamp || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.variants = Array.isArray(data.variants) ? data.variants : [];
    this.images = Array.isArray(data.images) ? data.images : [];
  }

  isGold() {
    return (this.metal || '').toLowerCase() === 'gold';
  }

  isSilver() {
    return (this.metal || '').toLowerCase() === 'silver';
  }
}

export class CoinVariantEntity {
  constructor(data = {}) {
    this.id = data.id || null;
    this.coin_id = data.coin_id || null;
    this.sku = data.sku || '';
    this.name = data.name || '';
    this.weight_g = data.weight_g != null ? Number(data.weight_g) : 0;
    this.purity = data.purity || '24K';
    this.metal = data.metal || 'Gold';
    this.dimension = data.dimension || null;
    this.price = data.price != null ? Number(data.price) : null;
    this.fixed_price = data.fixed_price != null ? Number(data.fixed_price) : null;
    this.stock = data.stock != null ? Number(data.stock) : 0;
    this.status = data.status || 'published';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }
}
