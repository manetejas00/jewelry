import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  RotateCcw,
  Eye,
  Check,
  X,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  Send,
  UserRound,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../api.js';

function money(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}

function date(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return str;
  }
}

export default function CYOAdmin({ readonly = false, staff }) {
  const [designs, setDesigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected design inspection drawer
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeAngle, setActiveAngle] = useState('front');

  // Quotation form state
  const [quoteForm, setQuoteForm] = useState({
    quoted_amount: '',
    estimated_weight_g: '',
    material_cost: '',
    gemstone_cost: '',
    making_cost: '',
    tax_cost: '',
    admin_notes: '',
    valid_until: ''
  });

  // Quota override state
  const [quotaForm, setQuotaForm] = useState({
    count: '',
    limit: '',
    reason: ''
  });

  // Status review state
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    loadDesigns();
  }, [page, statusFilter, categoryFilter]);

  async function loadDesigns() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        status: statusFilter,
        category: categoryFilter,
        search
      });
      const data = await api(`/admin/cyo/designs?${params.toString()}`);
      setDesigns(data.designs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load custom designs.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadDesigns();
  }

  function handleResetFilters() {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearch('');
    setPage(1);
  }

  async function inspectDesign(id) {
    setDetailLoading(true);
    setError('');
    try {
      const data = await api(`/admin/cyo/designs/${id}`);
      setSelectedDesign(data);
      setNewStatus(data.status);
      setStatusNotes('');

      // Pre-fill quotation form if active quotation exists
      const latestQuote = data.quotations?.[0];
      if (latestQuote) {
        setQuoteForm({
          quoted_amount: latestQuote.quoted_amount || '',
          estimated_weight_g: latestQuote.estimated_weight_g || '',
          material_cost: latestQuote.material_cost || '',
          gemstone_cost: latestQuote.gemstone_cost || '',
          making_cost: latestQuote.making_cost || '',
          tax_cost: latestQuote.tax_cost || '',
          admin_notes: latestQuote.admin_notes || '',
          valid_until: latestQuote.valid_until || ''
        });
      } else {
        setQuoteForm({
          quoted_amount: '',
          estimated_weight_g: '22.0',
          material_cost: '',
          gemstone_cost: '',
          making_cost: '',
          tax_cost: '',
          admin_notes: '',
          valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
        });
      }

      // Pre-fill quota form
      if (data.customerQuota) {
        setQuotaForm({
          count: data.customerQuota.count,
          limit: data.customerQuota.limit,
          reason: 'Administrative studio adjustment'
        });
      }
    } catch (err) {
      setError(err.message || 'Could not load design details.');
    } finally {
      setDetailLoading(false);
    }
  }

  // Handle Quotation Auto-Calculation
  function handleQuoteCostChange(field, val) {
    const next = { ...quoteForm, [field]: val };
    const mat = Number(next.material_cost || 0);
    const gem = Number(next.gemstone_cost || 0);
    const mkg = Number(next.making_cost || 0);
    const subtotal = mat + gem + mkg;
    const tax = Math.round(subtotal * 0.03); // 3% GST on jewellery
    next.tax_cost = tax > 0 ? String(tax) : '';
    next.quoted_amount = subtotal > 0 ? String(subtotal + tax) : next.quoted_amount;
    setQuoteForm(next);
  }

  // Submit Quotation
  async function handleIssueQuotation(e) {
    e.preventDefault();
    if (!selectedDesign) return;
    setActionBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(`/admin/cyo/designs/${selectedDesign.id}/quotation`, quoteForm);
      setSuccess(`Quotation of ${money(quoteForm.quoted_amount)} issued to ${selectedDesign.customer_name}.`);
      await inspectDesign(selectedDesign.id);
      await loadDesigns();
    } catch (err) {
      setError(err.message || 'Failed to issue quotation.');
    } finally {
      setActionBusy(false);
    }
  }

  // Submit Status Update
  async function handleUpdateStatus(e) {
    e.preventDefault();
    if (!selectedDesign) return;
    setActionBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(`/admin/cyo/designs/${selectedDesign.id}/status`, {
        status: newStatus,
        notes: statusNotes
      });
      setSuccess(`Status updated to "${newStatus}".`);
      await inspectDesign(selectedDesign.id);
      await loadDesigns();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setActionBusy(false);
    }
  }

  // Submit Quota Update
  async function handleUpdateQuota(e) {
    e.preventDefault();
    if (!selectedDesign?.customer_id) return;
    setActionBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api(`/admin/cyo/customers/${selectedDesign.customer_id}/quota`, {
        count: Number(quotaForm.count),
        limit: Number(quotaForm.limit),
        reason: quotaForm.reason
      });
      setSuccess(`Customer quota updated: ${updated.remaining} of ${updated.limit} remaining.`);
      await inspectDesign(selectedDesign.id);
    } catch (err) {
      setError(err.message || 'Failed to update customer quota.');
    } finally {
      setActionBusy(false);
    }
  }

  const currentImage = selectedDesign?.images?.find(i => i.view_type === activeAngle) || selectedDesign?.images?.[0];

  return (
    <div className="admin-panel cyo-admin-wrapper">
      <div className="section-heading">
        <div>
          <span className="eyebrow">BESPOKE JEWELLERY ATELIER</span>
          <h2>AI Custom Designs ({total})</h2>
          <p className="small muted">
            Review customer bespoke concepts, inspect multi-angle renders, verify structural feasibility, and issue formal quotations.
          </p>
        </div>
        <button className="text-button" onClick={loadDesigns} disabled={loading}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {success && <div className="notice" role="status">{success}</div>}

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearch} className="search-box">
          <Search size={14} />
          <input
            type="search"
            placeholder="Search by customer name, email, or design title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search custom designs"
          />
        </form>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="AI Generated">AI Generated</option>
          <option value="Submitted for Review">Submitted for Review</option>
          <option value="Under Technical Review">Under Technical Review</option>
          <option value="Quotation Sent">Quotation Sent</option>
          <option value="Quotation Accepted">Quotation Accepted</option>
          <option value="In Production">In Production</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          <option value="Necklace">Necklace</option>
          <option value="Earrings">Earrings</option>
          <option value="Ring">Ring</option>
          <option value="Bracelet">Bracelet</option>
          <option value="Bangle">Bangle</option>
          <option value="Mangalsutra">Mangalsutra</option>
          <option value="Pendant">Pendant</option>
        </select>

        {(statusFilter !== 'all' || categoryFilter !== 'all' || search) && (
          <button type="button" className="reset-filter-btn" onClick={handleResetFilters}>
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* Designs Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Preview</th>
              <th>Design & Category</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Quotation</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty">Loading atelier designs…</td></tr>
            ) : designs.length === 0 ? (
              <tr><td colSpan="7" className="empty">No custom designs found matching filters.</td></tr>
            ) : (
              designs.map(d => (
                <tr key={d.id} className={selectedDesign?.id === d.id ? 'highlight-row' : ''}>
                  <td style={{ width: '64px' }}>
                    {d.thumbnail ? (
                      <img src={d.thumbnail} alt={d.title} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                        <Sparkles size={16} color="#c5a059" />
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{d.title}</strong>
                    <small>{d.category} · {d.images_count} angles generated</small>
                  </td>
                  <td>
                    {d.customer_name}
                    <small>{d.customer_email}</small>
                  </td>
                  <td>
                    <span className={`status-badge ${d.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    {d.active_quotation ? (
                      <strong>{money(d.active_quotation.quoted_amount)}</strong>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <small>{date(d.updated_at)}</small>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="underlink"
                      onClick={() => inspectDesign(d.id)}
                    >
                      Inspect & Quote ↗
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Design Inspection Drawer */}
      {selectedDesign && (
        <div className="cyo-admin-drawer-backdrop" onClick={() => setSelectedDesign(null)}>
          <div className="cyo-admin-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="eyebrow">DESIGN #{selectedDesign.id}</span>
                <h3>{selectedDesign.title}</h3>
                <small>Created by {selectedDesign.customer_name} ({selectedDesign.customer_email})</small>
              </div>
              <button type="button" onClick={() => setSelectedDesign(null)} aria-label="Close drawer">
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Image Inspection Gallery */}
              <div className="drawer-section">
                <h4>Multi-Angle Photorealistic Renders</h4>
                <div className="angle-nav-pills">
                  {['front', 'side', 'detail', 'showcase'].map(angle => (
                    <button
                      key={angle}
                      type="button"
                      className={`angle-pill ${activeAngle === angle ? 'active' : ''}`}
                      onClick={() => setActiveAngle(angle)}
                    >
                      {angle.toUpperCase()} VIEW
                    </button>
                  ))}
                </div>

                {currentImage ? (
                  <div className="preview-box">
                    <img src={currentImage.image_url} alt={selectedDesign.title} className="preview-img" />
                    <div className="preview-caption">
                      <small>{currentImage.prompt || `${selectedDesign.title} - ${activeAngle} view`}</small>
                    </div>
                  </div>
                ) : (
                  <div className="preview-box placeholder">
                    <p>No images generated for this design yet.</p>
                  </div>
                )}
              </div>

              {/* Customer Prompt & Specifications */}
              <div className="drawer-section">
                <h4>Initial Prompt & Attributes</h4>
                <div className="quote-box">
                  <p>"{selectedDesign.initial_prompt}"</p>
                </div>
                {selectedDesign.versions?.[0]?.attributes && (
                  <div className="specs-grid">
                    {Object.entries(selectedDesign.versions[0].attributes).map(([k, v]) => (
                      <div key={k} className="spec-item">
                        <small>{k.toUpperCase()}</small>
                        <strong>{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quotation Formulation Form */}
              <div className="drawer-section">
                <h4>Workshop Quotation Generator</h4>
                <form onSubmit={handleIssueQuotation} className="quote-form">
                  <div className="form-row">
                    <label>
                      Estimated Net Weight (grams)
                      <input
                        type="number"
                        step="0.01"
                        value={quoteForm.estimated_weight_g}
                        onChange={e => setQuoteForm({ ...quoteForm, estimated_weight_g: e.target.value })}
                        disabled={readonly || actionBusy}
                        placeholder="22.5"
                      />
                    </label>
                    <label>
                      Material / Bullion Cost (₹)
                      <input
                        type="number"
                        value={quoteForm.material_cost}
                        onChange={e => handleQuoteCostChange('material_cost', e.target.value)}
                        disabled={readonly || actionBusy}
                        placeholder="85000"
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Gemstone / Pearl Inlays (₹)
                      <input
                        type="number"
                        value={quoteForm.gemstone_cost}
                        onChange={e => handleQuoteCostChange('gemstone_cost', e.target.value)}
                        disabled={readonly || actionBusy}
                        placeholder="25000"
                      />
                    </label>
                    <label>
                      Making Charges / Craft (₹)
                      <input
                        type="number"
                        value={quoteForm.making_cost}
                        onChange={e => handleQuoteCostChange('making_cost', e.target.value)}
                        disabled={readonly || actionBusy}
                        placeholder="18000"
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      GST Tax (3%) (₹)
                      <input
                        type="number"
                        value={quoteForm.tax_cost}
                        onChange={e => setQuoteForm({ ...quoteForm, tax_cost: e.target.value })}
                        disabled={readonly || actionBusy}
                      />
                    </label>
                    <label>
                      <strong>Total Quoted Amount (₹)</strong>
                      <input
                        type="number"
                        value={quoteForm.quoted_amount}
                        onChange={e => setQuoteForm({ ...quoteForm, quoted_amount: e.target.value })}
                        required
                        disabled={readonly || actionBusy}
                        style={{ fontWeight: '700', fontSize: '15px' }}
                      />
                    </label>
                  </div>

                  <label>
                    Artisan & Workshop Notes for Customer
                    <textarea
                      rows={2}
                      value={quoteForm.admin_notes}
                      onChange={e => setQuoteForm({ ...quoteForm, admin_notes: e.target.value })}
                      disabled={readonly || actionBusy}
                      placeholder="Crafted in 22K certified hallmarked gold with natural Zambian emeralds. Delivery in 14 working days."
                    />
                  </label>

                  <button
                    type="submit"
                    className="button dark full"
                    disabled={readonly || actionBusy || !quoteForm.quoted_amount}
                  >
                    <FileText size={16} /> Issue Formal Quotation to Customer
                  </button>
                </form>
              </div>

              {/* Status Update Form */}
              <div className="drawer-section">
                <h4>Design Workflow Status</h4>
                <form onSubmit={handleUpdateStatus} className="status-form">
                  <div className="form-row">
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      disabled={readonly || actionBusy}
                    >
                      <option value="Draft">Draft</option>
                      <option value="AI Generated">AI Generated</option>
                      <option value="Submitted for Review">Submitted for Review</option>
                      <option value="Under Technical Review">Under Technical Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Quotation Accepted">Quotation Accepted</option>
                      <option value="In Production">In Production</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    <button
                      type="submit"
                      className="button outline"
                      disabled={readonly || actionBusy || newStatus === selectedDesign.status}
                    >
                      Update Status
                    </button>
                  </div>
                </form>
              </div>

              {/* Customer AI Quota Management (Audit Logged) */}
              <div className="drawer-section">
                <h4>Customer AI Quota Controls</h4>
                <p className="small muted">
                  Enforces the 3-generation per customer policy. Any quota reset or grant must include an audit justification.
                </p>
                <form onSubmit={handleUpdateQuota} className="quota-form">
                  <div className="form-row">
                    <label>
                      Used Generations
                      <input
                        type="number"
                        value={quotaForm.count}
                        onChange={e => setQuotaForm({ ...quotaForm, count: e.target.value })}
                        disabled={readonly || actionBusy}
                      />
                    </label>
                    <label>
                      Account Limit
                      <input
                        type="number"
                        value={quotaForm.limit}
                        onChange={e => setQuotaForm({ ...quotaForm, limit: e.target.value })}
                        disabled={readonly || actionBusy}
                      />
                    </label>
                  </div>
                  <label>
                    Audit Reason (Required)
                    <input
                      type="text"
                      value={quotaForm.reason}
                      onChange={e => setQuotaForm({ ...quotaForm, reason: e.target.value })}
                      placeholder="E.g. VIP client requesting extra variation"
                      required
                      disabled={readonly || actionBusy}
                    />
                  </label>
                  <button
                    type="submit"
                    className="button outline"
                    disabled={readonly || actionBusy}
                  >
                    Save Quota Override
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
