import { KurtaModel } from '../Models/KurtaModel.js';
import { KurtaEntity, KurtaVariantEntity } from '../Entities/KurtaEntity.js';

export class KurtaRepository {
  constructor(db) {
    this.db = db;
  }

  async getById(id) {
    const row = await KurtaModel.findById(this.db, id);
    if (!row) return null;
    const variants = await KurtaModel.listVariantsByKurtaId(this.db, row.id);
    const images = await KurtaModel.listImagesByKurtaId(this.db, row.id);
    return new KurtaEntity({
      ...row,
      variants: variants.map(v => new KurtaVariantEntity(v)),
      images
    });
  }

  async getByCode(productCode) {
    const row = await KurtaModel.findByCode(this.db, productCode);
    if (!row) return null;
    const variants = await KurtaModel.listVariantsByCode(this.db, row.product_code);
    const images = await KurtaModel.listImagesByCode(this.db, row.product_code);
    return new KurtaEntity({
      ...row,
      variants: variants.map(v => new KurtaVariantEntity(v)),
      images
    });
  }

  async getBySku(sku) {
    const row = await KurtaModel.findBySku(this.db, sku);
    if (row) {
      const variants = await KurtaModel.listVariantsByKurtaId(this.db, row.id);
      const images = await KurtaModel.listImagesByKurtaId(this.db, row.id);
      return new KurtaEntity({
        ...row,
        variants: variants.map(v => new KurtaVariantEntity(v)),
        images
      });
    }

    // Check if sku is in variants
    const variant = await this.db('kurta_variants').where({ sku }).first();
    if (variant) {
      return this.getById(variant.kurta_id);
    }
    return null;
  }

  async getBySlug(slug) {
    const row = await KurtaModel.findBySlug(this.db, slug);
    if (row) {
      const variants = await KurtaModel.listVariantsByKurtaId(this.db, row.id);
      const images = await KurtaModel.listImagesByKurtaId(this.db, row.id);
      return new KurtaEntity({
        ...row,
        variants: variants.map(v => new KurtaVariantEntity(v)),
        images
      });
    }

    // Check if slug belongs to variant
    const variant = await this.db('kurta_variants').where({ slug }).first();
    if (variant) {
      return this.getById(variant.kurta_id);
    }
    return null;
  }

  async listPublished(filter = {}) {
    const rows = await KurtaModel.listAll(this.db, { ...filter, status: 'published' });
    const hasImages = await this.db.schema.hasTable('kurta_images').catch(() => false);
    const hasVariants = await this.db.schema.hasTable('kurta_variants').catch(() => false);

    const allImages = hasImages ? await this.db('kurta_images').orderBy('sort_order', 'asc').orderBy('id', 'asc') : [];
    const allVariants = hasVariants ? await this.db('kurta_variants').where({ status: 'published' }).orderBy('id', 'asc') : [];

    const imagesByCode = new Map();
    for (const img of allImages) {
      const code = img.product_code;
      if (!code) continue;
      if (!imagesByCode.has(code)) imagesByCode.set(code, []);
      imagesByCode.get(code).push(img);
    }

    const variantsByCode = new Map();
    for (const v of allVariants) {
      const code = v.product_code;
      if (!code) continue;
      if (!variantsByCode.has(code)) variantsByCode.set(code, []);
      variantsByCode.get(code).push(new KurtaVariantEntity(v));
    }

    return rows.map(r => new KurtaEntity({
      ...r,
      variants: variantsByCode.get(r.product_code) || [],
      images: imagesByCode.get(r.product_code) || (r.image ? [{ id: 'hero', role: 'hero', url: r.image, alt_text: r.name }] : [])
    }));
  }

  async listAdmin(filter = {}) {
    const rows = await KurtaModel.listAll(this.db, filter);
    const hasImages = await this.db.schema.hasTable('kurta_images').catch(() => false);
    const hasVariants = await this.db.schema.hasTable('kurta_variants').catch(() => false);

    const allImages = hasImages ? await this.db('kurta_images').orderBy('sort_order', 'asc').orderBy('id', 'asc') : [];
    const allVariants = hasVariants ? await this.db('kurta_variants').orderBy('id', 'asc') : [];

    const imagesByCode = new Map();
    for (const img of allImages) {
      const code = img.product_code;
      if (!code) continue;
      if (!imagesByCode.has(code)) imagesByCode.set(code, []);
      imagesByCode.get(code).push(img);
    }

    const variantsByCode = new Map();
    for (const v of allVariants) {
      const code = v.product_code;
      if (!code) continue;
      if (!variantsByCode.has(code)) variantsByCode.set(code, []);
      variantsByCode.get(code).push(new KurtaVariantEntity(v));
    }

    return rows.map(r => new KurtaEntity({
      ...r,
      variants: variantsByCode.get(r.product_code) || [],
      images: imagesByCode.get(r.product_code) || (r.image ? [{ id: 'hero', role: 'hero', url: r.image, alt_text: r.name }] : [])
    }));
  }

  async deleteByCode(productCode) {
    const kurta = await this.getByCode(productCode);
    if (!kurta) return false;
    await this.db('kurta_images').where({ product_code: productCode }).del();
    await this.db('kurta_variants').where({ product_code: productCode }).del();
    await this.db('kurta_inventory').where({ kurta_id: kurta.id }).del();
    await KurtaModel.delete(this.db, kurta.id);
    return true;
  }

  async getCategories() {
    return KurtaModel.listCategories(this.db);
  }
}
