import { validationError } from '../../../errors.js';
import { KURTA_STATUSES } from '../Constants/KurtaConstants.js';

export class KurtaRequest {
  static validateCreate(body = {}) {
    if (!body || typeof body !== 'object') {
      throw validationError('Request body must be a valid JSON object');
    }

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw validationError('Kurta name is required');
    }

    if (body.price !== undefined && body.price !== null && body.price !== '') {
      const price = Number(body.price);
      if (isNaN(price) || price < 0) {
        throw validationError('Price must be a non-negative number');
      }
    }

    if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
      const stock = parseInt(body.stock, 10);
      if (isNaN(stock) || stock < 0) {
        throw validationError('Stock must be a non-negative integer');
      }
    }

    if (body.status && !KURTA_STATUSES.includes(body.status)) {
      throw validationError(`Status must be one of: ${KURTA_STATUSES.join(', ')}`);
    }

    return true;
  }

  static validateUpdate(body = {}) {
    if (!body || typeof body !== 'object') {
      throw validationError('Request body must be a valid JSON object');
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw validationError('Kurta name cannot be empty');
      }
    }

    if (body.price !== undefined && body.price !== null && body.price !== '') {
      const price = Number(body.price);
      if (isNaN(price) || price < 0) {
        throw validationError('Price must be a non-negative number');
      }
    }

    if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
      const stock = parseInt(body.stock, 10);
      if (isNaN(stock) || stock < 0) {
        throw validationError('Stock must be a non-negative integer');
      }
    }

    if (body.status !== undefined && !KURTA_STATUSES.includes(body.status)) {
      throw validationError(`Status must be one of: ${KURTA_STATUSES.join(', ')}`);
    }

    return true;
  }
}
