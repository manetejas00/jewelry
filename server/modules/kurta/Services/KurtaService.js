import { KurtaRepository } from '../Repositories/KurtaRepository.js';
import { KurtaResource } from '../Resources/KurtaResource.js';
import { KurtaRequest } from '../Requests/KurtaRequest.js';
import { KurtaMapper } from '../Mappers/KurtaMapper.js';
import { KURTA_CSV_SCHEMA, KURTA_SIZES } from '../Constants/KurtaConstants.js';
import { activeOffers, latestPricingRule } from '../../../pricing.js';
import { getAllProductsRatingSummaries } from '../../../reviews.js';
import { shareRead } from '../../../read-share.js';
import { validationError } from '../../../errors.js';
import { stringify } from 'csv-stringify/sync';

export class KurtaService {
  constructor(db) {
    this.db = db;
    this.repo = new KurtaRepository(db);
  }

  getPublishedCatalogue(options = {}) {
    const key = 'kurta-catalogue:' + (options.category || '') + ':' + (options.code || '') + ':' + (options.color || '');
    return shareRead(this.db, key, () => this.readPublishedCatalogue(options));
  }

  async readPublishedCatalogue(options = {}) {
    const [kurtas, offers, ratings, rule] = await Promise.all([
      this.repo.listPublished(options),
      activeOffers(this.db).catch(() => []),
      this.db.schema.hasTable('reviews').then(has => has ? getAllProductsRatingSummaries(this.db) : new Map()).catch(() => new Map()),
      latestPricingRule(this.db, 'kurta')
    ]);

    return kurtas.map(k => KurtaResource.toStorefrontCard(k, offers, ratings, rule));
  }

  async getPublishedBySlug(slug, options = {}) {
    const kurta = await this.repo.getBySlug(slug);
    if (!kurta || kurta.status !== 'published') return null;

    const [offers, ratings, rule] = await Promise.all([
      activeOffers(this.db).catch(() => []),
      this.db.schema.hasTable('reviews').then(has => has ? getAllProductsRatingSummaries(this.db) : new Map()).catch(() => new Map()),
      latestPricingRule(this.db, 'kurta')
    ]);

    return KurtaResource.toStorefrontDetail(kurta, offers, ratings, options, rule);
  }

  async getByCode(productCode) {
    return this.repo.getByCode(productCode);
  }

  async getBySku(sku) {
    return this.repo.getBySku(sku);
  }

  async getAdminList(filter = {}) {
    const kurtas = await this.repo.listAdmin(filter);
    return kurtas.map(k => KurtaResource.toAdminItem(k));
  }

