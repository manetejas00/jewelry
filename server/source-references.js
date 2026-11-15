import {now} from './db.js';

export const sourceReferenceColumns = [
  'source_pdf', 'source_pdf_path', 'source_page_number', 'source_printed_page_number',
  'source_product_code', 'source_extraction_method', 'source_verification_status',
  'source_original_text', 'source_notes'
];

export function sourceReferenceFromRow(row, owner = {}) {
  if (!row.source_pdf || !row.source_page_number) return null;
  return {
    ...owner,
    source_pdf: row.source_pdf,
    source_pdf_path: row.source_pdf_path || null,
    source_page_number: Number(row.source_page_number),
    source_printed_page_number: row.source_printed_page_number || null,
    source_product_code: row.source_product_code || null,
    source_original_text: row.source_original_text || null,
    source_extraction_method: row.source_extraction_method || 'Text',
    source_verification_status: row.source_verification_status || 'Needs Review',
    source_notes: row.source_notes || null,
    created_at: now(),
    updated_at: now()
  };
}

export async function saveSourceReference(k, row, owner) {
  const reference = sourceReferenceFromRow(row, owner);
  if (!reference) return;
  const existing = await k('product_source_references').where({
    ...owner, source_pdf: reference.source_pdf, source_page_number: reference.source_page_number,
    source_product_code: reference.source_product_code
  }).first();
  if (existing) await k('product_source_references').where({id: existing.id}).update({...reference, created_at: existing.created_at});
  else await k('product_source_references').insert(reference);
}
