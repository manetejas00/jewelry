export class JewelryModel {
  static table = 'jewelries';
  static variantsTable = 'jewelry_variants';
  static imagesTable = 'jewelry_images';
  static categoriesTable = 'jewelry_categories';
  static inventoryTable = 'jewelry_inventory';
  static attributesTable = 'jewelry_attributes';
  static attributeValuesTable = 'jewelry_attribute_values';

  static async findById(k, id) {
    return k(this.table).where({ id }).first();
  }

  static async findBySlug(k, slug) {
    return k(this.table).where({ slug }).first();
  }

  static async findBySku(k, sku) {
    const direct = await k(this.table).where({ sku }).first();
    if (direct) return direct;
    const variant = await k(this.variantsTable).where({ sku }).first();
    if (variant) return k(this.table).where({ id: variant.jewelry_id }).first();
    return null;
  }

  static async findByProductCode(k, product_code) {
    return k(this.table).where({ product_code }).first();
  }

  static async listAll(k, filter = {}) {
    let q = k(this.table);
    if (filter.status) q = q.where({ status: filter.status });
    if (filter.category) q = q.where({ category: filter.category });
    if (filter.metal) q = q.where({ metal: filter.metal });
    return q.orderBy('id', 'asc');
  }

  static async listVariantsByJewelryId(k, jewelry_id) {
    return k(this.variantsTable).where({ jewelry_id }).orderBy('id', 'asc');
  }

  static async listVariantsByProductCode(k, product_code) {
    return k(this.variantsTable).where({ product_code }).orderBy('id', 'asc');
  }

  static async listImagesByJewelryId(k, jewelry_id) {
    return k(this.imagesTable)
      .where({ jewelry_id })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
  }

  static async listImagesByProductCode(k, product_code) {
    return k(this.imagesTable)
      .where({ product_code })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
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

  static async findCategoryBySlug(k, slug) {
    return k(this.categoriesTable).where({ slug }).first();
  }

  static async logInventory(k, entry) {
    return k(this.inventoryTable).insert(entry);
  }
}
