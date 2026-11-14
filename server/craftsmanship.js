import { validationError } from './errors.js';
import { db, now } from './db.js';

export async function listActiveCraftsmanship(k = db) {
  if (!k.schema || !(await k.schema.hasTable('craftsmanship'))) return [];
  return k('craftsmanship').where({ status: 'active' }).orderBy('sort_order', 'asc');
}

export async function craftsmanshipBySlug(k = db, slug) {
  if (!k.schema || !(await k.schema.hasTable('craftsmanship'))) return null;
  return k('craftsmanship').where({ slug }).first();
}

export async function adminListCraftsmanship(k = db) {
  if (!k.schema || !(await k.schema.hasTable('craftsmanship'))) return [];
  const items = await k('craftsmanship').orderBy('sort_order', 'asc');

  const hasJunction = await k.schema.hasTable('product_craftsmanship');
  let countsMap = new Map();
  if (hasJunction) {
    const counts = await k('product_craftsmanship').select('craftsmanship_id').count('* as count').groupBy('craftsmanship_id');
    countsMap = new Map(counts.map(c => [c.craftsmanship_id, c.count]));
  }

  return items.map(c => ({
    ...c,
    product_count: countsMap.get(c.id) || 0
  }));
}

export async function createCraftsmanship(k = db, data) {
  const { name, description, thumbnail, status, sort_order, seo_title, meta_description } = data;
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw validationError('Craftsmanship name is required.');
  }

  const cleanName = String(name).trim();
  let slug = String(data.slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'technique';

  const existing = await k('craftsmanship').where({ slug }).first();
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const timestamp = now();
  const [id] = await k('craftsmanship').insert({
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

export async function updateCraftsmanship(k = db, id, data) {
  const existing = await k('craftsmanship').where({ id }).first();
  if (!existing) throw validationError('Craftsmanship not found', 404);

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
    const duplicate = await k('craftsmanship').where({ slug: cleanSlug }).whereNot({ id }).first();
    if (duplicate) throw validationError(`Craftsmanship slug "${cleanSlug}" is already in use.`);
    patch.slug = cleanSlug;
  }

  await k('craftsmanship').where({ id }).update(patch);
  return k('craftsmanship').where({ id }).first();
}

export async function deleteCraftsmanship(k = db, id) {
  const existing = await k('craftsmanship').where({ id }).first();
  if (!existing) throw validationError('Craftsmanship not found', 404);

  if (await k.schema.hasTable('product_craftsmanship')) {
    const inUse = await k('product_craftsmanship').where({ craftsmanship_id: id }).first();
    if (inUse) {
      throw validationError(`Cannot delete craftsmanship "${existing.name}" because products are linked to it.`);
    }
  }

  await k('craftsmanship').where({ id }).del();
  return { deleted: true, id };
}

export function registerCraftsmanshipRoutes(app, { db, route, auth }) {
  app.get('/api/craftsmanship', route(async (req, res) => {
    res.json(await listActiveCraftsmanship(db));
  }));

  app.get('/api/craftsmanship/:slug', route(async (req, res) => {
    const craft = await craftsmanshipBySlug(db, req.params.slug);
    if (!craft) return res.status(404).json({ error: 'Craftsmanship technique not found' });
    const products = await db('products')
      .join('product_craftsmanship', 'products.id', 'product_craftsmanship.product_id')
      .where('product_craftsmanship.craftsmanship_id', craft.id)
      .where('products.status', 'published')
      .select('products.*')
      .distinct();
    res.json({ craftsmanship: craft, products });
  }));

  app.get('/api/admin/craftsmanship', auth(), route(async (req, res) => {
    res.json(await adminListCraftsmanship(db));
  }));

  app.post('/api/admin/craftsmanship', auth(['owner', 'manager']), route(async (req, res) => {
    res.status(201).json(await createCraftsmanship(db, req.body));
  }));

  app.put('/api/admin/craftsmanship/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await updateCraftsmanship(db, Number(req.params.id), req.body));
  }));

  app.delete('/api/admin/craftsmanship/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await deleteCraftsmanship(db, Number(req.params.id)));
  }));
}

