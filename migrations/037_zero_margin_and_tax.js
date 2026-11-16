/**
 * Makes the active pricing rule zero margin and zero tax.
 * Rounding and tax treatment stay as they were.
 */
export async function up(k) {
  if (!await k.schema.hasTable('pricing_rules')) return;
  const current = await k('pricing_rules').orderBy('id', 'desc').first();
  if (current && Number(current.tax_percent) === 0 && Number(current.margin_value || 0) === 0) return;

  const row = {
    tax_percent: 0,
    rounding: current?.rounding ?? 1,
    tax_treatment: current?.tax_treatment || 'exclusive',
    changed_at: new Date().toISOString(),
    changed_by: null
  };
  if (await k.schema.hasColumn('pricing_rules', 'margin_type')) {
    row.margin_type = current?.margin_type || 'PERCENT';
    row.margin_value = 0;
  }
  await k('pricing_rules').insert(row);
}

export async function down() {}
