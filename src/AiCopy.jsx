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
  const [checked, setChecked] = useState(() => new Set());
  const [bulkClaims, setBulkClaims] = useState(false);
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
  const pendingDrafts = drafts.filter(draft => draft.status === 'pending');
  const selectedDrafts = pendingDrafts.filter(draft => checked.has(draft.id));
  const selectedNeedClaims = selectedDrafts.some(draft => draft.output?.warnings?.length);

  function toggleDraft(id) {
    setChecked(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePending(on) {
    setChecked(on ? new Set(pendingDrafts.map(draft => draft.id)) : new Set());
    if (!on) setBulkClaims(false);
  }

  function publishBody(draft) {
    const output = draft.output || {};
    return {
      apply_name: Boolean(output.proposed_name),
      apply_description: Boolean(output.proposed_description),
      apply_search: Boolean(output.seo_title || output.meta_description),
      acknowledge_warnings: Boolean(output.warnings?.length)
    };
  }

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

  async function bulk(kind) {
    if (!selectedDrafts.length || readonly) return;
    setBusy(true);
    setError('');
    setNotice('');
    const done = [];
    const skipped = [];
    const failed = [];
    for (const draft of selectedDrafts) {
      try {
        if (kind === 'reject') {
          await request(`/admin/ai/drafts/${draft.id}/reject`, {});
          done.push(draft);
          continue;
        }
        if (draft.output?.warnings?.length && !bulkClaims) {
          skipped.push(draft);
          continue;
        }
        const body = publishBody(draft);
        if (!body.apply_name && !body.apply_description && !body.apply_search) {
          skipped.push(draft);
          continue;
        }
        await request(`/admin/ai/drafts/${draft.id}/approve`, body);
        done.push(draft);
      } catch (err) {
        failed.push(`${draft.sku}: ${err.message}`);
      }
    }
    setChecked(new Set());
    setBulkClaims(false);
    await load().catch(() => {});
    if (kind === 'publish' && done.length && onPublished) await onPublished();
    if (done.length) {
      setNotice(kind === 'reject'
        ? `Rejected ${done.length} draft${done.length === 1 ? '' : 's'}. The live catalogue is unchanged.`
        : `Published ${done.length} draft${done.length === 1 ? '' : 's'}.`);
    }
    const problems = [];
    if (skipped.length) problems.push(`Left ${skipped.length} selected draft${skipped.length === 1 ? '' : 's'} pending. Review claims before publishing them.`);
    if (failed.length) problems.push(failed.join(' · '));
    if (problems.length) setError(problems.join(' '));
    setBusy(false);
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
          {products.map(item => <option key={item.sku} value={item.sku}>{item.name} · {item.sku}{item.slug ? ` · ${item.slug}` : ''}</option>)}
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
      <p className="small"><strong>{selected.skill}</strong> · {selected.sku}{product?.slug ? ` · ${product.slug}` : ''} · {selected.status} · {selected.tone}</p>
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
    <div className="reviews-bulk-bar">
      <label className="checkbox">
        <input
          type="checkbox"
          checked={pendingDrafts.length > 0 && selectedDrafts.length === pendingDrafts.length}
          ref={node => { if (node) node.indeterminate = selectedDrafts.length > 0 && selectedDrafts.length < pendingDrafts.length; }}
          onChange={e => togglePending(e.target.checked)}
          disabled={busy || readonly || !pendingDrafts.length}
          aria-label="Select all pending drafts"
        />
        Select pending
      </label>
      {selectedDrafts.length > 0 && <span className="selected-count-pill">{selectedDrafts.length} selected</span>}
      {!readonly && selectedDrafts.length > 0 && <div className="bulk-action-buttons">
        {selectedNeedClaims && <label className="checkbox"><input type="checkbox" checked={bulkClaims} disabled={busy} onChange={e => setBulkClaims(e.target.checked)}/> I have reviewed these claims</label>}
        <button type="button" className="button dark sm" disabled={busy || (selectedNeedClaims && !bulkClaims)} onClick={() => bulk('publish')}>Publish selected</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => bulk('reject')}>Reject selected</button>
      </div>}
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>Select</th><th>Draft</th><th>Product</th><th>Slug</th><th>Skill</th><th>Status</th></tr></thead>
      <tbody>{drafts.map(draft => {
        const pending = draft.status === 'pending';
        const slug = products.find(item => item.sku === draft.sku)?.slug || '';
        return <tr key={draft.id}>
          <td><input type="checkbox" checked={pending && checked.has(draft.id)} disabled={!pending || busy || readonly} onChange={() => toggleDraft(draft.id)} aria-label={`Select draft ${draft.id}`}/></td>
          <td><button type="button" className="underlink" onClick={() => setSelectedId(draft.id)}>#{draft.id}</button></td>
          <td>{draft.sku}</td>
          <td>{slug ? <a href={`/products/${slug}`} target="_blank" rel="noreferrer">{slug}</a> : '—'}</td>
          <td>{skills.find(([id]) => id === draft.skill)?.[1] || draft.skill}</td>
          <td>{draft.status}</td>
        </tr>;
      })}</tbody>
    </table>{!drafts.length && <p className="small muted">No copy drafts yet.</p>}</div>
  </div>;
}
