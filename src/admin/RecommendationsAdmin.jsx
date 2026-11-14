import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import CommonStatusBadge from './components/CommonStatusBadge.jsx';
import { Sparkles, RefreshCw, CheckCircle2, ShieldCheck, Database, Zap } from 'lucide-react';

export function RecommendationsAdmin({ readonly }) {
  const [settings, setSettings] = useState({
    ai_enabled: true,
    max_similar: 6,
    max_you_may_like: 6,
    max_complete_look: 4,
    provider: 'internal-hybrid-engine'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/admin/recommendations/settings');
      if (data) setSettings(data);
    } catch (err) {
      setError(err.message || 'Failed to load recommendation settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api('/admin/recommendations/settings', settings, 'PUT');
      if (updated) setSettings(updated);
      setMessage('Recommendation settings saved and cache invalidated.');
    } catch (err) {
      setError(err.message || 'Failed to save recommendation settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setError('');
    setMessage('');
    try {
      await api('/admin/recommendations/clear-cache', {}, 'POST');
      setMessage('In-memory recommendation cache cleared successfully.');
    } catch (err) {
      setError(err.message || 'Failed to clear cache');
    }
  };

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <span className="eyebrow">AI & MERCHANDISING INTELLIGENCE</span>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: '24px' }}>PDP Recommendation Engine</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="text-button" onClick={handleClearCache} disabled={readonly}><RefreshCw size={14} /> Clear Cache</button>
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: '16px' }}>{error}</div>}
      {message && <div className="notice" role="status" style={{ marginBottom: '16px' }}>{message}</div>}

      <div className="admin-two" style={{ marginBottom: '24px' }}>
        <div className="admin-panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Zap size={20} color="var(--gold-dark)" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Hybrid AI Recommendation Strategy</h3>
          </div>
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            Our recommendation pipeline delivers sub-10ms response times by orchestrating multi-attribute cosine similarity across categories, metals, craftsmanship, and materials with automatic fallback to relational database clustering.
          </p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="test-badge">15-Min TTL In-Memory Cache</span>
            <span className="test-badge">Zero-Downtime DB Fallback</span>
            <span className="test-badge">Live Metal Rate Aware</span>
          </div>
        </div>

        <div className="admin-panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Sparkles size={20} color="var(--gold-dark)" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Configured Shelves</h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--charcoal)', lineHeight: 1.8 }}>
            <li><strong>Similar Products:</strong> Same category, matching purity & gemstone accents.</li>
            <li><strong>You May Also Like:</strong> Same collection or complementary motif styles.</li>
            <li><strong>Complete the Look:</strong> Cross-category pairing (e.g. Necklace + Matching Earrings).</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.ai_enabled}
            disabled={readonly}
            onChange={e => setSettings({ ...settings, ai_enabled: e.target.checked })}
            style={{ width: '18px', height: '18px' }}
          />
          <div>
            <strong>Enable AI Hybrid Recommendation Engine</strong>
            <small style={{ display: 'block', color: 'var(--muted)' }}>When disabled, deterministic relational category filtering is used as fallback.</small>
          </div>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <label>
            Max "Similar Products"
            <input
              type="number"
              min="2"
              max="12"
              value={settings.max_similar}
              disabled={readonly}
              onChange={e => setSettings({ ...settings, max_similar: parseInt(e.target.value, 10) || 6 })}
            />
          </label>
          <label>
            Max "You May Also Like"
            <input
              type="number"
              min="2"
              max="12"
              value={settings.max_you_may_like}
              disabled={readonly}
              onChange={e => setSettings({ ...settings, max_you_may_like: parseInt(e.target.value, 10) || 6 })}
            />
          </label>
          <label>
            Max "Complete the Look"
            <input
              type="number"
              min="1"
              max="8"
              value={settings.max_complete_look}
              disabled={readonly}
              onChange={e => setSettings({ ...settings, max_complete_look: parseInt(e.target.value, 10) || 4 })}
            />
          </label>
        </div>

        {!readonly && (
          <div style={{ marginTop: '12px' }}>
            <button type="submit" className="button dark" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
