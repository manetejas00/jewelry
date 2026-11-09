export async function up(k) {
  await k.schema.alterTable('pricing_rules', t => {
    t.string('margin_type').notNullable().defaultTo('PERCENT');
    t.decimal('margin_value', 14, 4).notNullable().defaultTo(0);
  });
}
export async function down(k) {
  await k.schema.alterTable('pricing_rules', t => {
    t.dropColumn('margin_type');
    t.dropColumn('margin_value');
  });
}
