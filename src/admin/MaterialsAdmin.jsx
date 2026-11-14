import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import CommonFilterBar from './components/CommonFilterBar.jsx';
import CommonStatusBadge from './components/CommonStatusBadge.jsx';
import CommonEmptyState from './components/CommonEmptyState.jsx';
import CommonModal from './components/CommonModal.jsx';
import { Plus, Edit2, Trash2, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export function MaterialsAdmin({ readonly }) {
  const [materials, setMaterials] = useState([]);
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
      const data = await api('/admin/materials');
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load materials');
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
      sort_order: materials.length + 1,
      seo_title: '',
      meta_description: ''
    });
    setModalOpen(true);
  };

  const openEdit = (m) => {
    setEditingItem(m);
    setForm({
      name: m.name || '',
      slug: m.slug || '',
      description: m.description || '',
      thumbnail: m.thumbnail || '',
      status: m.status || 'active',
      sort_order: m.sort_order || 0,
      seo_title: m.seo_title || '',
      meta_description: m.meta_description || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingItem) {
        await api(`/admin/materials/${editingItem.id}`, form, 'PUT');
      } else {
        await api('/admin/materials', form, 'POST');
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete material "${name}"?`)) return;
    try {
      await api(`/admin/materials/${id}`, null, 'DELETE');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete material');
    }
  };

  const filtered = materials.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (m.name || '').toLowerCase().includes(q) || (m.slug || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <span className="eyebrow">RELATIONAL MASTER DATA</span>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Materials Management</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="text-button" onClick={loadData} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          {!readonly && (
            <button className="button dark small-button" onClick={openCreate}><Plus size={15} /> Add Material</button>
          )}
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: '16px' }}>{error}</div>}

      <CommonFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search materials by name or slug..."
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
        <div className="empty">Loading materials...</div>
      ) : filtered.length === 0 ? (
        <CommonEmptyState title="No materials found" description="No materials match your current search criteria." icon={Layers} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Material</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Status</th>
                {!readonly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>{m.sort_order}</td>
                  <td>
                    <strong>{m.name}</strong>
                    {m.description && <small style={{ display: 'block', color: 'var(--muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.description}</small>}
                  </td>
                  <td><code>{m.slug}</code></td>
                  <td><span className="test-badge">{m.product_count || 0} linked</span></td>
                  <td><CommonStatusBadge status={m.status} label={m.status} /></td>
                  {!readonly && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="text-button" onClick={() => openEdit(m)} aria-label="Edit material"><Edit2 size={14} /> Edit</button>
                        <button className="text-button" onClick={() => handleDelete(m.id, m.name)} style={{ color: '#c62828' }} aria-label="Delete material"><Trash2 size={14} /></button>
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
        <CommonModal title={editingItem ? `Edit Material: ${editingItem.name}` : 'New Material'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label>
              Material Name *
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pure Gold, Kundan Alloy, Freshwater Pearl" />
            </label>
            <label>
              Slug
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name if left empty" />
            </label>
            <label>
              Description
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Artisanal description of material properties and heritage..." />
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
              <button type="submit" className="button dark" disabled={saving}>{saving ? 'Saving...' : 'Save Material'}</button>
            </div>
          </form>
        </CommonModal>
      )}
    </div>
  );
}
