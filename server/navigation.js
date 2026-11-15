const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const title = value => String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

async function moduleCategories(db, table, productTable, genders = false) {
  if (!(await db.schema.hasTable(productTable))) return { categories: [], genders: [] };
  const rows = await db(productTable).where({ status: 'published' }).select('category', ...(genders ? ['gender'] : []));
  const categories = [...new Map(rows.filter(r => r.category).map(r => [slugify(r.category), { slug: slugify(r.category), name: r.category }])).values()];
  const genderValues = genders ? [...new Set(rows.map(r => r.gender || 'Not Specified').filter(g => ['Men', 'Women', 'Unisex'].includes(g)))] : [];
  return { categories, genders: genderValues };
}

export async function storefrontNavigation(db) {
  const [jewelry, kurtas, coins] = await Promise.all([
    moduleCategories(db, 'jewelry_categories', 'jewelries', true),
    moduleCategories(db, 'kurta_categories', 'kurtas', true),
    moduleCategories(db, 'coin_categories', 'coins', false)
  ]);
  const coinRows = await db.schema.hasTable('coins') ? await db('coins').where({ status: 'published' }).select('metal') : [];
  const metals = [...new Set(coinRows.map(r => String(r.metal || '').toLowerCase()).filter(Boolean))];
  return [
    { key: 'jewelry', label: 'Jewelry', href: '/jewelry', genders: jewelry.genders, categories: jewelry.categories },
    { key: 'kurta', label: 'Kurta', href: '/kurtas', genders: kurtas.genders, categories: kurtas.categories },
    { key: 'coins', label: 'Coins', href: '/coins', categories: coins.categories, metals: metals.map(m => ({ slug: m, name: `${title(m)} Coins` })) }
  ];
}
