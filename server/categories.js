import { validationError } from './errors.js';
import { db, now } from './db.js';

export async function listActiveCategories(k = db) {
  if (!k.schema || !(await k.schema.hasTable('categories'))) return [];
  const rows = await k('categories').where({ status: 'active' }).orderBy('sort_order', 'asc');
  return rows.map(r => ({ ...r, banner_url: r.banner || r.banner_url, thumbnail_url: r.thumbnail || r.thumbnail_url }));
}

export async function categoryBySlug(k = db, slug) {
  if (!k.schema || !(await k.schema.hasTable('categories'))) return null;
  const cat = await k('categories').where({ slug }).first();
  if (!cat) return null;
  return { ...cat, banner_url: cat.banner || cat.banner_url, thumbnail_url: cat.thumbnail || cat.thumbnail_url };
}

export async function adminListCategories(k = db) {
  if (!k.schema || !(await k.schema.hasTable('categories'))) return [];
  const categories = await k('categories').orderBy('sort_order', 'asc');
  
  // Count products assigned to each category
  const counts = await k('products').select('category').count('* as count').groupBy('category');
  const countMap = new Map(counts.map(c => [(c.category || '').toLowerCase(), c.count]));

  return categories.map(cat => ({
    ...cat,
    banner_url: cat.banner || cat.banner_url,
    thumbnail_url: cat.thumbnail || cat.thumbnail_url,
    product_count: countMap.get(cat.name.toLowerCase()) || countMap.get(cat.slug.toLowerCase()) || 0
  }));
}

export async function createCategory(k = db, data) {
  const { name, description, thumbnail, banner, status, sort_order, seo_title, meta_description } = data;
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw validationError('Category name is required.');
  }

  const cleanName = String(name).trim();
  let slug = String(data.slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';

  const existing = await k('categories').where({ slug }).first();
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const timestamp = now();
  const [id] = await k('categories').insert({
    slug,
    name: cleanName,
    description: description ? String(description).trim() : null,
    thumbnail: thumbnail ? String(thumbnail).trim() : null,
    banner: banner ? String(banner).trim() : null,
    status: ['active', 'inactive'].includes(status) ? status : 'active',
    sort_order: Number.isInteger(Number(sort_order)) ? Number(sort_order) : 0,
    seo_title: seo_title ? String(seo_title).trim() : null,
    meta_description: meta_description ? String(meta_description).trim() : null,
    created_at: timestamp,
    updated_at: timestamp
  });

  return { id, slug, name: cleanName };
}

export async function updateCategory(k = db, id, data) {
  const existing = await k('categories').where({ id }).first();
  if (!existing) throw validationError('Category not found', 404);

  const patch = { updated_at: now() };
  if (data.name) patch.name = String(data.name).trim();
  if (data.description !== undefined) patch.description = data.description ? String(data.description).trim() : null;
  if (data.thumbnail !== undefined) patch.thumbnail = data.thumbnail ? String(data.thumbnail).trim() : null;
  if (data.banner !== undefined) patch.banner = data.banner ? String(data.banner).trim() : null;
  if (data.status && ['active', 'inactive'].includes(data.status)) patch.status = data.status;
  if (data.sort_order !== undefined) patch.sort_order = parseInt(data.sort_order || 0, 10);
  if (data.seo_title !== undefined) patch.seo_title = data.seo_title ? String(data.seo_title).trim() : null;
  if (data.meta_description !== undefined) patch.meta_description = data.meta_description ? String(data.meta_description).trim() : null;

  if (data.slug && data.slug !== existing.slug) {
    const cleanSlug = String(data.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const duplicate = await k('categories').where({ slug: cleanSlug }).whereNot({ id }).first();
    if (duplicate) throw validationError(`Category slug "${cleanSlug}" is already in use.`);
    patch.slug = cleanSlug;
  }

  await k('categories').where({ id }).update(patch);
  return k('categories').where({ id }).first();
}

export async function deleteCategory(k = db, id) {
  const existing = await k('categories').where({ id }).first();
  if (!existing) throw validationError('Category not found', 404);

  // Check if products belong to this category
  const inUse = await k('products').where({ category: existing.name }).first();
  if (inUse) {
    throw validationError(`Cannot delete category "${existing.name}" because products are currently assigned to it. Reassign or delete those products first.`);
  }

  await k('categories').where({ id }).del();
  return { ok: true };
}
