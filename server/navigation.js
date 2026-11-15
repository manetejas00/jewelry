const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const title = value => String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

async function moduleCategories(db, table, productTable, genders = false) {
  try {
    if (!(await db.schema.hasTable(productTable).catch(() => false))) {
      if (table && (await db.schema.hasTable(table).catch(() => false))) {
        const catRows = await db(table).select('slug', 'name').catch(() => []);
        return { categories: catRows.map(r => ({ slug: r.slug, name: r.name })), genders: [] };
      }
      return { categories: [], genders: [] };
    }

    const hasCategory = await db.schema.hasColumn(productTable, 'category').catch(() => false);
    if (!hasCategory) return { categories: [], genders: [] };

    const hasGender = genders && (await db.schema.hasColumn(productTable, 'gender').catch(() => false));
    const selectCols = ['category'];
    if (hasGender) selectCols.push('gender');

    const query = db(productTable);
    const hasStatus = await db.schema.hasColumn(productTable, 'status').catch(() => false);
    if (hasStatus) query.where({ status: 'published' });

    const rows = await query.select(...selectCols).catch(() => []);
    const categories = [...new Map(rows.filter(r => r.category).map(r => {
      const catName = r.category === 'Chicken Curry Kurtas' ? 'Kurta' : r.category;
      const catSlug = slugify(catName);
      return [catSlug, { slug: catSlug, name: catName }];
    })).values()];
    const genderValues = hasGender ? [...new Set(rows.map(r => r.gender || 'Not Specified').filter(g => ['Men', 'Women', 'Unisex'].includes(g)))] : [];

    if (categories.length === 0 && table && (await db.schema.hasTable(table).catch(() => false))) {
      const catRows = await db(table).select('slug', 'name').catch(() => []);
      return {
        categories: catRows.map(r => ({
          slug: r.slug === 'chicken-curry-kurtas' ? 'kurta' : r.slug,
          name: r.name === 'Chicken Curry Kurtas' ? 'Kurta' : r.name
        })),
        genders: genderValues
      };
    }

    return { categories, genders: genderValues };
  } catch (err) {
    return { categories: [], genders: [] };
  }
}

export async function storefrontNavigation(db) {
  try {
    const [jewelry, kurtas, coins] = await Promise.all([
      moduleCategories(db, 'jewelry_categories', 'jewelries', true),
      moduleCategories(db, 'kurta_categories', 'kurtas', true),
      moduleCategories(db, 'coin_categories', 'coins', false)
    ]);
    let metals = [];
    try {
      const hasCoins = await db.schema.hasTable('coins').catch(() => false);
      if (hasCoins) {
        const coinRows = await db('coins').where({ status: 'published' }).select('metal').catch(() => []);
        metals = [...new Set(coinRows.map(r => String(r.metal || '').toLowerCase()).filter(Boolean))];
      }
    } catch {}

    return [
      { key: 'jewelry', label: 'Jewelry', href: '/jewelry', genders: jewelry.genders, categories: jewelry.categories },
      { key: 'kurta', label: 'Kurta', href: '/kurtas', genders: kurtas.genders, categories: kurtas.categories },
      { key: 'coins', label: 'Coins', href: '/coins', categories: coins.categories, metals: metals.map(m => ({ slug: m, name: `${title(m)} Coins` })) }
    ];
  } catch {
    return [
      { key: 'jewelry', label: 'Jewelry', href: '/jewelry', genders: [], categories: [] },
      { key: 'kurta', label: 'Kurta', href: '/kurtas', genders: [], categories: [] },
      { key: 'coins', label: 'Coins', href: '/coins', categories: [], metals: [] }
    ];
  }
}
