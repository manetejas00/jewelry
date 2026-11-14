import { JewelryModel } from '../Models/JewelryModel.js';
import { JewelryEntity, JewelryVariantEntity } from '../Entities/JewelryEntity.js';

export class JewelryRepository {
  constructor(db) {
    this.db = db;
  }

  async getById(id) {
    const row = await JewelryModel.findById(this.db, id);
    if (!row) return null;
    const variants = await JewelryModel.listVariantsByJewelryId(this.db, row.id);
    const images = await JewelryModel.listImagesByJewelryId(this.db, row.id);
    return new JewelryEntity({
      ...row,
      variants: variants.map(v => new JewelryVariantEntity(v)),
      images
    });
  }

  async getBySlug(slug) {
    const row = await JewelryModel.findBySlug(this.db, slug);
    if (!row) return null;
    const variants = await JewelryModel.listVariantsByJewelryId(this.db, row.id);
    const images = await JewelryModel.listImagesByJewelryId(this.db, row.id);
    return new JewelryEntity({
      ...row,
      variants: variants.map(v => new JewelryVariantEntity(v)),
      images
    });
  }

  async getBySku(sku) {
    const row = await JewelryModel.findBySku(this.db, sku);
    if (!row) return null;
    const variants = await JewelryModel.listVariantsByJewelryId(this.db, row.id);
    const images = await JewelryModel.listImagesByJewelryId(this.db, row.id);
    return new JewelryEntity({
      ...row,
      variants: variants.map(v => new JewelryVariantEntity(v)),
      images
    });
  }

  async listPublished(filter = {}) {
    const rows = await JewelryModel.listAll(this.db, { ...filter, status: 'published' });
    const hasImages = await this.db.schema.hasTable('jewelry_images').catch(() => false);
    const allImages = hasImages ? await this.db('jewelry_images').orderBy('sort_order', 'asc').orderBy('id', 'asc') : [];

    const imagesByJewelry = new Map();
    for (const img of allImages) {
      const jId = img.jewelry_id;
      if (!imagesByJewelry.has(jId)) imagesByJewelry.set(jId, []);
      imagesByJewelry.get(jId).push(img);
    }

    return rows.map(r => new JewelryEntity({
      ...r,
      images: imagesByJewelry.get(r.id) || (r.image ? [{ id: 'hero', role: 'hero', url: r.image, alt_text: r.name }] : [])
    }));
  }

  async listAdmin(filter = {}) {
    const rows = await JewelryModel.listAll(this.db, filter);
    const hasImages = await this.db.schema.hasTable('jewelry_images').catch(() => false);
    const allImages = hasImages ? await this.db('jewelry_images').orderBy('sort_order', 'asc').orderBy('id', 'asc') : [];

    const imagesByJewelry = new Map();
    for (const img of allImages) {
      const jId = img.jewelry_id;
      if (!imagesByJewelry.has(jId)) imagesByJewelry.set(jId, []);
      imagesByJewelry.get(jId).push(img);
    }

    return rows.map(r => new JewelryEntity({
      ...r,
      images: imagesByJewelry.get(r.id) || (r.image ? [{ id: 'hero', role: 'hero', url: r.image, alt_text: r.name }] : [])
    }));
  }

  async create(data) {
    const id = await JewelryModel.create(this.db, data);
    return this.getById(id);
  }

  async update(id, patch) {
    await JewelryModel.update(this.db, id, patch);
    return this.getById(id);
  }

  async updateBySku(sku, patch) {
    await JewelryModel.updateBySku(this.db, sku, patch);
    return this.getBySku(sku);
  }

  async delete(id) {
    return JewelryModel.delete(this.db, id);
  }

  async deleteBySku(sku) {
    const j = await this.getBySku(sku);
    if (!j) return false;
    await this.db('jewelry_images').where({ jewelry_id: j.id }).del();
    await this.db('jewelry_variants').where({ jewelry_id: j.id }).del();
    await this.db('jewelry_inventory').where({ jewelry_id: j.id }).del();
    await JewelryModel.delete(this.db, j.id);
    return true;
  }

  async getCategories() {
    return JewelryModel.listCategories(this.db);
  }
}
