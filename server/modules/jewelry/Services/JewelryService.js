import { JewelryRepository } from '../Repositories/JewelryRepository.js';
import { JewelryResource } from '../Resources/JewelryResource.js';
import { JewelryRequest } from '../Requests/JewelryRequest.js';
import { JewelryMapper } from '../Mappers/JewelryMapper.js';
import { JEWELRY_CSV_SCHEMA } from '../Constants/JewelryConstants.js';
import { calculatePrice, activeRates, activeOffers, matchOffer, latestPricingRule } from '../../../pricing.js';
import { getAllProductsRatingSummaries } from '../../../reviews.js';
import { shareRead } from '../../../read-share.js';
import { validationError } from '../../../errors.js';
import { catalogSizeForStorage } from '../../../../shared/kurta-sizes.js';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import crypto from 'node:crypto';

export class JewelryService {
  constructor(db) {
    this.db = db;
    this.repo = new JewelryRepository(db);
  }

  getPublishedCatalogue(options = {}) {
    const key = 'jewelry-catalogue:' + (options.category || '') + ':' + (options.code || '');
    return shareRead(this.db, key, () => this.readPublishedCatalogue(options));
  }

  async readPublishedCatalogue(options = {}) {
    const shared = options.shared || null;
    const [jewelries, rates, rule, offers, ratings] = await Promise.all([
      this.repo.listPublished(options),
      shared ? shared.rates : activeRates(this.db),
      shared ? shared.rule : latestPricingRule(this.db, 'jewelry'),
      shared ? shared.offers : activeOffers(this.db).catch(() => []),
      shared ? shared.ratings : this.db.schema.hasTable('reviews').then(has => has ? getAllProductsRatingSummaries(this.db) : new Map()).catch(() => new Map())
    ]);

    return jewelries.map(j => {
      const offer = matchOffer(j, offers, options.code);
      let priceResult = null;
      try {
        priceResult = calculatePrice(j, rates[j.purity], rule, offer);
      } catch (e) {
        if (j.pricing_mode === 'FIXED' && j.fixed_price != null) {
          priceResult = { total: Number(j.fixed_price), mode: 'FIXED' };
        }
      }
      const rating = ratings.get(j.product_code) || ratings.get(j.id) || null;
      return JewelryResource.toStorefrontCard(j, priceResult, rating);
    });
  }

  async getPublishedBySlug(slug, options = {}) {
    const jewelry = await this.repo.getBySlug(slug);
    if (!jewelry || jewelry.status !== 'published') return null;

    const [rates, rule, offers, ratings] = await Promise.all([
      activeRates(this.db),
      latestPricingRule(this.db, 'jewelry'),
      activeOffers(this.db).catch(() => []),
      this.db.schema.hasTable('reviews').then(has => has ? getAllProductsRatingSummaries(this.db) : new Map()).catch(() => new Map())
    ]);

    const offer = matchOffer(jewelry, offers, options.code);
    let priceResult = null;
    try {
      priceResult = calculatePrice(jewelry, rates[jewelry.purity], rule, offer);
    } catch (e) {
      if (jewelry.pricing_mode === 'FIXED' && jewelry.fixed_price != null) {
        priceResult = { total: Number(jewelry.fixed_price), mode: 'FIXED' };
      }
    }
    const rating = ratings.get(jewelry.product_code) || ratings.get(jewelry.id) || null;
    return JewelryResource.toStorefrontDetail(jewelry, priceResult, rating);
  }

  async getBySku(sku) {
    return this.repo.getBySku(sku);
  }

  async getAdminList(filter = {}) {
    const jewelries = await this.repo.listAdmin(filter);
    return jewelries.map(j => JewelryResource.toAdminItem(j));
  }

