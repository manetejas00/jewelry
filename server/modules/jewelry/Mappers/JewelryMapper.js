import { JEWELRY_CSV_SCHEMA } from '../Constants/JewelryConstants.js';

export class JewelryMapper {
  static fromCsvRow(row, sourceTimestamp) {
    return {
      supplier: row.supplier || 'Merchant',
      product_code: row.product_code,
      sku: row.sku,
      name: row.name,
      category: row.category || 'Rings',
      description: row.description || '',
      metal: row.metal || 'Gold',
      purity: row.purity || '18K',
      gross_weight_g: row.gross_weight_g ? Number(row.gross_weight_g) : null,
      net_weight_g: row.net_weight_g ? Number(row.net_weight_g) : null,
      stone_details: row.stone_details || null,
      making_charges: row.making_charges ? Number(row.making_charges) : 0,
      making_percent: row.making_percent ? Number(row.making_percent) : 0,
      gst: row.gst ? Number(row.gst) : 3.00,
      pricing_mode: row.pricing_mode || 'GOLD_LINKED',
      fixed_price: row.fixed_price ? Number(row.fixed_price) : null,
      stock: row.stock ? parseInt(row.stock, 10) : 0,
      status: row.status || 'published',
      image: row.image || '',
      source_timestamp: sourceTimestamp || new Date().toISOString()
    };
  }

  static toCsvRow(jewelry) {
    return {
      supplier: jewelry.supplier || 'Merchant',
      product_code: jewelry.product_code,
      sku: jewelry.sku,
      name: jewelry.name,
      category: jewelry.category,
      description: jewelry.description,
      metal: jewelry.metal,
      purity: jewelry.purity,
      gross_weight_g: jewelry.gross_weight_g ?? '',
      net_weight_g: jewelry.net_weight_g ?? '',
      stone_details: jewelry.stone_details ?? '',
      making_charges: jewelry.making_charges ?? '0',
      making_percent: jewelry.making_percent ?? '0',
      gst: jewelry.gst ?? '3.00',
      pricing_mode: jewelry.pricing_mode ?? 'GOLD_LINKED',
      fixed_price: jewelry.fixed_price ?? '',
      stock: jewelry.stock ?? '0',
      status: jewelry.status ?? 'published',
      image: jewelry.image ?? '',
      source_timestamp: jewelry.source_timestamp ?? new Date().toISOString()
    };
  }
}
