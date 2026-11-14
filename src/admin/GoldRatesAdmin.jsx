import React, { useState, useEffect } from 'react';
import {
  Coins as CoinsIcon,
  Upload,
  Download,
  Check,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Calendar
} from 'lucide-react';
import { api } from '../api.js';

const money = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(v || 0);

const date = (v) =>
  v
    ? new Date(v).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—';

export function GoldRatesAdmin({ readonly, staff, refreshParent }) {
  const [ratesData, setRatesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  // Manual update form state
  const [manualMetal, setManualMetal] = useState('Gold');
  const [manualPurity, setManualPurity] = useState('24K');
  const [manualUnit, setManualUnit] = useState('10g');
  const [manualRate, setManualRate] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualNotes, setManualNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Bulk import state
  const [importBatch, setImportBatch] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);

  // History filtering state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMetal, setHistoryMetal] = useState('All');
  const [historyPurity, setHistoryPurity] = useState('All');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  // Fetch rates and history
  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: historyPage,
        limit: 15
      });
      if (historyMetal !== 'All') params.set('metal', historyMetal);
      if (historyPurity !== 'All') params.set('purity', historyPurity);
      if (historyQuery.trim()) params.set('q', historyQuery.trim());
      if (historyFrom) params.set('from', historyFrom);
      if (historyTo) params.set('to', historyTo);

      const res = await api(`/admin/rates?${params.toString()}`);
      setRatesData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch metal rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [historyPage, historyMetal, historyPurity, historyFrom, historyTo]);

  // Adjust default purity & unit when metal switches
  const handleMetalChange = (metal) => {
    setManualMetal(metal);
    if (metal === 'Gold') {
      setManualPurity('24K');
      setManualUnit('10g');
    } else {
      setManualPurity('999');
      setManualUnit('kg');
    }
  };

  // Calculate live preview of INR per gram for manual form
  const getCalculatedRatePerGram = () => {
    const val = parseFloat(manualRate);
    if (isNaN(val) || val <= 0) return 0;
    if (manualUnit === '10g') return val / 10;
    if (manualUnit === 'kg') return val / 1000;
    return val;
  };

  // Submit manual rate update
  const handleManualSubmit = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    setShowConfirmModal(false);

    try {
      const payload = {
        metal: manualMetal,
        purity: manualPurity,
        unit: manualUnit,
        rate: parseFloat(manualRate),
        effective_date: manualDate,
        notes: manualNotes.trim() || undefined
      };

      const res = await api('/admin/rates', payload);
      setSuccess(res.message || 'Metal rate updated successfully');
      setManualRate('');
      setManualNotes('');
      await fetchRates();
      if (refreshParent) refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to update metal rate');
    } finally {
      setBusy(false);
    }
  };

  // Handle bulk file preview (CSV or Excel)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess('');
    setImportBatch(null);
    setImportErrors([]);

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds maximum 5 MB limit');
      }

      let payload = {};
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isExcel) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const dataUrl = await base64Promise;
        payload = { file: dataUrl };
      } else {
        const text = await file.text();
        payload = { csv: text };
      }

      const res = await api('/admin/rates/preview', payload);
      setImportBatch(res);
      setImportErrors(res.errors || []);
    } catch (err) {
      setError(err.message || 'Failed to parse rates file');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Publish staged bulk batch
  const handlePublishBatch = async () => {
    if (!importBatch?.id) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const res = await api('/admin/rates/publish', { id: importBatch.id });
      setSuccess(`Successfully published Batch #${importBatch.id}: ${res.created} rate(s) applied.`);
      setImportBatch(null);
      await fetchRates();
      if (refreshParent) refreshParent();
    } catch (err) {
      setError(err.message || 'Failed to publish rates batch');
    } finally {
      setBusy(false);
    }
  };

  const currentGold = ratesData?.current?.gold || {};
  const currentSilver = ratesData?.current?.silver || {};

  return (
    <div className="admin-rates-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notice Banner */}
      <div className="notice" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldCheck size={20} color="var(--gold, #c5a059)" />
        <div>
          <strong>Official Internal Metal Pricing Active</strong>
          <p style={{ margin: '2px 0 0', fontSize: '12px' }}>
            All external spot pricing APIs have been completely removed. Gold and Silver product prices, coins, cart quotes, and checkout calculations derive exclusively from these internally approved admin rates with full auditability.
          </p>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {success && <div className="notice" role="status" style={{ borderLeftColor: '#2e7d32', color: '#1b5e20' }}>{success}</div>}

      {/* Active Rates Section */}
      <div className="admin-panel">
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">APPROVED BENCHMARKS</span>
            <h3 style={{ margin: 0 }}>Current Active Metal Rates</h3>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={fetchRates}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Rates
          </button>
        </div>

        {/* Gold Purities Grid */}
        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted, #666)', marginBottom: '12px' }}>
          Gold Rates (Per 10 Grams & Per Gram)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {['24K', '22K', '20K', '18K', '14K'].map((purity) => {
            const r = currentGold[purity];
            return (
              <div
                key={purity}
                style={{
                  background: 'var(--card-bg, #fbfaf8)',
                  border: '1px solid var(--border, #e8e4dc)',
                  borderRadius: '6px',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{purity} Gold</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: r?.is_fresh ? '#e8f5e9' : '#ffebee',
                      color: r?.is_fresh ? '#2e7d32' : '#c62828'
                    }}
                  >
                    {r ? (r.is_fresh ? 'Fresh' : 'Stale') : 'Pending'}
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-dark, #102124)' }}>
                  {r ? money(r.rate_per_10g) : '—'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted, #666)', marginTop: '2px' }}>
                  {r ? `${money(r.inr_per_gram)} / gram` : 'Awaiting admin entry'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted, #999)', marginTop: '8px', borderTop: '1px solid #f0eee8', paddingTop: '6px' }}>
                  Effective: {r?.effective_date || '—'}<br />
                  By: {r?.staff_name || 'System'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Silver Purities Grid */}
        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted, #666)', marginBottom: '12px' }}>
          Silver Rates (Per Kilogram & Per Gram)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {['999', '925'].map((purity) => {
            const r = currentSilver[purity];
            const label = purity === '999' ? '999 Fine Bullion Silver' : '925 Sterling Jewellery Silver';
            return (
              <div
                key={purity}
                style={{
                  background: 'var(--card-bg, #fbfaf8)',
                  border: '1px solid var(--border, #e8e4dc)',
                  borderRadius: '6px',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{label}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: r?.is_fresh ? '#e8f5e9' : '#ffebee',
                      color: r?.is_fresh ? '#2e7d32' : '#c62828'
                    }}
                  >
                    {r ? (r.is_fresh ? 'Fresh' : 'Stale') : 'Pending'}
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-dark, #102124)' }}>
                  {r ? (purity === '999' ? `${money(r.rate_per_kg)} / kg` : `${money(r.inr_per_gram)} / g`) : '—'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted, #666)', marginTop: '2px' }}>
                  {r ? `${money(r.inr_per_gram)} / gram` : 'Awaiting admin entry'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted, #999)', marginTop: '8px', borderTop: '1px solid #f0eee8', paddingTop: '6px' }}>
                  Effective: {r?.effective_date || '—'}<br />
                  By: {r?.staff_name || 'System'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Entry & Bulk Upload Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Method A: Manual Entry */}
        <div className="admin-panel">
          <div className="panel-title" style={{ marginBottom: '14px' }}>
            <span className="eyebrow">METHOD A</span>
            <h3 style={{ margin: 0 }}>Manual Rate Entry</h3>
          </div>
          <p className="small muted">
            Update benchmark rates for any gold or silver purity. All product and coin prices recalculate immediately upon publication.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (getCalculatedRatePerGram() <= 0) {
                setError('Please enter a valid positive numeric rate');
                return;
              }
              setShowConfirmModal(true);
            }}
          >
            {/* Metal Selection */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="metal"
                  checked={manualMetal === 'Gold'}
                  onChange={() => handleMetalChange('Gold')}
                  disabled={readonly || busy}
                />
                <strong>Gold</strong>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="metal"
                  checked={manualMetal === 'Silver'}
                  onChange={() => handleMetalChange('Silver')}
                  disabled={readonly || busy}
                />
                <strong>Silver</strong>
              </label>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Purity Selection */}
              <label>
                Purity
                <select
                  value={manualPurity}
                  onChange={(e) => setManualPurity(e.target.value)}
                  disabled={readonly || busy}
                >
                  {manualMetal === 'Gold' ? (
                    <>
                      <option value="24K">24K (99.9% Pure)</option>
                      <option value="22K">22K (91.6% Standard)</option>
                      <option value="20K">20K (83.3%)</option>
                      <option value="18K">18K (75.0% Fine)</option>
                      <option value="14K">14K (58.5%)</option>
                    </>
                  ) : (
                    <>
                      <option value="999">999 (Pure Bullion)</option>
                      <option value="925">925 (Sterling Silver)</option>
                    </>
                  )}
                </select>
              </label>

              {/* Unit Selection */}
              <label>
                Rate Unit
                <select
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  disabled={readonly || busy}
                >
                  {manualMetal === 'Gold' ? (
                    <>
                      <option value="10g">Per 10 Grams (Standard)</option>
                      <option value="g">Per Gram</option>
                    </>
                  ) : (
                    <>
                      <option value="kg">Per Kilogram (Standard)</option>
                      <option value="g">Per Gram</option>
                    </>
                  )}
                </select>
              </label>

              {/* Numeric Rate Input */}
              <label>
                Price (INR)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={manualUnit === '10g' ? 'e.g. 100000' : manualUnit === 'kg' ? 'e.g. 120000' : 'e.g. 9200'}
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  disabled={readonly || busy}
                  required
                />
              </label>

              {/* Effective Date */}
              <label>
                Effective Date
                <input
                  type="date"
                  value={manualDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setManualDate(e.target.value)}
                  disabled={readonly || busy}
                  required
                />
              </label>

              {/* Notes */}
              <label style={{ gridColumn: 'span 2' }}>
                Admin Notes / Reason (Optional)
                <input
                  type="text"
                  placeholder="e.g. Morning Mumbai bullion desk revision"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  disabled={readonly || busy}
                />
              </label>
            </div>

            {/* Calculated Rate Preview */}
            {manualRate && parseFloat(manualRate) > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'var(--paper, #f7f5f0)',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Calculated Rate: </strong>
                {money(getCalculatedRatePerGram())} / gram
                {manualMetal === 'Gold' && manualUnit !== '10g' && ` · ${money(getCalculatedRatePerGram() * 10)} / 10g`}
                {manualMetal === 'Silver' && manualUnit !== 'kg' && ` · ${money(getCalculatedRatePerGram() * 1000)} / kg`}
              </div>
            )}

            <button
              type="submit"
              className="button dark full"
              style={{ marginTop: '16px' }}
              disabled={readonly || busy || !manualRate || parseFloat(manualRate) <= 0}
            >
              Preview & Save Rate <Check size={16} />
            </button>
          </form>
        </div>

        {/* Method B: Bulk Import (CSV & Excel) */}
        <div className="admin-panel">
          <div className="panel-title" style={{ marginBottom: '14px' }}>
            <span className="eyebrow">METHOD B</span>
            <h3 style={{ margin: 0 }}>Bulk Import (CSV / Excel)</h3>
          </div>
          <p className="small muted">
            Upload metal rates in bulk using CSV or Excel (.xlsx / .xls). Preview validated rows, compare price diffs, and publish with one click.
          </p>

          {/* Download Templates */}
          <div className="download-links" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <a href="/api/admin/samples/metal-rates-template.csv" download className="underlink" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <Download size={12} /> CSV Template
            </a>
            <a href="/api/admin/samples/metal-rates-template.xlsx" download className="underlink" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <FileSpreadsheet size={12} /> Excel (.xlsx) Template
            </a>
            <a href="/api/admin/samples/metal-rates-example.csv" download className="underlink" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <Download size={12} /> Example CSV
            </a>
            <a href="/api/admin/samples/metal-rates-example.xlsx" download className="underlink" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <FileSpreadsheet size={12} /> Example Excel
            </a>
          </div>

          {/* Upload Zone */}
          <label className="upload-zone" style={{ cursor: readonly ? 'not-allowed' : 'pointer', borderStyle: 'dashed' }}>
            <Upload size={24} color="var(--gold, #c5a059)" />
            <strong>{importing ? 'Validating File…' : 'Choose CSV or Excel to Preview'}</strong>
            <span style={{ fontSize: '11px', color: 'var(--muted, #666)' }}>Supports .csv, .xlsx, .xls · Max 5 MB</span>
            <input
              type="file"
              accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={readonly || importing || busy}
              onChange={handleFileUpload}
            />
          </label>

          {/* Import Batch Preview */}
          {importBatch && (
            <div className="import-preview" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Batch #{importBatch.id} · {importBatch.status.toUpperCase()}</span>
                <span className="small muted">{importBatch.summary?.total_rows || 0} rows</span>
              </div>

              {/* Row-Level Errors */}
              {importErrors.length > 0 ? (
                <div style={{ background: '#ffebee', padding: '12px', borderRadius: '4px', marginBottom: '12px' }}>
                  <p className="error" style={{ margin: '0 0 8px', fontWeight: 600 }}>
                    {importErrors.length} validation error(s) found. Publication blocked until corrected:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#c62828' }}>
                    {importErrors.slice(0, 6).map((e, idx) => (
                      <li key={idx}>Row {e.row} · {e.field}: "{e.value}" → {e.correction}</li>
                    ))}
                  </ul>
                  {importErrors.length > 6 && (
                    <small style={{ display: 'block', marginTop: '6px', color: '#c62828' }}>
                      + {importErrors.length - 6} additional error(s). Check your template formatting.
                    </small>
                  )}
                </div>
              ) : (
                /* Staged Changes Table */
                <>
                  <div className="table-wrap" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '12px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Metal & Purity</th>
                          <th>Entered Rate</th>
                          <th>Calculated /g</th>
                          <th>Previous</th>
                          <th>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importBatch.changes?.map((c, idx) => (
                          <tr key={idx}>
                            <td>{c.metal} {c.purity}</td>
                            <td>{money(c.entered_rate)} / {c.unit}</td>
                            <td>{money(c.inr_per_gram)}</td>
                            <td>{c.before ? money(c.before) : 'New'}</td>
                            <td style={{ color: c.diff > 0 ? '#2e7d32' : c.diff < 0 ? '#c62828' : 'inherit' }}>
                              {c.diff > 0 ? `+${money(c.diff)}` : c.diff < 0 ? money(c.diff) : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="button dark full"
                    onClick={handlePublishBatch}
                    disabled={readonly || busy}
                  >
                    Confirm & Publish Batch #{importBatch.id} <Check size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Manual Update */}
      {showConfirmModal && (
        <div
          className="admin-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="admin-modal-card"
            style={{
              background: '#fff',
              maxWidth: '460px',
              width: '100%',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Confirm Metal Rate Update</h3>
            <p className="small muted">
              Please review the rate change before saving. This will immediately update catalogue prices across all products and coins.
            </p>

            <div style={{ background: '#fbfaf8', border: '1px solid #e8e4dc', borderRadius: '6px', padding: '14px', margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted">Metal & Purity:</span>
                <strong>{manualMetal} {manualPurity}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted">Entered Price:</span>
                <strong>{money(parseFloat(manualRate))} per {manualUnit}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted">Normalized Rate:</span>
                <strong style={{ color: 'var(--gold, #c5a059)' }}>{money(getCalculatedRatePerGram())} / gram</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted">Effective Date:</span>
                <span>{manualDate}</span>
              </div>
              {manualNotes && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Note:</span>
                  <span className="small">{manualNotes}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button dark"
                onClick={handleManualSubmit}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Confirm & Save Rate'} <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate History Table */}
      <div className="admin-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">AUDIT & TRACEABILITY</span>
            <h3 style={{ margin: 0 }}>Rate History & Modifications</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a
              href="/api/admin/rates/export?format=csv"
              download
              className="underlink"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <Download size={14} /> Export CSV
            </a>
            <a
              href="/api/admin/rates/export?format=xlsx"
              download
              className="underlink"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <FileSpreadsheet size={14} /> Export Excel (.xlsx)
            </a>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="admin-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div className="search-box" style={{ flex: '1 1 200px' }}>
            <Search size={14} />
            <input
              type="search"
              placeholder="Search admin, supplier, notes…"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRates()}
            />
          </div>

          <select
            value={historyMetal}
            onChange={(e) => { setHistoryMetal(e.target.value); setHistoryPage(1); }}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="All">All Metals</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
          </select>

          <select
            value={historyPurity}
            onChange={(e) => { setHistoryPurity(e.target.value); setHistoryPage(1); }}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="All">All Purities</option>
            <option value="24K">24K Gold</option>
            <option value="22K">22K Gold</option>
            <option value="20K">20K Gold</option>
            <option value="18K">18K Gold</option>
            <option value="14K">14K Gold</option>
            <option value="999">999 Silver</option>
            <option value="925">925 Silver</option>
          </select>

          <input
            type="date"
            placeholder="From"
            value={historyFrom}
            onChange={(e) => { setHistoryFrom(e.target.value); setHistoryPage(1); }}
            style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
          />
          <input
            type="date"
            placeholder="To"
            value={historyTo}
            onChange={(e) => { setHistoryTo(e.target.value); setHistoryPage(1); }}
            style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
          />

          {(historyMetal !== 'All' || historyPurity !== 'All' || historyQuery || historyFrom || historyTo) && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setHistoryMetal('All');
                setHistoryPurity('All');
                setHistoryQuery('');
                setHistoryFrom('');
                setHistoryTo('');
                setHistoryPage(1);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* History Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Metal</th>
                <th>Purity</th>
                <th>Entered Rate & Unit</th>
                <th>Rate / Gram</th>
                <th>Effective Date</th>
                <th>Published At</th>
                <th>Updated By</th>
                <th>Source</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ratesData?.history?.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td><strong>{r.metal || 'Gold'}</strong></td>
                  <td>{r.purity}</td>
                  <td>{r.original_rate ? `${money(r.original_rate)} / ${r.original_unit}` : '—'}</td>
                  <td><strong>{money(r.inr_per_gram)}</strong></td>
                  <td>{r.effective_date}</td>
                  <td>{date(r.published_at || r.source_timestamp)}</td>
                  <td>{r.staff_name || 'System'}</td>
                  <td>
                    <span style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                      {r.source_type || 'manual'}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--muted, #666)' }}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!ratesData?.history || ratesData.history.length === 0) && (
            <p className="empty">No rate records found matching your filters.</p>
          )}
        </div>

        {/* Pagination Controls */}
        {ratesData?.pagination && ratesData.pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span className="small muted">
              Page {ratesData.pagination.page} of {ratesData.pagination.totalPages} ({ratesData.pagination.total} records)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button outline small-button"
                disabled={ratesData.pagination.page <= 1 || loading}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="button outline small-button"
                disabled={ratesData.pagination.page >= ratesData.pagination.totalPages || loading}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
