import { CoinRepository } from '../Repositories/CoinRepository.js';
import { CoinResource } from '../Resources/CoinResource.js';
import { CoinRequest } from '../Requests/CoinRequest.js';
import { CoinMapper } from '../Mappers/CoinMapper.js';
import { COIN_CSV_SCHEMA } from '../Constants/CoinConstants.js';
import { calculateCoinPrice, activeRates, getSilverRate, activeOffers, matchOffer } from '../../../pricing.js';
import { getAllProductsRatingSummaries } from '../../../reviews.js';
import { validationError } from '../../../errors.js';
import { stringify } from 'csv-stringify/sync';

export class CoinService {
  constructor(db) {
    this.db = db;
    this.repo = new CoinRepository(db);
  }

  async getPublishedCatalogue(options = {}) {
    const [coins, rates, silverRate, rule, offers, ratings] = await Promise.all([
      this.repo.listPublished(options),
      activeRates(this.db),
      getSilverRate(this.db),
      this.db('pricing_rules').orderBy('id', 'desc').first().catch(() => null),
      activeOffers(this.db).catch(() => []),
      this.db.schema.hasTable('reviews').then(has => has ? getAllProductsRatingSummaries(this.db) : new Map()).catch(() => new Map())
    ]);

    return coins.map(c => {
      const offer = matchOffer(c, offers, options.code);
      let priceResult = null;
      try {
        priceResult = calculateCoinPrice(c, rates, silverRate, rule, offer);
      } catch (e) {
        if (c.pricing_mode === 'FIXED' && c.fixed_price != null) {
          priceResult = { total: Number(c.fixed_price), mode: 'FIXED' };
        }
      }
      const rating = ratings.get(c.sku) || ratings.get(c.id) || null;
      return CoinResource.toStorefrontCard(c, priceResult, rating);
    });
  }

  async getPublishedBySlug(slug, options = {}) {
    const coin = await this.repo.getBySlug(slug);
    if (!coin || coin.status !== 'published') return null;

    const [rates, silverRate, rule, offers, ratings] = await Promise.all([
      activeRates(this.db),
      getSilverRate(this.db),
      this.db('pricing_rules').orderBy('id', 'desc').first().catch(() => null),
      activeOffers(this.db).catch(() => []),
      this.db.schema.hasTable('reviews').then(has => has ? getAllProductsRatingSummaries(this.db) : new Map()).catch(() => new Map())
    ]);

    const offer = matchOffer(coin, offers, options.code);
    let priceResult = null;
    try {
      priceResult = calculateCoinPrice(coin, rates, silverRate, rule, offer);
    } catch (e) {
      if (coin.pricing_mode === 'FIXED' && coin.fixed_price != null) {
        priceResult = { total: Number(coin.fixed_price), mode: 'FIXED' };
      }
    }
    const rating = ratings.get(coin.sku) || ratings.get(coin.id) || null;
    return CoinResource.toStorefrontDetail(coin, priceResult, rating);
  }

  async getBySku(sku) {
    return this.repo.getBySku(sku);
  }

  async getAdminList(filter = {}) {
    const coins = await this.repo.listAdmin(filter);
    return coins.map(c => CoinResource.toAdminItem(c));
  }