  async createJewelry(body, staffId = null) {
    JewelryRequest.validateCreate(body);
    const cleanSku = String(body.sku).trim().toUpperCase();

    // Check SKU uniqueness in jewelries and other modules
    const existing = await this.db('jewelries').where({ sku: cleanSku }).first();
    if (existing) throw validationError(`A jewelry piece with SKU "${cleanSku}" already exists`);

    if (await this.db.schema.hasTable('coins') && await this.db('coins').where({ sku: cleanSku }).first()) {
      throw validationError('This SKU already belongs to bullion coins.');
    }
    if (await this.db.schema.hasTable('kurtas') && await this.db('kurtas').where({ sku: cleanSku }).first()) {
      throw validationError('This SKU already belongs to kurtas.');
    }

    const cleanCode = String(body.product_code || cleanSku.toLowerCase()).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    let slug = cleanCode.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';
    if (await this.db('jewelries').where({ slug }).first()) {
      slug = `${slug}-${cleanSku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    }

    const nowStr = new Date().toISOString();
    const mode = body.pricing_mode === 'FIXED' ? 'FIXED' : 'GOLD_LINKED';

    const insertData = {
      product_code: cleanCode,
      slug,
      sku: cleanSku,
      name: String(body.name).trim().slice(0, 200),
      category: String(body.category || 'Rings').trim().slice(0, 100),
      gender: ['Men', 'Women', 'Unisex', 'Not Specified'].includes(body.gender) ? body.gender : 'Not Specified',
      description: body.description ? String(body.description).trim().slice(0, 5000) : null,
      metal: String(body.metal || 'Gold').trim().slice(0, 50),
      purity: String(body.purity || '18K').trim().slice(0, 50),
      net_weight_g: body.net_weight_g != null && body.net_weight_g !== '' ? Number(body.net_weight_g) : null,
      gross_weight_g: body.gross_weight_g != null && body.gross_weight_g !== '' ? Number(body.gross_weight_g) : (body.net_weight_g ? Number(body.net_weight_g) : null),
      stone_details: body.stone_details || null,
      diamond_details: body.diamond_details || null,
      gemstone_details: body.gemstone_details || null,
      making_charges: body.making_charges != null && body.making_charges !== '' ? Number(body.making_charges) : Number(body.making_flat || 0),
      making_percent: body.making_percent != null && body.making_percent !== '' ? Number(body.making_percent) : 0,
      gst: body.gst != null && body.gst !== '' ? Number(body.gst) : 3.00,
      pricing_mode: mode,
      fixed_price: mode === 'FIXED' && body.fixed_price ? Number(body.fixed_price) : null,
      base_price: body.base_price ? Number(body.base_price) : (body.fixed_price ? Number(body.fixed_price) : null),
      selling_price: body.selling_price ? Number(body.selling_price) : (body.fixed_price ? Number(body.fixed_price) : null),
      stone_charge: body.stone_charge ? Number(body.stone_charge) : 0,
      other_charge: body.other_charge ? Number(body.other_charge) : 0,
      stock: Math.max(0, parseInt(body.stock || 0, 10)),
      status: ['published', 'draft'].includes(body.status) ? body.status : 'published',
      image: body.image ? String(body.image).trim().slice(0, 2000) : '',
      seo_title: body.seo_title || `${body.name} | Veyora Jewels`,
      meta_description: body.meta_description || body.description,
      source_timestamp: nowStr,
      created_at: nowStr,
      updated_at: nowStr
    };

    return this.db.transaction(async t => {
      const [id] = await t('jewelries').insert(insertData);

      // Create default primary variant
      const sizeCheck = catalogSizeForStorage(body.size, { kurta: /kurta/i.test(String(body.category || insertData.category || '')) });
      if (sizeCheck.error) throw validationError(sizeCheck.error);
      const [varId] = await t('jewelry_variants').insert({
        jewelry_id: id,
        product_code: cleanCode,
        sku: cleanSku,
        size: sizeCheck.size || 'Standard',
        finish: body.finish || 'Polished',
        metal: insertData.metal,
        purity: insertData.purity,
        gross_weight_g: insertData.gross_weight_g,
        net_weight_g: insertData.net_weight_g,
        price: insertData.fixed_price,
        fixed_price: insertData.fixed_price,
        stock: insertData.stock,
        image: insertData.image,
        status: insertData.status,
        created_at: nowStr,
        updated_at: nowStr
      });

      // Log inventory
      await t('jewelry_inventory').insert({
        jewelry_id: id,
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
        await t('jewelry_images').insert({
          jewelry_id: id,
          product_code: cleanCode,
          sku: cleanSku,
          role: 'hero',
          url: insertData.image,
          alt_text: insertData.name,
          sort_order: 1,
          created_at: nowStr,
          updated_at: nowStr
        });
      }

      return new JewelryRepository(t).getById(id);
    });
  }

  async updateJewelry(sku, body, staffId = null) {
    JewelryRequest.validateUpdate(body);
    const existing = await this.repo.getBySku(sku);
    if (!existing) throw validationError('Jewelry piece not found', 404);

    const nowStr = new Date().toISOString();
    const patch = { updated_at: nowStr };

    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 200);
    if (body.description !== undefined) patch.description = String(body.description || '').trim().slice(0, 5000);
    if (body.status !== undefined) patch.status = body.status;
    if (body.category !== undefined) patch.category = String(body.category).trim().slice(0, 100);
    if (body.gender !== undefined) {
      if (!['Men', 'Women', 'Unisex', 'Not Specified'].includes(body.gender)) throw validationError('Gender must be Men, Women, Unisex, or Not Specified');
      patch.gender = body.gender;
    }
    if (body.image !== undefined) patch.image = String(body.image || '').trim().slice(0, 2000);
    if (body.metal !== undefined) patch.metal = body.metal;
    if (body.purity !== undefined) patch.purity = body.purity;

    if (body.stock !== undefined) {
      const parsedStock = parseInt(body.stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) throw validationError('Stock must be >= 0');
      patch.stock = parsedStock;
    }

    if (body.net_weight_g !== undefined) {
      patch.net_weight_g = body.net_weight_g === '' || body.net_weight_g == null ? null : Number(body.net_weight_g);
    }
    if (body.fixed_price !== undefined) {
      patch.fixed_price = body.fixed_price === '' || body.fixed_price == null ? null : Number(body.fixed_price);
    }
    if (body.making_charges !== undefined) {
      patch.making_charges = Number(body.making_charges || 0);
    }
    if (body.making_flat !== undefined) {
      patch.making_charges = Number(body.making_flat || 0);
    }

    return this.db.transaction(async t => {
      await t('jewelries').where({ id: existing.id }).update(patch);

      // Update primary variant
      await t('jewelry_variants').where({ jewelry_id: existing.id, sku: existing.sku }).update({
        price: patch.fixed_price !== undefined ? patch.fixed_price : existing.fixed_price,
        fixed_price: patch.fixed_price !== undefined ? patch.fixed_price : existing.fixed_price,
        stock: patch.stock !== undefined ? patch.stock : existing.stock,
        status: patch.status !== undefined ? patch.status : existing.status,
        image: patch.image !== undefined ? patch.image : existing.image,
        updated_at: nowStr
      });

      // Update hero image if image changed
      if (patch.image) {
        const hero = await t('jewelry_images').where({ jewelry_id: existing.id, role: 'hero' }).first();
        if (hero) {
          await t('jewelry_images').where({ id: hero.id }).update({ url: patch.image, updated_at: nowStr });
        } else {
          await t('jewelry_images').insert({
            jewelry_id: existing.id,
            product_code: existing.product_code,
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

      return new JewelryRepository(t).getById(existing.id);
    });
  }

  async deleteJewelry(sku) {
    return this.repo.deleteBySku(sku);
  }

  async deductStock(trx, sku, quantity) {
    const variant = await trx('jewelry_variants').where({ sku }).first();
    if (variant) {
      const updated = await trx('jewelry_variants')
        .where({ sku })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);
      if (updated !== 1) return false;

      await trx('jewelries')
        .where({ id: variant.jewelry_id })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);

      await trx('jewelry_inventory').insert({
        jewelry_id: variant.jewelry_id,
        variant_id: variant.id,
        sku,
        quantity_change: -quantity,
        balance_after: variant.stock - quantity,
        reason: 'order_placed',
        created_at: new Date().toISOString()
      });
      return true;
    }

    const jewelry = await trx('jewelries').where({ sku }).first();
    if (jewelry) {
      const updated = await trx('jewelries')
        .where({ sku })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);
      if (updated !== 1) return false;

      await trx('jewelry_inventory').insert({
        jewelry_id: jewelry.id,
        sku,
        quantity_change: -quantity,
        balance_after: jewelry.stock - quantity,
        reason: 'order_placed',
        created_at: new Date().toISOString()
      });
      return true;
    }

    return false;
  }

  async restoreStock(trx, sku, quantity, orderId = null) {
    const variant = await trx('jewelry_variants').where({ sku }).first();
    if (variant) {
      await trx('jewelry_variants').where({ sku }).increment('stock', quantity);
      await trx('jewelries').where({ id: variant.jewelry_id }).increment('stock', quantity);
      await trx('jewelry_inventory').insert({
        jewelry_id: variant.jewelry_id,
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

    const jewelry = await trx('jewelries').where({ sku }).first();
    if (jewelry) {
      await trx('jewelries').where({ sku }).increment('stock', quantity);
      await trx('jewelry_inventory').insert({
        jewelry_id: jewelry.id,
        sku,
        quantity_change: quantity,
        balance_after: jewelry.stock + quantity,
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
    const rows = list.map(j => JewelryMapper.toCsvRow(j));
    return stringify(rows, { header: true, columns: JEWELRY_CSV_SCHEMA, escape_formulas: true });
  }

  async getCategories() {
    return this.repo.getCategories();
  }
}
