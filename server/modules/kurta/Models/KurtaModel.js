export class KurtaModel {
  static table = 'kurtas';

  static async findById(db, id) {
    return db(this.table).where({ id }).first();
  }

  static async findBySku(db, sku) {
    return db(this.table).where({ sku }).first();
  }

  static async findByCode(db, productCode) {
    return db(this.table).where({ product_code: productCode }).first();
  }

  static async findBySlug(db, slug) {
    return db(this.table).where({ slug }).orWhere({ product_code: slug }).first();
  }

  static async listAll(db, filter = {}) {
    let q = db(this.table);
    if (filter.status) q = q.where({ status: filter.status });
    if (filter.category) q = q.where({ category: filter.category });
    if (filter.fabric) q = q.where({ fabric: filter.fabric });
    return q.orderBy('id', 'asc');
  }

  static async listVariantsByKurtaId(db, kurtaId) {
    return db('kurta_variants').where({ kurta_id: kurtaId }).orderBy('id', 'asc');
  }

  static async listVariantsByCode(db, productCode) {
    return db('kurta_variants').where({ product_code: productCode }).orderBy('id', 'asc');
  }

  static async listImagesByKurtaId(db, kurtaId) {
    return db('kurta_images')
      .where({ kurta_id: kurtaId })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
  }

  static async listImagesByCode(db, productCode) {
    return db('kurta_images')
      .where({ product_code: productCode })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
  }

  static async create(db, data) {
    const [id] = await db(this.table).insert(data);
    return id;
  }

  static async updateByCode(db, productCode, patch) {
    return db(this.table).where({ product_code: productCode }).update(patch);
  }

  static async updateBySku(db, sku, patch) {
    return db(this.table).where({ sku }).update(patch);
  }

  static async delete(db, id) {
    return db(this.table).where({ id }).del();
  }

  static async listCategories(db) {
    const hasCatTable = await db.schema.hasTable('kurta_categories').catch(() => false);
    if (hasCatTable) {
      return db('kurta_categories').where({ status: 'active' }).orderBy('sort_order', 'asc');
    }
    return db(this.table).distinct('category').whereNotNull('category');
  }
}
