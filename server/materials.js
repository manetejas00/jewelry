import { validationError } from './errors.js';
import { db, now } from './db.js';

export async function listActiveMaterials(k = db) {
  if (!k.schema || !(await k.schema.hasTable('materials'))) return [];
  return k('materials').where({ status: 'active' }).orderBy('sort_order', 'asc');
}

export async function materialBySlug(k = db, slug) {
  if (!k.schema || !(await k.schema.hasTable('materials'))) return null;
  return k('materials').where({ slug }).first();
}

export async function adminListMaterials(k = db) {
  if (!k.schema || !(await k.schema.hasTable('materials'))) return [];
  const materials = await k('materials').orderBy('sort_order', 'asc');

  // Count products associated with each material
  const hasJunction = await k.schema.hasTable('product_materials');
  let countsMap = new Map();
  if (hasJunction) {
    const counts = await k('product_materials').select('material_id').count('* as count').groupBy('material_id');
    countsMap = new Map(counts.map(c => [c.material_id, c.count]));
  }

  return materials.map(m => ({
    ...m,
    product_count: countsMap.get(m.id) || 0
  }));
}

export async function createMaterial(k = db, data) {
  const { name, description, thumbnail, status, sort_order, seo_title, meta_description } = data;
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw validationError('Material name is required.');
  }

  const cleanName = String(name).trim();
  let slug = String(data.slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'material';

  const existing = await k('materials').where({ slug }).first();
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const timestamp = now();
  const [id] = await k('materials').insert({
    slug,
    name: cleanName,
    description: description ? String(description).trim() : null,
    thumbnail: thumbnail ? String(thumbnail).trim() : null,
    status: ['active', 'inactive'].includes(status) ? status : 'active',
    sort_order: Number.isInteger(Number(sort_order)) ? Number(sort_order) : 0,
    seo_title: seo_title ? String(seo_title).trim() : null,
    meta_description: meta_description ? String(meta_description).trim() : null,
    created_at: timestamp,
    updated_at: timestamp
  });

  return { id, slug, name: cleanName };
}

export async function updateMaterial(k = db, id, data) {
  const existing = await k('materials').where({ id }).first();
  if (!existing) throw validationError('Material not found', 404);

  const patch = { updated_at: now() };
  if (data.name) patch.name = String(data.name).trim();
  if (data.description !== undefined) patch.description = data.description ? String(data.description).trim() : null;
  if (data.thumbnail !== undefined) patch.thumbnail = data.thumbnail ? String(data.thumbnail).trim() : null;
  if (data.status && ['active', 'inactive'].includes(data.status)) patch.status = data.status;
  if (data.sort_order !== undefined) patch.sort_order = parseInt(data.sort_order || 0, 10);
  if (data.seo_title !== undefined) patch.seo_title = data.seo_title ? String(data.seo_title).trim() : null;
  if (data.meta_description !== undefined) patch.meta_description = data.meta_description ? String(data.meta_description).trim() : null;

  if (data.slug && data.slug !== existing.slug) {
    const cleanSlug = String(data.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const duplicate = await k('materials').where({ slug: cleanSlug }).whereNot({ id }).first();
    if (duplicate) throw validationError(`Material slug "${cleanSlug}" is already in use.`);
    patch.slug = cleanSlug;
  }

  await k('materials').where({ id }).update(patch);
  return k('materials').where({ id }).first();
}

export async function deleteMaterial(k = db, id) {
  const existing = await k('materials').where({ id }).first();
  if (!existing) throw validationError('Material not found', 404);

  if (await k.schema.hasTable('product_materials')) {
    const inUse = await k('product_materials').where({ material_id: id }).first();
    if (inUse) {
      throw validationError(`Cannot delete material "${existing.name}" because products are linked to it. Reassign or remove product links first.`);
    }
  }

  await k('materials').where({ id }).del();
  return { deleted: true, id };
}

export function registerMaterialRoutes(app, { db, route, auth }) {
  app.get('/api/materials', route(async (req, res) => {
    res.json(await listActiveMaterials(db));
  }));

  app.get('/api/materials/:slug', route(async (req, res) => {
    const material = await materialBySlug(db, req.params.slug);
    if (!material) return res.status(404).json({ error: 'Material not found' });
    const products = await db('products')
      .join('product_materials', 'products.id', 'product_materials.product_id')
      .where('product_materials.material_id', material.id)
      .where('products.status', 'published')
      .select('products.*')
      .distinct();
    res.json({ material, products });
  }));

  app.get('/api/admin/materials', auth(), route(async (req, res) => {
    res.json(await adminListMaterials(db));
  }));

  app.post('/api/admin/materials', auth(['owner', 'manager']), route(async (req, res) => {
    res.status(201).json(await createMaterial(db, req.body));
  }));

  app.put('/api/admin/materials/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await updateMaterial(db, Number(req.params.id), req.body));
  }));

  app.delete('/api/admin/materials/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await deleteMaterial(db, Number(req.params.id)));
  }));
}

