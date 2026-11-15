import { validationError } from './errors.js';
import { db, now } from './db.js';

export async function listActiveCategories(k = db) {
  if (!k.schema || !(await k.schema.hasTable('categories'))) return [];
  const rows = await k('categories').where({ status: 'active' }).orderBy('sort_order', 'asc').orderBy('id', 'asc');
  const mapped = new Map(rows.map(row => [row.id, {...row,href:row.route_path||`/collections/${row.slug}`,banner_url:row.banner||row.banner_url,thumbnail_url:row.thumbnail||row.thumbnail_url,children:[]}]));
  const roots=[];
  for(const category of mapped.values()){const parent=category.parent_id&&mapped.get(category.parent_id);if(parent)parent.children.push(category);else roots.push(category);}
  return roots;
}

export async function categoryBySlug(k = db, slug) {
  if (!k.schema || !(await k.schema.hasTable('categories'))) return null;
  const cat = await k('categories').where({ slug }).first();
  if (!cat) return null;
  return { ...cat, href:cat.route_path||`/collections/${cat.slug}`, banner_url: cat.banner || cat.banner_url, thumbnail_url: cat.thumbnail || cat.thumbnail_url };
}

export async function adminListCategories(k = db) {
  if (!k.schema || !(await k.schema.hasTable('categories'))) return [];
  const categories = await k('categories').orderBy('sort_order', 'asc');
  
  // Count products assigned to each category
  const counts = await k('products').select('category').count('* as count').groupBy('category');
  const countMap = new Map(counts.map(c => [(c.category || '').toLowerCase(), c.count]));

  return categories.map(cat => ({
    ...cat, href:cat.route_path||`/collections/${cat.slug}`,
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

  const parentId=await validParentId(k,data.parent_id);
  const timestamp = now();
  const [id] = await k('categories').insert({
    slug,
    parent_id:parentId,
    route_path:cleanRoutePath(data.route_path,slug),
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
  if (data.parent_id !== undefined) patch.parent_id=await validParentId(k,data.parent_id,id);

  if (data.slug && data.slug !== existing.slug) {
    const cleanSlug = String(data.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const duplicate = await k('categories').where({ slug: cleanSlug }).whereNot({ id }).first();
    if (duplicate) throw validationError(`Category slug "${cleanSlug}" is already in use.`);
    patch.slug = cleanSlug;
  }
  if(data.route_path!==undefined||patch.slug)patch.route_path=cleanRoutePath(data.route_path??existing.route_path,patch.slug||existing.slug);

  await k('categories').where({ id }).update(patch);
  return k('categories').where({ id }).first();
}

export async function deleteCategory(k = db, id) {
  const existing = await k('categories').where({ id }).first();
  if (!existing) throw validationError('Category not found', 404);

  // Check if products belong to this category
  const [inUse,hasChildren]=await Promise.all([k('products').where({ category: existing.name }).first(),k('categories').where({parent_id:id}).first()]);
  if (inUse||hasChildren) {
    throw validationError(`Cannot delete category "${existing.name}" because products are currently assigned to it. Reassign or delete those products first.`);
  }

  await k('categories').where({ id }).del();
  return { ok: true };
}

async function validParentId(k,value,selfId=null){if(value===undefined||value===null||value==='')return null;const id=Number(value);if(!Number.isInteger(id)||id<1||id===selfId)throw validationError('Choose a valid parent category.');let parent=await k('categories').where({id}).first();if(!parent)throw validationError('Selected parent category does not exist.');while(parent&&selfId){if(parent.id===selfId)throw validationError('A category cannot be placed inside one of its descendants.');parent=parent.parent_id?await k('categories').where({id:parent.parent_id}).first():null;}return id;}
function cleanRoutePath(value,slug){const route=String(value||`/collections/${slug}`).trim();if(!route.startsWith('/')||route.startsWith('//')||/[?#]/.test(route))throw validationError('Category URL must be a relative path.');return route.replace(/\/+$/,'')||'/';}
