export async function up(k) {
  const hasColor = await k.schema.hasColumn('products', 'color');
  if (!hasColor) {
    await k.schema.table('products', t => {
      t.string('color').nullable().index();
      t.string('color_code').nullable();
      t.string('hex_color').nullable();
    });
  }

  const hasImgColor = await k.schema.hasColumn('product_images', 'color');
  if (!hasImgColor) {
    await k.schema.table('product_images', t => {
      t.string('color').nullable().index();
    });
  }
}

export async function down(k) {
  const hasColor = await k.schema.hasColumn('products', 'color');
  if (hasColor) {
    await k.schema.table('products', t => {
      t.dropColumn('color');
      t.dropColumn('color_code');
      t.dropColumn('hex_color');
    });
  }

  const hasImgColor = await k.schema.hasColumn('product_images', 'color');
  if (hasImgColor) {
    await k.schema.table('product_images', t => {
      t.dropColumn('color');
    });
  }
}
