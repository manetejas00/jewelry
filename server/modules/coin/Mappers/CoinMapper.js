import { COIN_CSV_SCHEMA } from '../Constants/CoinConstants.js';

export class CoinMapper {
  static fromCsvRow(row, sourceTimestamp) {
    return {
      sku: row.sku,
      name: row.name,
      metal: row.metal || 'Gold',
      coin_type: row.coin_type || 'Gold Coin',
      purity: row.purity || '24K',
      weight_g: row.weight_g ? Number(row.weight_g) : 0,
      dimension: row.dimension || null,
      making_charge: row.making_charge ? Number(row.making_charge) : 0,
      pricing_mode: row.pricing_mode || 'METAL_LINKED',
      fixed_price: row.fixed_price ? Number(row.fixed_price) : null,
      stock: row.stock ? parseInt(row.stock, 10) : 0,
      description: row.description || '',
      image: row.image || '',
      status: row.status || 'published',
      image_kind: row.image_kind || 'illustration',
      source_timestamp: sourceTimestamp || new Date().toISOString()
    };
  }

  static toCsvRow(coin) {
    return {
      sku: coin.sku,
      name: coin.name,
      metal: coin.metal,
      coin_type: coin.coin_type,
      purity: coin.purity,
      weight_g: coin.weight_g ?? '0',
      dimension: coin.dimension ?? '',
      making_charge: coin.making_charge ?? '0',
      pricing_mode: coin.pricing_mode ?? 'METAL_LINKED',
      fixed_price: coin.fixed_price ?? '',
      stock: coin.stock ?? '0',
      description: coin.description ?? '',
      image: coin.image ?? '',
      status: coin.status ?? 'published',
      image_kind: coin.image_kind ?? 'illustration',
      source_timestamp: coin.source_timestamp ?? new Date().toISOString()
    };
  }
}
