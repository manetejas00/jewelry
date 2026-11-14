import { validationError } from './errors.js';
import { db, now } from './db.js';

export async function listActiveCollections(k = db) {
  if (!k.schema || !(await k.schema.hasTable('collections'))) return [];
  return k('collections').where({ status: 'active' }).orderBy('sort_order', 'asc');
}

export async function collectionBySlug(k = db, slug) {
  if (!k.schema || !(await k.schema.hasTable('collections'))) return null;
  return k('collections').where({ slug }).first();
}

export async function adminListCollections(k = db) {
  if (!k.schema || !(await k.schema.hasTable('collections'))) return [];
  const collections = await k('collections').orderBy('sort_order', 'asc');

  const hasJunction = await k.schema.hasTable('product_collections');
  let countsMap = new Map();
  if (hasJunction) {
    const counts = await k('product_collections').select('collection_id').count('* as count').groupBy('collection_id');
    countsMap = new Map(counts.map(c => [c.collection_id, c.count]));
  }

  return collections.map(c => ({
    ...c,
    product_count: countsMap.get(c.id) || 0
  }));
}

export async function createCollection(k = db, data) {
  const { name, description, banner, thumbnail, status, sort_order, seo_title, meta_description } = data;
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw validationError('Collection name is required.');
  }

  const cleanName = String(name).trim();
  let slug = String(data.slug || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'collection';

  const existing = await k('collections').where({ slug }).first();
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const timestamp = now();
  const [id] = await k('collections').insert({
    slug,
    name: cleanName,
    description: description ? String(description).trim() : null,
    banner: banner ? String(banner).trim() : null,
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

export async function updateCollection(k = db, id, data) {
  const existing = await k('collections').where({ id }).first();
  if (!existing) throw validationError('Collection not found', 404);

  const patch = { updated_at: now() };
  if (data.name) patch.name = String(data.name).trim();
  if (data.description !== undefined) patch.description = data.description ? String(data.description).trim() : null;
  if (data.banner !== undefined) patch.banner = data.banner ? String(data.banner).trim() : null;
  if (data.thumbnail !== undefined) patch.thumbnail = data.thumbnail ? String(data.thumbnail).trim() : null;
  if (data.status && ['active', 'inactive'].includes(data.status)) patch.status = data.status;
  if (data.sort_order !== undefined) patch.sort_order = parseInt(data.sort_order || 0, 10);
  if (data.seo_title !== undefined) patch.seo_title = data.seo_title ? String(data.seo_title).trim() : null;
  if (data.meta_description !== undefined) patch.meta_description = data.meta_description ? String(data.meta_description).trim() : null;

  if (data.slug && data.slug !== existing.slug) {
    const cleanSlug = String(data.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const duplicate = await k('collections').where({ slug: cleanSlug }).whereNot({ id }).first();
    if (duplicate) throw validationError(`Collection slug "${cleanSlug}" is already in use.`);
    patch.slug = cleanSlug;
  }

  await k('collections').where({ id }).update(patch);
  return k('collections').where({ id }).first();
}

export async function deleteCollection(k = db, id) {
  const existing = await k('collections').where({ id }).first();
  if (!existing) throw validationError('Collection not found', 404);

  if (await k.schema.hasTable('product_collections')) {
    const inUse = await k('product_collections').where({ collection_id: id }).first();
    if (inUse) {
      throw validationError(`Cannot delete collection "${existing.name}" because products are linked to it.`);
    }
  }

  await k('collections').where({ id }).del();
  return { deleted: true, id };
}

export function registerCollectionRoutes(app, { db, route, auth }) {
  app.get('/api/collections', route(async (req, res) => {
    res.json(await listActiveCollections(db));
  }));

  app.get('/api/collections/:slug', route(async (req, res) => {
    const col = await collectionBySlug(db, req.params.slug);
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    const products = await db('products')
      .join('product_collections', 'products.id', 'product_collections.product_id')
      .where('product_collections.collection_id', col.id)
      .where('products.status', 'published')
      .select('products.*')
      .distinct();
    res.json({ collection: col, products });
  }));

  app.get('/api/admin/collections', auth(), route(async (req, res) => {
    res.json(await adminListCollections(db));
  }));

  app.post('/api/admin/collections', auth(['owner', 'manager']), route(async (req, res) => {
    res.status(201).json(await createCollection(db, req.body));
  }));

  app.put('/api/admin/collections/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await updateCollection(db, Number(req.params.id), req.body));
  }));

  app.delete('/api/admin/collections/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await deleteCollection(db, Number(req.params.id)));
  }));
}

