export async function up(k) {
  await k.schema.alterTable('products', t => {
    t.index(['name'], 'idx_products_name');
    t.index(['metal'], 'idx_products_metal');
    t.index(['purity'], 'idx_products_purity');
  });
  if (await k.schema.hasTable('coins')) {
    await k.schema.alterTable('coins', t => {
      t.index(['name'], 'idx_coins_name');
      t.index(['metal'], 'idx_coins_metal');
      t.index(['purity'], 'idx_coins_purity');
      t.index(['weight_g'], 'idx_coins_weight_g');
    });
  }
}

export async function down(k) {
  if (await k.schema.hasTable('coins')) {
    await k.schema.alterTable('coins', t => {
      t.dropIndex(['name'], 'idx_coins_name');
      t.dropIndex(['metal'], 'idx_coins_metal');
      t.dropIndex(['purity'], 'idx_coins_purity');
      t.dropIndex(['weight_g'], 'idx_coins_weight_g');
    });
  }
  await k.schema.alterTable('products', t => {
    t.dropIndex(['name'], 'idx_products_name');
    t.dropIndex(['metal'], 'idx_products_metal');
    t.dropIndex(['purity'], 'idx_products_purity');
  });
}
