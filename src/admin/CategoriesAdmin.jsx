import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Check, X, FolderTree, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
import { api } from '../api.js';
import BrandedImage from '../BrandedImage.jsx';

export function CategoriesAdmin({ readonly = false, refreshParent = null }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/admin/categories');
      setCategories(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (isNew) {
        await api('/admin/categories', editingCat, 'POST');
        setSuccess('Category created successfully.');
      } else {
        await api(`/admin/categories/${editingCat.id}`, editingCat, 'PATCH');
        setSuccess('Category updated successfully.');
      }
      setEditingCat(null);
      setIsNew(false);
      await load();
      if (refreshParent) await refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(cat) {
    if (readonly) return;
    const nextStatus = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await api(`/admin/categories/${cat.id}`, { status: nextStatus }, 'PATCH');
      await load();
      if (refreshParent) await refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  }

  async function handleDeleteConfirm() {
    if (readonly || !deleteId) return;
    setBusy(true);
    setError('');
    try {
      await api(`/admin/categories/${deleteId}`, {}, 'DELETE');
      setSuccess('Category deleted.');
      setDeleteId(null);
      await load();
      if (refreshParent) await refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setBusy(false);
    }
  }

  function startCreate() {
    setIsNew(true);
    setEditingCat({
      name: '',
      slug: '',
      description: '',
      thumbnail: '',
      banner: '',
      status: 'active',
      sort_order: categories.length + 1,
      seo_title: '',
      meta_description: ''
    });
  }

  return (
    <div className="admin-categories-panel">
      <div className="section-heading" style={{ marginBottom: '16px' }}>
        <div>
          <span className="eyebrow">STORE TAXONOMY & COLLECTIONS</span>
          <h3>Category Management ({categories.length})</h3>
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
              <Plus size={16} /> New Category
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
              <th>Name & Slug</th>
              <th>Description</th>
              <th>Products</th>
              <th>Order</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ width: '60px' }}>
                  <img
                    src={cat.thumbnail || cat.thumbnail_url || '/assets/product-placeholder.svg'}
                    alt={cat.name}
                    style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '3px', border: '1px solid var(--line)' }}
                    onError={e => { e.currentTarget.src = '/assets/product-placeholder.svg'; }}
                  />
                </td>
                <td>
                  <strong>{cat.name}</strong>
                  <small style={{ display: 'block', color: 'var(--muted)' }}>/{cat.slug}</small>
                </td>
                <td style={{ maxWidth: '280px', fontSize: '12px', color: 'var(--muted)' }}>
                  {cat.description ? (cat.description.length > 90 ? cat.description.slice(0, 90) + '…' : cat.description) : '—'}
                </td>
                <td>
                  <span className="status-badge" style={{ fontSize: '10px' }}>
                    {cat.product_count || 0} pieces
                  </span>
                </td>
                <td>{cat.sort_order}</td>
                <td>
                  <button
                    type="button"
                    className={`status-badge ${cat.status === 'active' ? 'active' : ''}`}
                    style={{ cursor: readonly ? 'default' : 'pointer' }}
                    onClick={() => handleToggleStatus(cat)}
                    disabled={readonly}
                    title="Click to toggle active/inactive"
                  >
                    {cat.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="underlink"
                      disabled={readonly}
                      onClick={() => {
                        setIsNew(false);
                        setEditingCat({ ...cat });
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    {!readonly && (
                      <button
                        type="button"
                        className="text-button"
                        style={{ color: '#a83232', padding: 0 }}
                        onClick={() => setDeleteId(cat.id)}
                        title="Delete category"
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
        {!loading && !categories.length && (
          <p className="empty">No categories configured yet. Click "New Category" to create one.</p>
        )}
      </div>

      {/* Edit / Create Modal */}
      {editingCat && (
        <div className="modal-backdrop" onClick={() => setEditingCat(null)}>
          <section className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-heading">
              <h2>{isNew ? 'Create New Category' : `Edit Category: ${editingCat.name}`}</h2>
              <button type="button" className="icon" onClick={() => setEditingCat(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Category Name *
                  <input
                    required
                    value={editingCat.name || ''}
                    onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                    placeholder="e.g. Chicken Curry Kurtas"
                  />
                </label>
                <label>
                  URL Slug
                  <input
                    value={editingCat.slug || ''}
                    onChange={e => setEditingCat({ ...editingCat, slug: e.target.value })}
                    placeholder="e.g. chicken-curry-kurtas"
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  rows={3}
                  value={editingCat.description || ''}
                  onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                  placeholder="Artisanal description of this collection..."
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Thumbnail URL (1:1 square)
                  <input
                    value={editingCat.thumbnail || ''}
                    onChange={e => setEditingCat({ ...editingCat, thumbnail: e.target.value })}
                    placeholder="/assets/categories/..."
                  />
                </label>
                <label>
                  Banner URL (1600x500 banner)
                  <input
                    value={editingCat.banner || ''}
                    onChange={e => setEditingCat({ ...editingCat, banner: e.target.value })}
                    placeholder="/assets/categories/...-banner.webp"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Display Order
                  <input
                    type="number"
                    value={editingCat.sort_order ?? 0}
                    onChange={e => setEditingCat({ ...editingCat, sort_order: parseInt(e.target.value, 10) || 0 })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={editingCat.status || 'active'}
                    onChange={e => setEditingCat({ ...editingCat, status: e.target.value })}
                  >
                    <option value="active">Active (Visible on storefront)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </label>
              </div>

              <details style={{ marginTop: '6px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  SEO Metadata (Optional)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <label>
                    SEO Title
                    <input
                      value={editingCat.seo_title || ''}
                      onChange={e => setEditingCat({ ...editingCat, seo_title: e.target.value })}
                      placeholder="e.g. Chicken Curry Kurtas for Women | Veyora Jewels"
                    />
                  </label>
                  <label>
                    Meta Description
                    <textarea
                      rows={2}
                      value={editingCat.meta_description || ''}
                      onChange={e => setEditingCat({ ...editingCat, meta_description: e.target.value })}
                      placeholder="Rich description for Google search results..."
                    />
                  </label>
                </div>
              </details>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px' }}>
                <button type="button" className="text-button" onClick={() => setEditingCat(null)}>
                  Cancel
                </button>
                <button type="submit" className="button dark" disabled={busy}>
                  {busy ? 'Saving…' : isNew ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to delete this category? Products currently assigned to this category will not be deleted, but may lose this category tag.
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
                {busy ? 'Deleting…' : 'Delete Category'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
