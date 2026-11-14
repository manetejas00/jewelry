import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Eye,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../api.js';
import { money } from '../catalogue.js';
import BrandedImage from '../BrandedImage.jsx';
import CommonStatusBadge from './components/CommonStatusBadge.jsx';
import Pagination, { usePagination } from '../Pagination.jsx';
import useScrollLock from '../useScrollLock.js';
import { KURTA_SIZES } from '../kurta-constants.js';

function KurtaAdminModal({ title, children, onClose }) {
  const el = useRef();
  useScrollLock(true, el, { onEscape: onClose, trapFocus: true });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={el}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '92vw' }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon" aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function KurtasAdmin({ readonly, ProductAngleManager }) {
  const [kurtas, setKurtas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingKurta, setEditingKurta] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    description: '',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Handcrafted Lucknowi Chikankari',
    price: 3990,
    status: 'published',
    sizes: {
      'XS (34)': 10,
      'S (36)': 12,
      'M (38)': 15,
      'L (40)': 18,
      'XL (42)': 10,
      'XXL (44)': 8,
      'XXXL (46)': 6
    },
    seo_title: '',
    meta_description: ''
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api('/admin/kurtas');
      setKurtas(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not fetch Chicken Curry Kurtas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredKurtas = useMemo(() => {
    return kurtas.filter(k => {
      const matchSearch =
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        k.product_code.toLowerCase().includes(search.toLowerCase()) ||
        (k.fabric && k.fabric.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [kurtas, search, statusFilter]);

  const pagination = usePagination(filteredKurtas, 15);

  const openCreateModal = () => {
    setFormData({
      name: '',
      product_code: '',
      description: '',
      fabric: 'Pure Mulmul Cotton',
      craftsmanship: 'Handcrafted Lucknowi Chikankari',
      price: 3990,
      status: 'published',
      sizes: {
        'XS (34)': 10,
        'S (36)': 12,
        'M (38)': 15,
        'L (40)': 18,
        'XL (42)': 10,
        'XXL (44)': 8,
        'XXXL (46)': 6
      },
      seo_title: '',
      meta_description: ''
    });
    setIsCreating(true);
    setEditingKurta(null);
    setError('');
  };

  const openEditModal = (k) => {
    const sizeStockMap = {};
    for (const s of KURTA_SIZES) {
      sizeStockMap[s.label] = k.sizes?.[s.label]?.stock ?? 0;
    }

    setFormData({
      name: k.name,
      product_code: k.product_code,
      description: k.description || '',
      fabric: k.fabric || 'Pure Mulmul Cotton',
      craftsmanship: k.craftsmanship || 'Handcrafted Lucknowi Chikankari',
      price: k.price || 3990,
      status: k.status || 'published',
      sizes: sizeStockMap,
      seo_title: k.seo_title || '',
      meta_description: k.meta_description || ''
    });
    setEditingKurta(k);
    setIsCreating(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      if (isCreating) {
        await api('/admin/kurtas', formData);
        setSuccess(`Chicken Curry Kurta "${formData.name}" created successfully with all 7 sizes (XS–XXXL).`);
      } else {
        await api(`/admin/kurtas/${encodeURIComponent(editingKurta.product_code)}`, formData);
        setSuccess(`Kurta "${formData.name}" updated successfully.`);
      }
      setIsCreating(false);
      setEditingKurta(null);
      await refresh();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (code, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" (${code}) and all its size variants?`)) {
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/kurtas/${encodeURIComponent(code)}`, {}, { method: 'DELETE' });
      setSuccess(`Kurta "${name}" deleted.`);
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to delete kurta');
    } finally {
      setBusy(false);
    }
  };

  const handleStockChange = (sizeLabel, val) => {
    const num = Math.max(0, parseInt(val || 0, 10));
    setFormData(prev => ({
      ...prev,
      sizes: {
        ...prev.sizes,
        [sizeLabel]: isNaN(num) ? 0 : num
      }
    }));
  };

  return (
    <div className="admin-panel kurtas-admin">
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--gold)" /> Chicken Curry Kurtas ({kurtas.length} styles)
          </h3>
          <span className="small muted">
            Independent Ethnic Wear Module · Reusing Core Product UI & XS–XXXL Sizing
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="button secondary small-button"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {!readonly && (
            <button
              type="button"
              className="button dark small-button"
              onClick={openCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Add New Kurta
            </button>
          )}
        </div>
      </div>

      {error && <p className="error" role="alert" style={{ marginBottom: '14px' }}>{error}</p>}
      {success && <p className="notice" role="status" style={{ marginBottom: '14px' }}>{success}</p>}

      {/* Filter and Search Bar */}
      <div className="admin-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
          <input
            style={{ paddingLeft: '32px', width: '100%' }}
            placeholder="Search by name, code, fabric…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kurta Style</th>
              <th>Fabric & Craftsmanship</th>
              <th>Price</th>
              <th>Size Inventory (XS to XXXL)</th>
              <th>Total Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.map(k => (
              <tr key={k.product_code}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line)', background: '#faf9f5' }}>
                      <BrandedImage
                        src={k.image || `/assets/products/${k.product_code}/hero.webp`}
                        alt={k.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>{k.name}</strong>
                      <span className="small muted" style={{ fontFamily: 'monospace' }}>{k.product_code}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 500 }}>{k.fabric}</span>
                  <span className="small muted">{k.craftsmanship}</span>
                </td>
                <td>
                  <strong style={{ fontSize: '14px' }}>{money(k.price)}</strong>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '280px' }}>
                    {KURTA_SIZES.map(s => {
                      const stockCount = k.sizes?.[s.label]?.stock ?? 0;
                      const hasStock = stockCount > 0;
                      return (
                        <span
                          key={s.code}
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 5px',
                            borderRadius: '2px',
                            background: hasStock ? '#e8f5e9' : '#ffebee',
                            color: hasStock ? '#2e7d32' : '#c62828',
                            border: `1px solid ${hasStock ? '#c8e6c9' : '#ffcdd2'}`
                          }}
                          title={`${s.label}: ${stockCount} in stock`}
                        >
                          {s.code}: {stockCount}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <strong style={{ color: k.totalStock > 0 ? 'var(--ink)' : '#c62828' }}>
                    {k.totalStock} pcs
                  </strong>
                </td>
                <td>
                  <CommonStatusBadge status={k.status === 'published' ? 'Active' : 'Draft'} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      to={`/kurtas/${k.product_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-button"
                      title="View on Storefront"
                    >
                      <Eye size={15} />
                    </Link>
                    {!readonly && (
                      <>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => openEditModal(k)}
                          title="Edit Kurta & Inventory"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => handleDelete(k.product_code, k.name)}
                          title="Delete Kurta Style"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!pagination.items.length && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px' }}>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>
                    No Chicken Curry Kurtas found matching your filter criteria.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} label="kurtas" />

      {/* Modal: Create or Edit */}
      {(isCreating || editingKurta) && (
        <KurtaAdminModal
          title={isCreating ? 'Create New Chicken Curry Kurta' : `Edit: ${editingKurta.name}`}
          onClose={() => { setIsCreating(false); setEditingKurta(null); }}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              <label>
                Kurta Style Name *
                <input
                  required
                  placeholder="e.g. Noor-e-Awadh Ivory Chikankari Mulmul Kurta"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              <label>
                Product Code / Identifier *
                <input
                  required
                  disabled={!isCreating}
                  placeholder="e.g. lucknowi-ivory-chikankari-cotton-kurta"
                  value={formData.product_code}
                  onChange={e => setFormData({ ...formData, product_code: e.target.value })}
                  style={!isCreating ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </label>

              <label>
                Fabric *
                <select
                  value={formData.fabric}
                  onChange={e => setFormData({ ...formData, fabric: e.target.value })}
                >
                  <option value="Pure Mulmul Cotton">Pure Mulmul Cotton</option>
                  <option value="Viscose Georgette">Viscose Georgette</option>
                  <option value="Chanderi Silk">Chanderi Silk</option>
                  <option value="Silk Cotton Blend">Silk Cotton Blend</option>
                </select>
              </label>

              <label>
                Craftsmanship & Needlework *
                <input
                  value={formData.craftsmanship}
                  onChange={e => setFormData({ ...formData, craftsmanship: e.target.value })}
                />
              </label>

              <label>
                Retail Price (₹ INR) *
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                />
              </label>

              <label>
                Status
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: '18px' }}>
              Description
              <textarea
                rows={3}
                placeholder="Describe the fabric weave, Awadhi stitches (Bakhiya, Phanda), neckline, and styling..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </label>

            {/* Sizing & Stock Matrix for XS to XXXL */}
            <div style={{ background: '#faf9f5', border: '1px solid var(--line)', borderRadius: '4px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="var(--gold)" /> Size-Wise Inventory Matrix (XS to XXXL)
              </h4>
              <p className="small muted" style={{ margin: '0 0 12px' }}>
                Set individual inventory quantities for each of the 7 supported sizes. Sizes with 0 stock will be disabled on the storefront.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px' }}>
                {KURTA_SIZES.map(s => (
                  <label key={s.code} style={{ fontSize: '12px' }}>
                    {s.label}
                    <input
                      type="number"
                      min="0"
                      value={formData.sizes[s.label] ?? 0}
                      onChange={e => handleStockChange(s.label, e.target.value)}
                      style={{ textAlign: 'center', fontWeight: 600, marginTop: '4px' }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Multi-Angle Photography if editing */}
            {!isCreating && editingKurta && ProductAngleManager && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} /> Multi-Angle Photography
                </h4>
                <ProductAngleManager
                  product={{ product_code: editingKurta.product_code, name: editingKurta.name }}
                  readonly={readonly}
                  refreshParent={refresh}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => { setIsCreating(false); setEditingKurta(null); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button dark"
                disabled={busy}
              >
                {busy ? 'Saving…' : isCreating ? 'Create Kurta & 7 Sizes' : 'Save Changes'}
              </button>
            </div>
          </form>
        </KurtaAdminModal>
      )}
    </div>
  );
}

export default KurtasAdmin;
