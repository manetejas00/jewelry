import { validationError } from '../../../errors.js';
import {
  COIN_METALS,
  COIN_PURITIES,
  COIN_PRICING_MODES,
  COIN_STATUSES
} from '../Constants/CoinConstants.js';
import { catalogSizeForStorage } from '../../../../shared/kurta-sizes.js';

function checkedDimension(body) {
  if (body.dimension == null || body.dimension === '') return;
  const checked = catalogSizeForStorage(body.dimension, { kurta: false });
  if (checked.error) throw validationError(checked.error);
}

export class CoinRequest {
  static validateCreate(body) {
    const { sku, name, metal, weight_g, pricing_mode, fixed_price, stock } = body;

    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      throw validationError('SKU is required');
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw validationError('Name is required');
    }
    if (!metal || !COIN_METALS.includes(metal)) {
      throw validationError(`Metal must be one of: ${COIN_METALS.join(', ')}`);
    }
    if (weight_g == null || weight_g === '' || Number(weight_g) <= 0) {
      throw validationError('Positive weight in grams is required');
    }

    const mode = pricing_mode || 'METAL_LINKED';
    if (!COIN_PRICING_MODES.includes(mode)) {
      throw validationError(`Pricing mode must be one of: ${COIN_PRICING_MODES.join(', ')}`);
    }
    if (mode === 'FIXED') {
      if (fixed_price == null || fixed_price === '' || Number(fixed_price) <= 0) {
        throw validationError('Fixed price mode requires a positive fixed_price');
      }
    }

    if (stock != null) {
      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw validationError('Stock must be an integer >= 0');
      }
    }

    if (body.status && !COIN_STATUSES.includes(body.status)) {
      throw validationError(`Status must be one of: ${COIN_STATUSES.join(', ')}`);
    }

    checkedDimension(body);
    return true;
  }

  static validateUpdate(body) {
    if (body.name !== undefined && (!body.name || typeof body.name !== 'string' || !body.name.trim())) {
      throw validationError('Name cannot be empty');
    }
    if (body.metal !== undefined && !COIN_METALS.includes(body.metal)) {
      throw validationError(`Metal must be one of: ${COIN_METALS.join(', ')}`);
    }
    if (body.weight_g !== undefined && (body.weight_g == null || Number(body.weight_g) <= 0)) {
      throw validationError('Weight must be positive');
    }
    if (body.status !== undefined && !COIN_STATUSES.includes(body.status)) {
      throw validationError(`Status must be one of: ${COIN_STATUSES.join(', ')}`);
    }
    if (body.stock !== undefined) {
      const parsedStock = parseInt(body.stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw validationError('Stock must be an integer >= 0');
      }
    }
    checkedDimension(body);
    return true;
  }
}
