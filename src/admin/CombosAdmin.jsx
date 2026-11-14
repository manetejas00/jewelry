import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, RefreshCw, Sparkles, Package, ArrowUpRight } from 'lucide-react';
import { api } from '../api.js';

const money = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

export function CombosAdmin({ readonly = false, refreshParent = null, products = [] }) {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCombo, setEditingCombo] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Available products for item selection
  const [availableProducts, setAvailableProducts] = useState(products || []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [combosData, prodsData] = await Promise.all([
        api('/admin/combos'),
        availableProducts.length ? Promise.resolve(availableProducts) : api('/admin/products')
      ]);
      setCombos(combosData || []);
      if (!availableProducts.length && prodsData) {
        setAvailableProducts(prodsData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load combos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Compute calculated component price sum
  const calculateComponentSum = (items = []) => {
    return items.reduce((sum, it) => {
      const prod = availableProducts.find(p => p.sku === it.product_sku);
      const price = prod?.price || prod?.fixed_price || Number(it.unit_price) || 0;
      return sum + price * (it.quantity || 1);
    }, 0);
  };

  function startCreate() {
    setIsNew(true);
    setEditingCombo({
      name: '',
      sku: `COMBO-SET-${Date.now().toString().slice(-4)}`,
      slug: '',
      description: '',
      combo_price: 5000,
      original_price: 6000,
      image: '',
      thumbnail: '',
      stock: 10,
      status: 'published',
      items: [
        { product_sku: '', quantity: 1 }
      ]
    });
  }

  function handleAddItem() {
    if (!editingCombo) return;
    setEditingCombo({
      ...editingCombo,
      items: [...(editingCombo.items || []), { product_sku: '', quantity: 1 }]
    });
  }

  function handleRemoveItem(idx) {
    if (!editingCombo) return;
    const next = [...(editingCombo.items || [])];
    next.splice(idx, 1);
    const newOriginal = calculateComponentSum(next);
    setEditingCombo({
      ...editingCombo,
      items: next,
      original_price: newOriginal > 0 ? newOriginal : editingCombo.original_price
    });
  }

  function handleItemChange(idx, field, value) {
    if (!editingCombo) return;
    const next = [...(editingCombo.items || [])];
    next[idx] = { ...next[idx], [field]: value };
    const newOriginal = calculateComponentSum(next);
    setEditingCombo({
      ...editingCombo,
      items: next,
      original_price: newOriginal > 0 ? newOriginal : editingCombo.original_price
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...editingCombo,
        combo_price: Number(editingCombo.combo_price),
        original_price: Number(editingCombo.original_price),
        stock: Number(editingCombo.stock),
        items: (editingCombo.items || []).filter(it => it.product_sku)
      };

      if (isNew) {
        await api('/admin/combos', payload, 'POST');
        setSuccess('Combo set created successfully.');
      } else {
        await api(`/admin/combos/${editingCombo.id}`, payload, 'PATCH');
        setSuccess('Combo set updated successfully.');
      }
      setEditingCombo(null);
      setIsNew(false);
      await load();
      if (refreshParent) await refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to save combo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (readonly || !deleteId) return;
    setBusy(true);
    setError('');
    try {
      await api(`/admin/combos/${deleteId}`, {}, 'DELETE');
      setSuccess('Combo deleted.');
      setDeleteId(null);
      await load();
      if (refreshParent) await refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to delete combo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-combos-panel">
      <div className="section-heading" style={{ marginBottom: '16px' }}>
        <div>
          <span className="eyebrow">CURATED SETS & BUNDLES</span>
          <h3>Kurta & Jewellery Combos ({combos.length})</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="text-button"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {!readonly && (
            <button
              type="button"
              className="button dark small-button"
              onClick={startCreate}
            >
              <Plus size={16} /> New Combo Set
            </button>
          )}
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div className="notice" role="status" style={{ marginBottom: '16px' }}>{success}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Preview</th>
              <th>Name & SKU</th>
              <th>Components</th>
              <th>Bundle Price</th>
              <th>Savings</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {combos.map(combo => (
              <tr key={combo.id}>
                <td style={{ width: '60px' }}>
                  <img
                    src={combo.thumbnail || combo.image || '/assets/product-placeholder.svg'}
                    alt={combo.name}
                    style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '3px', border: '1px solid var(--line)' }}
                    onError={e => { e.currentTarget.src = '/assets/product-placeholder.svg'; }}
                  />
                </td>
                <td>
                  <strong>{combo.name}</strong>
                  <small style={{ display: 'block', color: 'var(--muted)' }}>{combo.sku} · /{combo.slug}</small>
                </td>
                <td>
                  <span className="status-badge" style={{ fontSize: '10px' }}>
                    {(combo.items || []).length} products included
                  </span>
                </td>
                <td>
                  <strong>{money(combo.combo_price)}</strong>
                  {combo.original_price > combo.combo_price && (
                    <del style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>
                      {money(combo.original_price)}
                    </del>
                  )}
                </td>
                <td>
                  {combo.savings > 0 ? (
                    <span style={{ color: '#2e7d32', fontWeight: 600, fontSize: '12px' }}>
                      SAVE {money(combo.savings)} ({combo.discount_percent}%)
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={combo.stock > 0 ? '' : 'error'} style={{ fontWeight: 600 }}>
                    {combo.stock} available
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${combo.status === 'published' ? 'active' : ''}`}>
                    {combo.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="underlink"
                      disabled={readonly}
                      onClick={() => {
                        setIsNew(false);
                        setEditingCombo({ ...combo });
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    {!readonly && (
                      <button
                        type="button"
                        className="text-button"
                        style={{ color: '#a83232', padding: 0 }}
                        onClick={() => setDeleteId(combo.id)}
                        title="Delete combo"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !combos.length && (
          <p className="empty">No combos created yet. Click "New Combo Set" to create one.</p>
        )}
      </div>

      {/* Edit / Create Modal */}
      {editingCombo && (
        <div className="modal-backdrop" onClick={() => setEditingCombo(null)}>
          <section className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-heading">
              <h2>{isNew ? 'Create New Combo Set' : `Edit Combo: ${editingCombo.name}`}</h2>
              <button type="button" className="icon" onClick={() => setEditingCombo(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Combo Name *
                  <input
                    required
                    value={editingCombo.name || ''}
                    onChange={e => setEditingCombo({ ...editingCombo, name: e.target.value })}
                    placeholder="e.g. Lucknowi Kurta & Baroque Pearl Set"
                  />
                </label>
                <label>
                  SKU *
                  <input
                    required
                    value={editingCombo.sku || ''}
                    onChange={e => setEditingCombo({ ...editingCombo, sku: e.target.value })}
                    placeholder="e.g. COMBO-LUCKNOWI-PEARL"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  URL Slug
                  <input
                    value={editingCombo.slug || ''}
                    onChange={e => setEditingCombo({ ...editingCombo, slug: e.target.value })}
                    placeholder="e.g. lucknowi-kurta-baroque-pearl-set"
                  />
                </label>
                <label>
                  Stock Units
                  <input
                    type="number"
                    min="0"
                    value={editingCombo.stock ?? 10}
                    onChange={e => setEditingCombo({ ...editingCombo, stock: parseInt(e.target.value, 10) || 0 })}
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  rows={2}
                  value={editingCombo.description || ''}
                  onChange={e => setEditingCombo({ ...editingCombo, description: e.target.value })}
                  placeholder="Stylist description of this coordinated look..."
                />
              </label>

              {/* Components Selection */}
              <div style={{ border: '1px solid var(--line)', padding: '14px', background: '#faf9f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px' }}>Bundle Products ({editingCombo.items?.length || 0})</strong>
                  <button type="button" className="text-button" onClick={handleAddItem} style={{ fontSize: '12px' }}>
                    <Plus size={13} /> Add Product
                  </button>
                </div>

                {(editingCombo.items || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <select
                      style={{ flex: 1 }}
                      value={it.product_sku || ''}
                      onChange={e => handleItemChange(idx, 'product_sku', e.target.value)}
                    >
                      <option value="">Select a product (Kurta or Jewellery)</option>
                      {availableProducts.map(p => (
                        <option key={p.sku} value={p.sku}>
                          {p.name} ({p.sku}) — {money(p.price || p.fixed_price)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      style={{ width: '60px' }}
                      value={it.quantity || 1}
                      onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                    />
                    <button
                      type="button"
                      className="text-button"
                      style={{ color: '#a83232', padding: 0 }}
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pricing & Automatic Savings Calculation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Original Price (Individual Sum)
                  <input
                    type="number"
                    value={editingCombo.original_price ?? 0}
                    onChange={e => setEditingCombo({ ...editingCombo, original_price: Number(e.target.value) || 0 })}
                  />
                </label>
                <label>
                  Combo Bundle Price *
                  <input
                    type="number"
                    required
                    value={editingCombo.combo_price ?? 0}
                    onChange={e => setEditingCombo({ ...editingCombo, combo_price: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>

              {/* Savings preview */}
              {Number(editingCombo.original_price) > Number(editingCombo.combo_price) && (
                <div className="notice" style={{ margin: 0, padding: '8px 12px' }}>
                  <Sparkles size={14} /> Customer saves {money(Number(editingCombo.original_price) - Number(editingCombo.combo_price))} (
                  {(((Number(editingCombo.original_price) - Number(editingCombo.combo_price)) / Number(editingCombo.original_price)) * 100).toFixed(1)}% OFF)
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Image URL
                  <input
                    value={editingCombo.image || ''}
                    onChange={e => setEditingCombo({ ...editingCombo, image: e.target.value })}
                    placeholder="/assets/combos/...webp"
                  />
                </label>
                <label>
                  Publication Status
                  <select
                    value={editingCombo.status || 'published'}
                    onChange={e => setEditingCombo({ ...editingCombo, status: e.target.value })}
                  >
                    <option value="published">Published (Available for purchase)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px' }}>
                <button type="button" className="text-button" onClick={() => setEditingCombo(null)}>
                  Cancel
                </button>
                <button type="submit" className="button dark" disabled={busy}>
                  {busy ? 'Saving…' : isNew ? 'Create Combo' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
          <section className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-heading">
              <h2>Confirm Deletion</h2>
              <button type="button" className="icon" onClick={() => setDeleteId(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '14px 0' }}>
              Are you sure you want to delete this combo? The individual products in the combo will not be deleted.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="text-button" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button dark"
                style={{ background: '#a83232', borderColor: '#a83232', color: '#fff' }}
                disabled={busy}
                onClick={handleDeleteConfirm}
              >
                {busy ? 'Deleting…' : 'Delete Combo'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
