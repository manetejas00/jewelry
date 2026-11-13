import React, {useEffect, useMemo, useState} from 'react';
import {request} from './api.js';

const skills = [
  ['product-description-generator', 'Product description'],
  ['product-title-optimization', 'Product title'],
  ['product-page-seo', 'Product page SEO']
];

function draftText(draft) {
  return draft.output || {};
}

export default function AiCopy({products, readonly, onPublished}) {
  const [skill, setSkill] = useState(skills[0][0]);
  const [sku, setSku] = useState(products[0]?.sku || '');
  const [tone, setTone] = useState('Luxury');
  const [drafts, setDrafts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [applyName, setApplyName] = useState(false);
  const [applyDescription, setApplyDescription] = useState(false);
  const [applySearch, setApplySearch] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selected = drafts.find(draft => draft.id === selectedId) || null;
  const product = products.find(item => item.sku === (selected?.sku || sku));
  const output = selected ? draftText(selected) : null;
  const warnings = output?.warnings || [];

  async function load(preferId) {
    const rows = await request('/admin/ai/drafts');
    setDrafts(rows);
    setSelectedId(current => preferId || current || rows[0]?.id || null);
  }

  useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!sku && products[0]?.sku) setSku(products[0].sku);
  }, [products, sku]);

  useEffect(() => {
    if (!selected?.output) return;
    setApplyName(Boolean(selected.output.proposed_name) && selected.skill === 'product-title-optimization');
    setApplyDescription(Boolean(selected.output.proposed_description));
    setApplySearch(selected.skill === 'product-page-seo' && Boolean(selected.output.seo_title || selected.output.meta_description));
    setAcknowledge(false);
  }, [selectedId, selected?.skill, selected?.output?.proposed_name, selected?.output?.proposed_description, selected?.output?.seo_title, selected?.output?.meta_description]);

  const pendingForSelection = useMemo(
    () => drafts.some(draft => draft.status === 'pending' && draft.sku === sku && draft.skill === skill),
    [drafts, sku, skill]
  );

  async function run(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const draft = await request('/admin/ai/drafts', {sku, skill, tone}, 'POST', 90000);
      setNotice('Draft ready for review. The live catalogue is unchanged.');
      await load(draft.id);
    } catch (err) {
      setError(err.message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function decide(kind) {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (kind === 'reject') {
        await request(`/admin/ai/drafts/${selected.id}/reject`, {});
        setNotice('Draft rejected. The live catalogue is unchanged.');
      } else {
        await request(`/admin/ai/drafts/${selected.id}/approve`, {
          apply_name: applyName,
          apply_description: applyDescription,
          apply_search: applySearch,
          acknowledge_warnings: acknowledge
        });
        setNotice('Published text is now on the product.');
        if (onPublished) await onPublished();
      }
      await load(selected.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-panel">
    <span className="eyebrow">CATALOGUE COPY</span>
    <h3>Draft a name or description</h3>
    <p className="small muted">Generated text stays in this review list until you approve a name, a description, or both. Prices, stock, metal, purity, and weight are left as they are.</p>
    <form className="form-grid" onSubmit={run}>
      <label>Skill
        <select value={skill} onChange={e => setSkill(e.target.value)} disabled={busy}>
          {skills.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label>Product
        <select value={sku} onChange={e => setSku(e.target.value)} disabled={busy || !products.length}>
          {products.map(item => <option key={item.sku} value={item.sku}>{item.name} · {item.sku}</option>)}
        </select>
      </label>
      <label>Tone
        <select value={tone} onChange={e => setTone(e.target.value)} disabled={busy}>
          {['Luxury', 'Professional', 'Friendly'].map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="span-two">
        <button className="button dark" disabled={busy || readonly || !sku || pendingForSelection}>{busy ? 'Working…' : 'Create draft'}</button>
        {pendingForSelection && <p className="small">A pending draft already exists for this product and skill. Review it below.</p>}
      </div>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {selected && <div className="copy-review">
      <p className="small"><strong>{selected.skill}</strong> · {selected.sku} · {selected.status} · {selected.tone}</p>
      {selected.error && <p className="error">{selected.error}</p>}
      {output && <div className="copy-columns">
        <div>
          <h4>Live catalogue</h4>
          <p><strong>{product?.name || selected.input?.name}</strong></p>
          <p>{product?.description || selected.input?.description || 'No description yet.'}</p>
        </div>
        <div>
          <h4>Draft</h4>
          {output.proposed_name && <p><strong>{output.proposed_name}</strong></p>}
          {output.proposed_description && <p>{output.proposed_description}</p>}
          {output.seo_title && <p className="small muted">Page title: {output.seo_title}</p>}
          {output.meta_description && <p className="small muted">Search snippet: {output.meta_description}</p>}
          {output.notes && <p className="small muted">{output.notes}</p>}
        </div>
      </div>}
      {warnings.length > 0 && <div className="notice">This draft uses claims that are not in the stored product: {warnings.join(', ')}. Publishing requires confirmation.</div>}
      {selected.status === 'pending' && <div className="copy-actions">
        <label className="checkbox"><input type="checkbox" checked={applyName} disabled={!output?.proposed_name || busy || readonly} onChange={e => setApplyName(e.target.checked)}/> Publish name</label>
        <label className="checkbox"><input type="checkbox" checked={applyDescription} disabled={!output?.proposed_description || busy || readonly} onChange={e => setApplyDescription(e.target.checked)}/> Publish description</label>
        {(output?.seo_title || output?.meta_description) && <label className="checkbox"><input type="checkbox" checked={applySearch} disabled={busy || readonly} onChange={e => setApplySearch(e.target.checked)}/> Publish search text</label>}
        {warnings.length > 0 && <label className="checkbox"><input type="checkbox" checked={acknowledge} disabled={busy || readonly} onChange={e => setAcknowledge(e.target.checked)}/> I have reviewed these claims</label>}
        <button type="button" className="button dark small-button" disabled={busy || readonly || (!applyName && !applyDescription && !applySearch) || (warnings.length > 0 && !acknowledge)} onClick={() => decide('approve')}>Publish</button>
        <button type="button" className="text-button" disabled={busy || readonly} onClick={() => decide('reject')}>Reject draft</button>
      </div>}
    </div>}
    <h4>Recent copy operations</h4>
    <div className="table-wrap"><table>
      <thead><tr><th>Draft</th><th>Product</th><th>Skill</th><th>Status</th></tr></thead>
      <tbody>{drafts.map(draft => <tr key={draft.id}>
        <td><button type="button" className="underlink" onClick={() => setSelectedId(draft.id)}>#{draft.id}</button></td>
        <td>{draft.sku}</td>
        <td>{skills.find(([id]) => id === draft.skill)?.[1] || draft.skill}</td>
        <td>{draft.status}</td>
      </tr>)}</tbody>
    </table>{!drafts.length && <p className="small muted">No copy drafts yet.</p>}</div>
  </div>;
}
