import { KURTA_CSV_SCHEMA } from '../Constants/KurtaConstants.js';

export class KurtaMapper {
  static fromCsvRow(row, sourceTimestamp) {
    return {
      supplier: row.supplier || 'Lucknow Heritage Maison',
      product_code: row.product_code,
      sku: row.sku,
      name: row.name,
      category: row.category || 'Chicken Curry Kurtas',
      description: row.description || '',
      fabric: row.fabric || 'Pure Mulmul Cotton',
      pattern: row.pattern || 'Chikankari Hand Embroidery',
      fit: row.fit || 'Regular Fit',
      sleeve_type: row.sleeve_type || 'Three-Quarter Sleeves',
      neck_type: row.neck_type || 'Mandarin / Round Slit',
      occasion: row.occasion || 'Festive / Traditional',
      gender: row.gender || 'Women',
      price: row.price ? Number(row.price) : 0,
      sale_price: row.sale_price ? Number(row.sale_price) : null,
      stock: row.stock ? parseInt(row.stock, 10) : 0,
      status: row.status || 'published',
      image: row.image || '',
      source_timestamp: sourceTimestamp || new Date().toISOString()
    };
  }

  static toCsvRow(kurta) {
    return {
      supplier: kurta.supplier || 'Lucknow Heritage Maison',
      product_code: kurta.product_code,
      sku: kurta.sku,
      name: kurta.name,
      category: kurta.category || 'Chicken Curry Kurtas',
      description: kurta.description || '',
      fabric: kurta.fabric || 'Pure Mulmul Cotton',
      pattern: kurta.pattern || 'Chikankari Hand Embroidery',
      fit: kurta.fit || 'Regular Fit',
      sleeve_type: kurta.sleeve_type || 'Three-Quarter Sleeves',
      neck_type: kurta.neck_type || 'Mandarin / Round Slit',
      occasion: kurta.occasion || 'Festive / Traditional',
      gender: kurta.gender || 'Women',
      price: kurta.price ?? '0',
      sale_price: kurta.sale_price ?? '',
      stock: kurta.stock ?? '0',
      status: kurta.status ?? 'published',
      image: kurta.image ?? '',
      source_timestamp: kurta.source_timestamp ?? new Date().toISOString()
    };
  }
}