  async createKurta(payload, staffId = null) {
    KurtaRequest.validateCreate(payload);
    const {
      name,
      product_code,
      description,
      fabric = 'Pure Mulmul Cotton',
      pattern = 'Chikankari Hand Embroidery',
      fit = 'Regular Fit',
      sleeve_type = 'Three-Quarter Sleeves',
      neck_type = 'Mandarin / Round Slit',
      occasion = 'Festive / Traditional',
      gender = 'Women',
      craftsmanship = 'Handcrafted Lucknowi Chikankari',
      price = 3990,
      sale_price = null,
      status = 'published',
      image = '',
      sizes = {},
      seo_title,
      meta_description,
      images = []
    } = payload;

    const cleanCode = String(product_code || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existing = await this.db('kurtas').where({ product_code: cleanCode }).first();
    if (existing) {
      throw validationError(`A kurta with product code "${cleanCode}" already exists.`);
    }

    const skuPrefix = cleanCode.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 15);
    const parentSku = `CCK-${skuPrefix}`;

    // Check SKU collisions
    if (await this.db.schema.hasTable('jewelries') && await this.db('jewelries').where({ sku: parentSku }).first()) {
      throw validationError('This SKU already belongs to jewelry.');
    }
    if (await this.db.schema.hasTable('coins') && await this.db('coins').where({ sku: parentSku }).first()) {
      throw validationError('This SKU already belongs to bullion coins.');
    }

    const nowStr = new Date().toISOString();
    const heroImage = image || (images[0]?.url) || `/assets/products/${cleanCode}/hero.webp`;

    return this.db.transaction(async t => {
      // Calculate total stock from sizes
      let totalStock = 0;
      for (const sizeInfo of KURTA_SIZES) {
        totalStock += Math.max(0, parseInt(sizes[sizeInfo.label] ?? sizes[sizeInfo.code] ?? 10, 10));
      }

      const [kurtaId] = await t('kurtas').insert({
        product_code: cleanCode,
        sku: parentSku,
        slug: cleanCode,
        name: String(name).trim().slice(0, 200),
        category: 'Kurtas',
        description: description ? String(description).trim().slice(0, 5000) : null,
        fabric: String(fabric).trim().slice(0, 100),
        pattern: String(pattern).trim().slice(0, 100),
        fit: String(fit).trim().slice(0, 100),
        sleeve_type: String(sleeve_type).trim().slice(0, 100),
        neck_type: String(neck_type).trim().slice(0, 100),
        occasion: String(occasion).trim().slice(0, 100),
        gender: String(gender).trim().slice(0, 50),
        material: String(craftsmanship).trim().slice(0, 100),
        price: Number(price || 0),
        sale_price: sale_price ? Number(sale_price) : null,
        fixed_price: Number(price || 0),
        stock: totalStock,
        status: status === 'draft' ? 'draft' : 'published',
        image: heroImage,
        seo_title: seo_title || `${name} | Veyora`,
        meta_description: meta_description || `${name} in authentic handcrafted Lucknowi Chikankari.`,
        source_timestamp: nowStr,
        created_at: nowStr,
        updated_at: nowStr
      });

      // Insert variants for each size
      for (const sizeInfo of KURTA_SIZES) {
        const sizeSku = `CCK-${skuPrefix}-${sizeInfo.code}`;
        const sizeSlug = `${cleanCode}-${sizeInfo.code.toLowerCase()}`;
        const sizeStock = Math.max(0, parseInt(sizes[sizeInfo.label] ?? sizes[sizeInfo.code] ?? 10, 10));

        const [varId] = await t('kurta_variants').insert({
          kurta_id: kurtaId,
          product_code: cleanCode,
          sku: sizeSku,
          slug: sizeSlug,
          size: sizeInfo.label,
          finish: 'Hand Embroidered',
          price: Number(price || 0),
          fixed_price: Number(price || 0),
          stock: sizeStock,
          image: heroImage,
          status: status === 'draft' ? 'draft' : 'published',
          created_at: nowStr,
          updated_at: nowStr
        });

        // Log initial inventory
        await t('kurta_inventory').insert({
          kurta_id: kurtaId,
          variant_id: varId,
          sku: sizeSku,
          quantity_change: sizeStock,
          balance_after: sizeStock,
          reason: 'admin_created',
          reference_id: `STAFF-${staffId || 'system'}`,
          created_at: nowStr
        });
      }

      // Insert images
      if (Array.isArray(images) && images.length > 0) {
        let sortOrder = 1;
        for (const img of images) {
          if (!img.url) continue;
          await t('kurta_images').insert({
            kurta_id: kurtaId,
            product_code: cleanCode,
            sku: null,
            role: img.role || 'hero',
            url: img.url,
            alt_text: img.alt_text || `${name} - ${img.role || 'view'}`,
            sort_order: sortOrder++,
            created_at: nowStr,
            updated_at: nowStr
          });
        }
      } else {
        const defaultRoles = ['hero', 'front', 'right', 'left', 'back', 'model', 'detail'];
        let order = 1;
        for (const role of defaultRoles) {
          const fileRole = role === 'detail' ? 'modal' : role;
          await t('kurta_images').insert({
            kurta_id: kurtaId,
            product_code: cleanCode,
            sku: null,
            role,
            url: `/assets/products/${cleanCode}/${fileRole}.webp`,
            alt_text: `${name} ${role.toUpperCase()} View`,
            sort_order: order++,
            created_at: nowStr,
            updated_at: nowStr
          });
        }
      }

      return new KurtaRepository(t).getById(kurtaId);
    });
  }

