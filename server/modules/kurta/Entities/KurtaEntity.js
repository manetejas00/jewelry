export class KurtaVariantEntity {
  constructor(data = {}) {
    this.id = data.id;
    this.kurta_id = data.kurta_id;
    this.product_code = data.product_code;
    this.sku = data.sku;
    this.slug = data.slug;
    this.size = data.size;
    this.color = data.color || null;
    this.color_code = data.color_code || null;
    this.hex_color = data.hex_color || null;
    this.finish = data.finish || null;
    this.price = data.price != null ? Number(data.price) : null;
    this.fixed_price = data.fixed_price != null ? Number(data.fixed_price) : null;
    this.stock = Number(data.stock || 0);
    this.image = data.image || null;
    this.status = data.status || 'published';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}

export class KurtaEntity {
  constructor(data = {}) {
    this.id = data.id;
    this.sku = data.sku;
    this.product_code = data.product_code;
    this.slug = data.slug;
    this.name = data.name;
    this.category_id = data.category_id || null;
    this.category = data.category || 'Chicken Curry Kurtas';
    this.description = data.description || '';
    this.fabric = data.fabric || 'Pure Mulmul Cotton';
    this.pattern = data.pattern || 'Chikankari Hand Embroidery';
    this.fit = data.fit || 'Regular Fit';
    this.sleeve_type = data.sleeve_type || 'Three-Quarter Sleeves';
    this.neck_type = data.neck_type || 'Mandarin / Round Slit';
    this.occasion = data.occasion || 'Festive / Traditional';
    this.gender = data.gender || 'Women';
    this.available_sizes = data.available_sizes || null;
    this.available_colors = data.available_colors || null;
    this.material = data.material || 'Cotton';
    this.price = data.price != null ? Number(data.price) : null;
    this.sale_price = data.sale_price != null ? Number(data.sale_price) : null;
    this.fixed_price = data.fixed_price != null ? Number(data.fixed_price) : null;
    this.stock = Number(data.stock || 0);
    this.status = data.status || 'published';
    this.supplier = data.supplier || 'Lucknow Heritage Maison';
    this.image = data.image || '';
    this.seo_title = data.seo_title || null;
    this.meta_description = data.meta_description || null;
    this.source_timestamp = data.source_timestamp;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    this.variants = Array.isArray(data.variants)
      ? data.variants.map(v => (v instanceof KurtaVariantEntity ? v : new KurtaVariantEntity(v)))
      : [];

    this.images = Array.isArray(data.images) ? data.images : [];
  }

  isPublished() {
    return this.status === 'published';
  }

  inStock() {
    return this.stock > 0 || this.variants.some(v => v.stock > 0);
  }
}
