import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import CommonFilterBar from './components/CommonFilterBar.jsx';
import CommonStatusBadge from './components/CommonStatusBadge.jsx';
import CommonEmptyState from './components/CommonEmptyState.jsx';
import CommonModal from './components/CommonModal.jsx';
import { Plus, Edit2, Trash2, RefreshCw, Sparkles } from 'lucide-react';

export function CraftsmanshipAdmin({ readonly }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    thumbnail: '',
    status: 'active',
    sort_order: 0,
    seo_title: '',
    meta_description: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/admin/craftsmanship');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load craftsmanship techniques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      thumbnail: '',
      status: 'active',
      sort_order: items.length + 1,
      seo_title: '',
      meta_description: ''
    });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingItem(c);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      thumbnail: c.thumbnail || '',
      status: c.status || 'active',
      sort_order: c.sort_order || 0,
      seo_title: c.seo_title || '',
      meta_description: c.meta_description || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingItem) {
        await api(`/admin/craftsmanship/${editingItem.id}`, form, 'PUT');
      } else {
        await api('/admin/craftsmanship', form, 'POST');
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save craftsmanship technique');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete craftsmanship technique "${name}"?`)) return;
    try {
      await api(`/admin/craftsmanship/${id}`, null, 'DELETE');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete craftsmanship');
    }
  };

  const filtered = items.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <span className="eyebrow">RELATIONAL MASTER DATA</span>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Craftsmanship & Techniques</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="text-button" onClick={loadData} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          {!readonly && (
            <button className="button dark small-button" onClick={openCreate}><Plus size={15} /> Add Technique</button>
          )}
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: '16px' }}>{error}</div>}

      <CommonFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search techniques by name or slug..."
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' }
            ]
          }
        ]}
      />

      {loading ? (
        <div className="empty">Loading craftsmanship techniques...</div>
      ) : filtered.length === 0 ? (
        <CommonEmptyState title="No techniques found" description="No craftsmanship techniques match your criteria." icon={Sparkles} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Technique</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Status</th>
                {!readonly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>{c.sort_order}</td>
                  <td>
                    <strong>{c.name}</strong>
                    {c.description && <small style={{ display: 'block', color: 'var(--muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</small>}
                  </td>
                  <td><code>{c.slug}</code></td>
                  <td><span className="test-badge">{c.product_count || 0} linked</span></td>
                  <td><CommonStatusBadge status={c.status} label={c.status} /></td>
                  {!readonly && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="text-button" onClick={() => openEdit(c)} aria-label="Edit technique"><Edit2 size={14} /> Edit</button>
                        <button className="text-button" onClick={() => handleDelete(c.id, c.name)} style={{ color: '#c62828' }} aria-label="Delete technique"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <CommonModal title={editingItem ? `Edit Technique: ${editingItem.name}` : 'New Technique'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label>
              Technique Name *
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kundan, Jadau, Meenakari, Nakshi" />
            </label>
            <label>
              Slug
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name if left empty" />
            </label>
            <label>
              Description
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Heirloom provenance, toolwork, and execution details..." />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Status
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                Sort Order
                <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="button secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="button dark" disabled={saving}>{saving ? 'Saving...' : 'Save Technique'}</button>
            </div>
          </form>
        </CommonModal>
      )}
    </div>
  );
}