  async updateKurta(productCode, payload, staffId = null) {
    KurtaRequest.validateUpdate(payload);
    const cleanCode = String(productCode).trim();
    const existing = await this.repo.getByCode(cleanCode);
    if (!existing) throw validationError('Kurta not found', 404);

    const {
      name,
      description,
      fabric,
      craftsmanship,
      pattern,
      fit,
      sleeve_type,
      neck_type,
      occasion,
      gender,
      price,
      sale_price,
      status,
      image,
      sizes,
      stocks,
      seo_title,
      meta_description
    } = payload;
    const sizeMap = sizes || stocks || {};

    const nowStr = new Date().toISOString();
    const patch = { updated_at: nowStr };

    if (name) patch.name = String(name).trim().slice(0, 200);
    if (description !== undefined) patch.description = description ? String(description).trim().slice(0, 5000) : null;
    if (fabric) patch.fabric = String(fabric).trim().slice(0, 100);
    if (pattern) patch.pattern = String(pattern).trim().slice(0, 100);
    if (fit) patch.fit = String(fit).trim().slice(0, 100);
    if (sleeve_type) patch.sleeve_type = String(sleeve_type).trim().slice(0, 100);
    if (neck_type) patch.neck_type = String(neck_type).trim().slice(0, 100);
    if (occasion) patch.occasion = String(occasion).trim().slice(0, 100);
    if (gender) patch.gender = String(gender).trim().slice(0, 50);
    if (craftsmanship) patch.material = String(craftsmanship).trim().slice(0, 100);
    if (price !== undefined && price !== null) {
      patch.price = Number(price);
      patch.fixed_price = Number(price);
    }
    if (sale_price !== undefined) patch.sale_price = sale_price ? Number(sale_price) : null;
    if (status && ['published', 'draft'].includes(status)) patch.status = status;
    if (image) patch.image = String(image).trim();
    if (seo_title !== undefined) patch.seo_title = seo_title ? String(seo_title).trim() : null;
    if (meta_description !== undefined) patch.meta_description = meta_description ? String(meta_description).trim() : null;

    return this.db.transaction(async t => {
      // Update sizes in variants if supplied
      for (const sizeInfo of KURTA_SIZES) {
        const stockVal = sizeMap[sizeInfo.label] ?? sizeMap[sizeInfo.code];
        if (stockVal !== undefined) {
          const parsed = Math.max(0, parseInt(stockVal, 10));
          await t('kurta_variants')
            .where({ kurta_id: existing.id })
            .andWhere(function() {
              this.where({ size: sizeInfo.label }).orWhere('sku', 'like', `%-${sizeInfo.code}`);
            })
            .update({
              stock: parsed,
              price: patch.price !== undefined ? patch.price : existing.price,
              fixed_price: patch.fixed_price !== undefined ? patch.fixed_price : existing.fixed_price,
              status: patch.status !== undefined ? patch.status : existing.status,
              updated_at: nowStr
            });
        }
      }

      // Recompute total stock from variants
      const updatedVariants = await t('kurta_variants').where({ kurta_id: existing.id });
      const newTotalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
      patch.stock = newTotalStock;

      await t('kurtas').where({ id: existing.id }).update(patch);

      return new KurtaRepository(t).getById(existing.id);
    });
  }

  async deleteKurta(productCode) {
    return this.repo.deleteByCode(productCode);
  }

  async deductStock(trx, sku, quantity) {
    const variant = await trx('kurta_variants').where({ sku }).first();
    if (variant) {
      const updated = await trx('kurta_variants')
        .where({ sku })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);
      if (updated !== 1) return false;

      await trx('kurtas')
        .where({ id: variant.kurta_id })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);

      await trx('kurta_inventory').insert({
        kurta_id: variant.kurta_id,
        variant_id: variant.id,
        sku,
        quantity_change: -quantity,
        balance_after: variant.stock - quantity,
        reason: 'order_placed',
        created_at: new Date().toISOString()
      });
      return true;
    }

    const kurta = await trx('kurtas').where({ sku }).first();
    if (kurta) {
      const updated = await trx('kurtas')
        .where({ sku })
        .where('stock', '>=', quantity)
        .decrement('stock', quantity);
      if (updated !== 1) return false;

      await trx('kurta_inventory').insert({
        kurta_id: kurta.id,
        sku,
        quantity_change: -quantity,
        balance_after: kurta.stock - quantity,
        reason: 'order_placed',
        created_at: new Date().toISOString()
      });
      return true;
    }

    return false;
  }

  async restoreStock(trx, sku, quantity, orderId = null) {
    const variant = await trx('kurta_variants').where({ sku }).first();
    if (variant) {
      await trx('kurta_variants').where({ sku }).increment('stock', quantity);
      await trx('kurtas').where({ id: variant.kurta_id }).increment('stock', quantity);
      await trx('kurta_inventory').insert({
        kurta_id: variant.kurta_id,
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

    const kurta = await trx('kurtas').where({ sku }).first();
    if (kurta) {
      await trx('kurtas').where({ sku }).increment('stock', quantity);
      await trx('kurta_inventory').insert({
        kurta_id: kurta.id,
        sku,
        quantity_change: quantity,
        balance_after: kurta.stock + quantity,
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
    const rows = list.map(k => KurtaMapper.toCsvRow(k));
    return stringify(rows, { header: true, columns: KURTA_CSV_SCHEMA, escape_formulas: true });
  }

  async getCategories() {
    return this.repo.getCategories();
  }
}
