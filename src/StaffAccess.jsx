import React, {useEffect, useState} from 'react';
import {api} from './api.js';

export default function StaffAccess() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  return <div className="admin-panel">
    <h3>Staff access</h3>
    <p className="small muted">Disabled staff cannot sign in. Keep at least one active owner. New staff accounts are still created from the server, not this screen.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Access</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td>{row.email}</td><td>{row.role}</td><td><button type="button" className="underlink" disabled={busy} onClick={() => toggle(row)}>{row.disabled_at ? 'Enable' : 'Disable'}</button></td></tr>)}
    </tbody></table></div>
  </div>;
}