  async createCoin(body, staffId = null) {
    CoinRequest.validateCreate(body);
    const cleanSku = String(body.sku).trim().toUpperCase();

    // Check SKU uniqueness
    const existing = await this.db('coins').where({ sku: cleanSku }).first();
    if (existing) throw validationError(`A coin with SKU "${cleanSku}" already exists`);

    if (await this.db.schema.hasTable('jewelries') && await this.db('jewelries').where({ sku: cleanSku }).first()) {
      throw validationError('This SKU already belongs to jewelry.');
    }
    if (await this.db.schema.hasTable('kurtas') && await this.db('kurtas').where({ sku: cleanSku }).first()) {
      throw validationError('This SKU already belongs to kurtas.');
    }

    let slug = cleanSku.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'coin';
    if (await this.db('coins').where({ slug }).first()) {
      slug = `${slug}-${Date.now()}`;
    }

    const nowStr = new Date().toISOString();
    const mode = body.pricing_mode === 'FIXED' ? 'FIXED' : 'METAL_LINKED';

    const insertData = {
      supplier: body.supplier || 'Merchant',
      sku: cleanSku,
      slug,
      name: String(body.name).trim().slice(0, 200),
      metal: String(body.metal || 'Gold').trim().slice(0, 50),
      coin_type: String(body.coin_type || `${body.metal || 'Gold'} Coin`).trim().slice(0, 100),
      purity: String(body.purity || '24K').trim().slice(0, 50),
      weight_g: Number(body.weight_g || 0),
      dimension: body.dimension ? String(body.dimension).trim().slice(0, 100) : null,
      denomination: body.denomination ? String(body.denomination).trim().slice(0, 50) : null,
      mint: body.mint ? String(body.mint).trim().slice(0, 100) : 'MMTC-PAMP',
      collection: body.collection ? String(body.collection).trim().slice(0, 100) : null,
      edition: body.edition ? String(body.edition).trim().slice(0, 100) : null,
      year_of_issue: body.year_of_issue ? parseInt(body.year_of_issue, 10) : new Date().getFullYear(),
      certification: body.certification ? String(body.certification).trim().slice(0, 100) : 'NABL Accredited',
      making_charge: Number(body.making_charge || 0),
      pricing_mode: mode,
      fixed_price: mode === 'FIXED' && body.fixed_price ? Number(body.fixed_price) : null,
      stock: Math.max(0, parseInt(body.stock || 0, 10)),
      description: body.description ? String(body.description).trim().slice(0, 5000) : null,
      image: body.image ? String(body.image).trim().slice(0, 2000) : '',
      status: ['published', 'draft'].includes(body.status) ? body.status : 'published',
      image_kind: ['photo', 'illustration'].includes(body.image_kind) ? body.image_kind : 'illustration',
      seo_title: body.seo_title || `${body.name} | Veyora Bullion`,
      meta_description: body.meta_description || body.description,
      source_timestamp: nowStr,
      created_at: nowStr,
      updated_at: nowStr
    };

    return this.db.transaction(async t => {
      const [id] = await t('coins').insert(insertData);

      // Create primary variant
      const [varId] = await t('coin_variants').insert({
        coin_id: id,
        sku: cleanSku,
        slug,
        name: insertData.name,
        metal: insertData.metal,
        purity: insertData.purity,
        weight_g: insertData.weight_g,
        dimension: insertData.dimension,
        price: insertData.fixed_price,
        fixed_price: insertData.fixed_price,
        stock: insertData.stock,
        image: insertData.image,
        status: insertData.status,
        created_at: nowStr,
        updated_at: nowStr
      });

      // Log inventory
      await t('coin_inventory').insert({
        coin_id: id,
        variant_id: varId,
        sku: cleanSku,
        quantity_change: insertData.stock,
        balance_after: insertData.stock,
        reason: 'admin_created',
        reference_id: `STAFF-${staffId || 'system'}`,
        created_at: nowStr
      });

      // Insert hero image
      if (insertData.image) {
        await t('coin_images').insert({
          coin_id: id,
          sku: cleanSku,
          role: 'hero',
          url: insertData.image,
          alt_text: insertData.name,
          sort_order: 1,
          created_at: nowStr,
          updated_at: nowStr
        });
      }

      return new CoinRepository(t).getById(id);
    });
  }

  async updateCoin(sku, body, staffId = null) {
    CoinRequest.validateUpdate(body);
    const existing = await this.repo.getBySku(sku);
    if (!existing) throw validationError('Coin not found', 404);

    const nowStr = new Date().toISOString();
    const patch = { updated_at: nowStr };

    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 200);
    if (body.description !== undefined) patch.description = String(body.description || '').trim().slice(0, 5000);
    if (body.status !== undefined) patch.status = body.status;
    if (body.image !== undefined) patch.image = String(body.image || '').trim().slice(0, 2000);
    if (body.image_kind !== undefined) patch.image_kind = body.image_kind;
    if (body.metal !== undefined) patch.metal = body.metal;
    if (body.purity !== undefined) patch.purity = body.purity;
    if (body.coin_type !== undefined) patch.coin_type = body.coin_type;

    if (body.stock !== undefined) {
      const parsedStock = parseInt(body.stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) throw validationError('Stock must be >= 0');
      patch.stock = parsedStock;
    }

