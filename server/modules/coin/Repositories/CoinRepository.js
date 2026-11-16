import { CoinModel } from '../Models/CoinModel.js';
import { CoinEntity, CoinVariantEntity } from '../Entities/CoinEntity.js';

export class CoinRepository {
  constructor(db) {
    this.db = db;
  }

  async getById(id) {
    const row = await CoinModel.findById(this.db, id);
    if (!row) return null;
    const variants = await CoinModel.listVariantsByCoinId(this.db, row.id);
    const images = await CoinModel.listImagesByCoinId(this.db, row.id);
    return new CoinEntity({
      ...row,
      variants: variants.map(v => new CoinVariantEntity(v)),
      images
    });
  }

  async getBySku(sku) {
    const row = await CoinModel.findBySku(this.db, sku);
    if (!row) return null;
    const variants = await CoinModel.listVariantsByCoinId(this.db, row.id);
    const images = await CoinModel.listImagesByCoinId(this.db, row.id);
    return new CoinEntity({
      ...row,
      variants: variants.map(v => new CoinVariantEntity(v)),
      images
    });
  }

  async getBySlug(slug) {
    const row = await CoinModel.findBySlug(this.db, slug);
    if (!row) return null;
    const variants = await CoinModel.listVariantsByCoinId(this.db, row.id);
    const images = await CoinModel.listImagesByCoinId(this.db, row.id);
    return new CoinEntity({
      ...row,
      variants: variants.map(v => new CoinVariantEntity(v)),
      images
    });
  }

  async listPublished(filter = {}) {
    const rows = await CoinModel.listAll(this.db, { ...filter, status: 'published' });
    const hasImages = await this.db.schema.hasTable('coin_images').catch(() => false);
    const allImages = hasImages ? await this.db('coin_images').orderBy('sort_order', 'asc').orderBy('id', 'asc') : [];

    const imagesByCoin = new Map();
    for (const img of allImages) {
      const cId = img.coin_id;
      if (!imagesByCoin.has(cId)) imagesByCoin.set(cId, []);
      imagesByCoin.get(cId).push(img);
    }

    return rows.map(r => new CoinEntity({
      ...r,
      images: imagesByCoin.get(r.id) || (r.image ? [{ id: 'hero', role: 'hero', url: r.image, alt_text: r.name }] : [])
    }));
  }

  async listAdmin(filter = {}) {
    const rows = await CoinModel.listAll(this.db, filter);
    const hasImages = await this.db.schema.hasTable('coin_images').catch(() => false);
    const allImages = hasImages ? await this.db('coin_images').orderBy('sort_order', 'asc').orderBy('id', 'asc') : [];

    const imagesByCoin = new Map();
    for (const img of allImages) {
      const cId = img.coin_id;
      if (!imagesByCoin.has(cId)) imagesByCoin.set(cId, []);
      imagesByCoin.get(cId).push(img);
    }

    return rows.map(r => new CoinEntity({
      ...r,
      images: imagesByCoin.get(r.id) || (r.image ? [{ id: 'hero', role: 'hero', url: r.image, alt_text: r.name }] : [])
    }));
  }

  async create(data) {
    const id = await CoinModel.create(this.db, data);
    return this.getById(id);
  }

  async updateBySku(sku, patch) {
    await CoinModel.updateBySku(this.db, sku, patch);
    return this.getBySku(sku);
  }

  async deleteBySku(sku) {
    const coin = await this.getBySku(sku);
    if (!coin) return false;
    await this.db('coin_images').where({ coin_id: coin.id }).del();
    if (await this.db.schema.hasTable('product_images')) {
      await this.db('product_images').where({ sku }).orWhere({ product_code: sku }).del();
    }
    await this.db('coin_variants').where({ coin_id: coin.id }).del();
    await this.db('coin_inventory').where({ coin_id: coin.id }).del();
    await CoinModel.delete(this.db, coin.id);
    return true;
  }

  async getCategories() {
    return CoinModel.listCategories(this.db);
  }
}
