import { test } from 'node:test';
import assert from 'node:assert/strict';
import knex from 'knex';
import { comboCatalogue, comboBySlug, comboBySku, adminListCombos, createCombo, updateCombo, deleteCombo } from '../server/combos.js';
import { quote } from '../server/pricing.js';

function testDb() {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: 'private/store.sqlite' },
    useNullAsDefault: true
  });
}

test('combos: comboCatalogue calculates live component sums, savings and stock', async () => {
  const db = testDb();
  try {
    const combos = await comboCatalogue(db);
    assert.ok(Array.isArray(combos));
    assert.ok(combos.length >= 4, 'Expected at least 4 curated combos seeded');

    for (const combo of combos) {
      assert.ok(combo.name);
      assert.ok(combo.sku);
      assert.ok(combo.slug);
      assert.ok(combo.is_combo);
      assert.ok(Number.isFinite(combo.price));
      assert.ok(combo.price > 0);
      assert.ok(Array.isArray(combo.components));
      assert.ok(combo.components.length >= 2, 'Combos must contain at least 2 components');

      // Verify savings calculation: original_price >= combo.price
      assert.ok(combo.original_price >= combo.price);
      assert.equal(combo.savings, combo.original_price - combo.price);

      // Verify stock is constrained by minComponentStock
      assert.ok(combo.stock >= 0);
      assert.equal(combo.checkout_available, combo.stock > 0);
    }
  } finally {
    await db.destroy();
  }
});

test('combos: comboBySlug and comboBySku locate matching combo record', async () => {
  const db = testDb();
  try {
    const slugCombo = await comboBySlug(db, 'awadh-splendour-ivory-kurta-lune-pearl-drops');
    assert.ok(slugCombo);
    assert.equal(slugCombo.slug, 'awadh-splendour-ivory-kurta-lune-pearl-drops');
    assert.equal(slugCombo.sku, 'CMB-AWADH-01');

    const skuCombo = await comboBySku(db, 'CMB-AWADH-01');
    assert.ok(skuCombo);
    assert.equal(skuCombo.id, slugCombo.id);

    const nonExistent = await comboBySlug(db, 'missing-combo-slug');
    assert.equal(nonExistent, null);
  } finally {
    await db.destroy();
  }
});

test('combos: pricing quote handles combo items with bundled savings', async () => {
  const db = testDb();
  try {
    const combos = await comboCatalogue(db);
    const targetCombo = combos[0];
    assert.ok(targetCombo);

    const result = await quote(db, [{ sku: targetCombo.sku, quantity: 2 }]);
    assert.ok(result);
    assert.ok(Array.isArray(result.lines));
    assert.equal(result.lines.length, 1);
    assert.equal(result.lines[0].sku, targetCombo.sku);
    assert.equal(result.lines[0].unit_price, targetCombo.price);
    assert.equal(result.subtotal, targetCombo.price * 2);
  } finally {
    await db.destroy();
  }
});

test('combos: admin CRUD lifecycle (create, update, delete)', async () => {
  const db = testDb();
  let createdId = null;
  try {
    // 1. Create
    const created = await createCombo(db, {
      name: 'Test Festive Heritage Set',
      sku: 'COMBO-TEST-FESTIVE',
      slug: 'test-festive-heritage-set',
      description: 'Temporary combo for testing',
      combo_price: 6999,
      original_price: 8500,
      stock: 12,
      status: 'published',
      items: [
        { product_sku: 'KURTA-LUCKNOWI-IVORY-M', quantity: 1 },
        { product_sku: 'BAROQUE-RIB-01', quantity: 1 }
      ]
    });
    assert.ok(created.id);
    createdId = created.id;
    assert.equal(created.sku, 'COMBO-TEST-FESTIVE');

    // 2. Read
    const fetched = await comboBySku(db, 'COMBO-TEST-FESTIVE');
    assert.ok(fetched);
    assert.equal(fetched.name, 'Test Festive Heritage Set');
    assert.equal(fetched.components.length, 2);

    // 3. Update
    const updated = await updateCombo(db, createdId, {
      name: 'Updated Festive Heritage Set',
      combo_price: 6499
    });
    assert.equal(updated.name, 'Updated Festive Heritage Set');
    assert.equal(Number(updated.combo_price), 6499);

    // 4. Delete
    await deleteCombo(db, createdId);
    const afterDelete = await comboBySku(db, 'COMBO-TEST-FESTIVE');
    assert.equal(afterDelete, null);
    createdId = null;
  } finally {
    if (createdId) {
      await db('combos').where({ id: createdId }).del().catch(() => {});
    }
    await db.destroy();
  }
});
