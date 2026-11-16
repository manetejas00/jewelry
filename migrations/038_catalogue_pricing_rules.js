/**
 * Jewellery, coins, and kurtas keep independent margin, tax, and rounding.
 * Each catalogue starts from the rule that was active when this migration ran.
 */
export async function up(k) {
  if (!await k.schema.hasTable('pricing_rules')) return;
  if (!await k.schema.hasColumn('pricing_rules', 'catalogue')) {
    await k.schema.alterTable('pricing_rules', t => {
      t.string('catalogue', 16).nullable();
    });
  }
  const latest = await k('pricing_rules').orderBy('id', 'desc').first();
  const stamp = new Date().toISOString();
  for (const catalogue of ['jewelry', 'coin', 'kurta']) {
    const existing = await k('pricing_rules').where({ catalogue }).first();
    if (existing) continue;
    await k('pricing_rules').insert({
      tax_percent: latest?.tax_percent ?? 0,
      rounding: latest?.rounding ?? 1,
      tax_treatment: latest?.tax_treatment || 'exclusive',
      margin_type: latest?.margin_type || 'PERCENT',
      margin_value: latest?.margin_value ?? 0,
      catalogue,
      changed_at: stamp,
      changed_by: null
    });
  }
}

export async function down(k) {
  if (await k.schema.hasTable('pricing_rules') && await k.schema.hasColumn('pricing_rules', 'catalogue')) {
    await k.schema.alterTable('pricing_rules', t => {
      t.dropColumn('catalogue');
    });
  }
}
