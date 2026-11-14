import { test } from 'node:test';
import assert from 'node:assert/strict';
import knex from 'knex';
import { listActiveCategories, categoryBySlug, adminListCategories, createCategory, updateCategory, deleteCategory } from '../server/categories.js';

function testDb() {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: 'private/store.sqlite' },
    useNullAsDefault: true
  });
}

test('categories: listActiveCategories returns all active categories ordered by sort_order', async () => {
  const db = testDb();
  try {
    const cats = await listActiveCategories(db);
    assert.ok(Array.isArray(cats));
    assert.ok(cats.length >= 5, 'Expected at least 5 pure jewellery categories');
    
    // Check Earrings category exists
    const earringCat = cats.find(c => c.slug === 'earrings');
    assert.ok(earringCat, 'Expected earrings category to be present');
    assert.equal(earringCat.name, 'Earrings');
    assert.ok(earringCat.banner, 'Expected category banner to be set');
    assert.ok(earringCat.thumbnail, 'Expected category thumbnail to be set');
    assert.equal(earringCat.status, 'active');

    // Ensure sort_order is ascending
    for (let i = 1; i < cats.length; i++) {
      assert.ok(cats[i].sort_order >= cats[i - 1].sort_order, 'Categories must be sorted by sort_order asc');
    }
  } finally {
    await db.destroy();
  }
});

test('categories: categoryBySlug resolves slug with metadata and banner', async () => {
  const db = testDb();
  try {
    const cat = await categoryBySlug(db, 'earrings');
    assert.ok(cat);
    assert.equal(cat.slug, 'earrings');
    assert.ok(cat.description);
    assert.ok(cat.banner_url || cat.banner);
    assert.ok(cat.thumbnail_url || cat.thumbnail);

    const nonExistent = await categoryBySlug(db, 'non-existent-category-slug');
    assert.equal(nonExistent, null);
  } finally {
    await db.destroy();
  }
});

test('categories: adminListCategories computes product counts correctly', async () => {
  const db = testDb();
  try {
    const cats = await adminListCategories(db);
    assert.ok(Array.isArray(cats));
    const earringCat = cats.find(c => c.slug === 'earrings');
    assert.ok(earringCat);
    assert.ok(earringCat.product_count > 0, 'Expected products to be assigned to Earrings');
  } finally {
    await db.destroy();
  }
});

test('categories: admin CRUD lifecycle (create, update, delete)', async () => {
  const db = testDb();
  let createdId = null;
  try {
    // 1. Create
    const newCat = await createCategory(db, {
      name: 'Test Temporary Category',
      slug: 'test-temp-category',
      description: 'A test category for automated test suite',
      thumbnail: '/assets/test-thumb.webp',
      banner: '/assets/test-banner.webp',
      status: 'active',
      sort_order: 99
    });
    assert.ok(newCat.id);
    createdId = newCat.id;
    assert.equal(newCat.name, 'Test Temporary Category');

    // 2. Update
    const updated = await updateCategory(db, createdId, {
      name: 'Updated Test Category',
      status: 'inactive'
    });
    assert.equal(updated.name, 'Updated Test Category');
    assert.equal(updated.status, 'inactive');

    // 3. Verify inactive is excluded from listActiveCategories
    const activeCats = await listActiveCategories(db);
    assert.ok(!activeCats.some(c => c.id === createdId));

    // 4. Delete
    await deleteCategory(db, createdId);
    const deleted = await categoryBySlug(db, 'test-temp-category');
    assert.equal(deleted, null);
    createdId = null;
  } finally {
    if (createdId) {
      await db('categories').where({ id: createdId }).del().catch(() => {});
    }
    await db.destroy();
  }
});