    if (body.weight_g !== undefined) {
      patch.weight_g = Number(body.weight_g || 0);
    }
    if (body.fixed_price !== undefined) {
      patch.fixed_price = body.fixed_price === '' || body.fixed_price == null ? null : Number(body.fixed_price);
    }
    if (body.making_charge !== undefined) {
      patch.making_charge = Number(body.making_charge || 0);
    }

    return this.db.transaction(async t => {
      await t('coins').where({ id: existing.id }).update(patch);

      // Update variant
      await t('coin_variants').where({ coin_id: existing.id, sku: existing.sku }).update({
        price: patch.fixed_price !== undefined ? patch.fixed_price : existing.fixed_price,
        fixed_price: patch.fixed_price !== undefined ? patch.fixed_price : existing.fixed_price,
        stock: patch.stock !== undefined ? patch.stock : existing.stock,
        status: patch.status !== undefined ? patch.status : existing.status,
        image: patch.image !== undefined ? patch.image : existing.image,
        updated_at: nowStr
      });

      // Update hero image if changed
      if (patch.image) {
        const hero = await t('coin_images').where({ coin_id: existing.id, role: 'hero' }).first();
        if (hero) {
          await t('coin_images').where({ id: hero.id }).update({ url: patch.image, updated_at: nowStr });
        } else {
          await t('coin_images').insert({
            coin_id: existing.id,
            sku: existing.sku,
            role: 'hero',
            url: patch.image,
            alt_text: patch.name || existing.name,
            sort_order: 1,
            created_at: nowStr,
            updated_at: nowStr
          });
        }
      }

      return new CoinRepository(t).getById(existing.id);
    });
  }

  async deleteCoin(sku) {
    return this.repo.deleteBySku(sku);
  }

  async deductStock(trx, sku, quantity) {
    const variant = await trx('coin_variants').where({ sku }).first();
    if (variant) {
      const updated = await trx('coin_variants')
        .where({ sku })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);
      if (updated !== 1) return false;

      await trx('coins')
        .where({ id: variant.coin_id })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);

      await trx('coin_inventory').insert({
        coin_id: variant.coin_id,
        variant_id: variant.id,
        sku,
        quantity_change: -quantity,
        balance_after: variant.stock - quantity,
        reason: 'order_placed',
        created_at: new Date().toISOString()
      });
      return true;
    }

    const coin = await trx('coins').where({ sku }).first();
    if (coin) {
      const updated = await trx('coins')
        .where({ sku })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);
      if (updated !== 1) return false;

      await trx('coin_inventory').insert({
        coin_id: coin.id,
        sku,
        quantity_change: -quantity,
        balance_after: coin.stock - quantity,
        reason: 'order_placed',
        created_at: new Date().toISOString()
      });
      return true;
    }

    return false;
  }

  async restoreStock(trx, sku, quantity, orderId = null) {
    const variant = await trx('coin_variants').where({ sku }).first();
    if (variant) {
      await trx('coin_variants').where({ sku }).increment('stock', quantity);
      await trx('coins').where({ id: variant.coin_id }).increment('stock', quantity);
      await trx('coin_inventory').insert({
        coin_id: variant.coin_id,
        variant_id: variant.id,
        sku,
        quantity_change: quantity,
        balance_after: variant.stock + quantity,
        reason: 'order_cancelled',
        reference_id: orderId,
        created_at: new Date().toISOString()
      });
      return true;
    }

    const coin = await trx('coins').where({ sku }).first();
    if (coin) {
      await trx('coins').where({ sku }).increment('stock', quantity);
      await trx('coin_inventory').insert({
        coin_id: coin.id,
        sku,
        quantity_change: quantity,
        balance_after: coin.stock + quantity,
        reason: 'order_cancelled',
        reference_id: orderId,
        created_at: new Date().toISOString()
      });
      return true;
    }

    return false;
  }

  async exportCsv() {
    const list = await this.repo.listAdmin();
    const rows = list.map(c => CoinMapper.toCsvRow(c));
    return stringify(rows, { header: true, columns: COIN_CSV_SCHEMA, escape_formulas: true });
  }

  async getCategories() {
    return this.repo.getCategories();
  }
}
