export class CoinModel {
  static table = 'coins';
  static variantsTable = 'coin_variants';
  static imagesTable = 'coin_images';
  static categoriesTable = 'coin_categories';
  static inventoryTable = 'coin_inventory';
  static attributesTable = 'coin_attributes';
  static attributeValuesTable = 'coin_attribute_values';

  static async findById(k, id) {
    return k(this.table).where({ id }).first();
  }

  static async findBySku(k, sku) {
    const direct = await k(this.table).where({ sku }).first();
    if (direct) return direct;
    const variant = await k(this.variantsTable).where({ sku }).first();
    if (variant) return k(this.table).where({ id: variant.coin_id }).first();
    return null;
  }

  static async findBySlug(k, slug) {
    const bySlug = await k(this.table).where({ slug }).first();
    if (bySlug) return bySlug;
    return k(this.table).whereRaw('LOWER(sku) = ?', [slug.toLowerCase()]).first();
  }

  static async listAll(k, filter = {}) {
    let q = k(this.table);
    if (filter.status) q = q.where({ status: filter.status });
    if (filter.metal) q = q.where({ metal: filter.metal });
    if (filter.coin_type) q = q.where({ coin_type: filter.coin_type });
    return q.orderBy('id', 'desc');
  }

  static async listVariantsByCoinId(k, coin_id) {
    return k(this.variantsTable).where({ coin_id }).orderBy('id', 'asc');
  }

  static async listImagesByCoinId(k, coin_id) {
    return k(this.imagesTable).where({ coin_id }).orderBy('sort_order', 'asc').orderBy('id', 'asc');
  }

  static async create(k, data) {
    const [id] = await k(this.table).insert(data);
    return id;
  }

  static async update(k, id, data) {
    return k(this.table).where({ id }).update(data);
  }

  static async updateBySku(k, sku, data) {
    return k(this.table).where({ sku }).update(data);
  }

  static async delete(k, id) {
    return k(this.table).where({ id }).del();
  }

  static async deleteBySku(k, sku) {
    return k(this.table).where({ sku }).del();
  }

  static async listCategories(k, status = 'active') {
    let q = k(this.categoriesTable);
    if (status) q = q.where({ status });
    return q.orderBy('sort_order', 'asc').orderBy('name', 'asc');
  }

  static async logInventory(k, entry) {
    return k(this.inventoryTable).insert(entry);
  }
}
