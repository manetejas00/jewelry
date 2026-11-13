import React, {useEffect, useState} from 'react';
import {api} from './api.js';

const emptyForm = {email: '', password: '', role: 'manager'};

export default function StaffAccess() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const list = await api('/admin/staff');
    setRows(list);
  }

  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  async function toggle(row) {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/staff/${row.id}/access`, {disabled: !row.disabled_at});
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addStaff(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/staff', form);
      setForm(emptyForm);
      setAdding(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-panel">
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:8}}>
      <div>
        <h3 style={{marginBottom:8}}>Staff access</h3>
        <p className="small muted">Disabled staff cannot sign in. Keep at least one active owner.</p>
      </div>
      <button type="button" className="button dark small-button" disabled={busy} onClick={() => {setError(''); setAdding(open => !open);}}>
        {adding ? 'Cancel' : 'Add staff'}
      </button>
    </div>
    {adding && <form onSubmit={addStaff} style={{display:'grid', gridTemplateColumns:'1.4fr 1.2fr .8fr auto', gap:12, alignItems:'end', margin:'8px 0 18px'}}>
      <label>Email
        <input type="email" autoComplete="off" maxLength={254} required value={form.email} onChange={e => setForm(current => ({...current, email: e.target.value}))}/>
      </label>
      <label>Password
        <input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={form.password} onChange={e => setForm(current => ({...current, password: e.target.value}))}/>
      </label>
      <label>Role
        <select value={form.role} onChange={e => setForm(current => ({...current, role: e.target.value}))}>
          <option value="owner">owner</option>
          <option value="manager">manager</option>
          <option value="viewer">viewer</option>
        </select>
      </label>
      <button className="button dark small-button" style={{height:43, marginBottom:0}} disabled={busy}>Add user</button>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Access</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td>{row.email}</td><td>{row.role}</td><td><button type="button" className="underlink" disabled={busy} onClick={() => toggle(row)}>{row.disabled_at ? 'Enable' : 'Disable'}</button></td></tr>)}
    </tbody></table></div>
  </div>;
}
