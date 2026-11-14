import { validationError } from '../../../errors.js';
import {
  JEWELRY_METALS,
  JEWELRY_PURITIES,
  JEWELRY_PRICING_MODES,
  JEWELRY_STATUSES
} from '../Constants/JewelryConstants.js';

export class JewelryRequest {
  static validateCreate(body) {
    const { sku, name, metal, purity, pricing_mode, stock, net_weight_g, fixed_price } = body;

    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      throw validationError('SKU is required');
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw validationError('Name is required');
    }

    const cleanMetal = metal || 'Gold';
    if (!JEWELRY_METALS.includes(cleanMetal)) {
      throw validationError(`Metal must be one of: ${JEWELRY_METALS.join(', ')}`);
    }

    const cleanPurity = purity || '18K';
    if (!JEWELRY_PURITIES.includes(cleanPurity)) {
      throw validationError(`Purity must be one of: ${JEWELRY_PURITIES.join(', ')}`);
    }

    const mode = pricing_mode || 'GOLD_LINKED';
    if (!JEWELRY_PRICING_MODES.includes(mode)) {
      throw validationError(`Pricing mode must be one of: ${JEWELRY_PRICING_MODES.join(', ')}`);
    }

    if (mode === 'FIXED') {
      if (fixed_price == null || fixed_price === '' || Number(fixed_price) <= 0) {
        throw validationError('Fixed pricing mode requires a positive fixed_price');
      }
    } else if (mode === 'GOLD_LINKED') {
      if (net_weight_g == null || net_weight_g === '' || Number(net_weight_g) <= 0) {
        throw validationError('Gold-linked pricing requires a positive net_weight_g');
      }
    }

    if (stock != null) {
      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw validationError('Stock must be an integer >= 0');
      }
    }

    if (body.status && !JEWELRY_STATUSES.includes(body.status)) {
      throw validationError(`Status must be one of: ${JEWELRY_STATUSES.join(', ')}`);
    }

    return true;
  }

  static validateUpdate(body) {
    if (body.name !== undefined && (!body.name || typeof body.name !== 'string' || !body.name.trim())) {
      throw validationError('Name cannot be empty');
    }
    if (body.status !== undefined && !JEWELRY_STATUSES.includes(body.status)) {
      throw validationError(`Status must be one of: ${JEWELRY_STATUSES.join(', ')}`);
    }
    if (body.stock !== undefined) {
      const parsedStock = parseInt(body.stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw validationError('Stock must be an integer >= 0');
      }
    }
    return true;
  }
}
