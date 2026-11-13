import React, {useEffect, useState} from 'react';
import {api} from './api.js';

const statuses = [['all', 'All usage'], ['active', 'Active'], ['limit_reached', 'Limit reached'], ['not_used', 'Not used']];

export default function ChatbotAdmin({readonly, canConfigure}) {
  const [section, setSection] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState(null);
  const [detail, setDetail] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState({search: '', status: 'all', access: 'all', date: '', sort: 'usage', page: 1});
  const [range, setRange] = useState({from: '', to: ''});
  const [settings, setSettings] = useState(null);

  async function loadDashboard() {
    const data = await api('/admin/chatbot/dashboard');
    setDashboard(data);
    setSettings({
      enabled: data.enabled,
      model: data.model,
      provider: data.provider,
      maxDaily: data.maxDaily,
      timeZone: data.timeZone,
      maxInput: data.maxInput,
      maxTokens: data.maxTokens,
      retentionDays: data.retentionDays,
      systemPrompt: data.systemPrompt
    });
  }

  async function loadUsers(next = filters) {
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.status && next.status !== 'all') params.set('status', next.status);
    if (next.access && next.access !== 'all') params.set('access', next.access);
    if (next.date) params.set('date', next.date);
    if (next.sort === 'name') params.set('sort', 'name');
    if (next.sort === 'lifetime') params.set('sort', 'lifetime');
    params.set('page', String(next.page || 1));
    setUsers(await api(`/admin/chatbot/users?${params}`));
  }

  useEffect(() => {
    loadDashboard().then(() => loadUsers()).catch(err => setError(err.message));
  }, []);

  async function openUser(id) {
    setError('');
    const [user, conversations] = await Promise.all([
      api(`/admin/chatbot/users/${id}`),
      api(`/admin/chatbot/users/${id}/conversations`)
    ]);
    setDetail({...user, conversations: conversations.conversations});
    setSection('user');
  }

  async function saveUser(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    setError('');
    setNotice('');
    try {
      const limit = form.get('dailyMessageLimit');
      await api(`/admin/chatbot/users/${detail.user.id}/settings`, {
        dailyMessageLimit: limit === '' ? null : Number(limit),
        chatbotAccessEnabled: form.get('chatbotAccessEnabled') === 'true'
      }, 'PUT');
      setNotice('User chatbot settings saved.');
      await openUser(detail.user.id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const saved = await api('/admin/chatbot/settings', {
        enabled: settings.enabled,
        model: settings.model,
        provider: settings.provider,
        maxDaily: Number(settings.maxDaily),
        timeZone: settings.timeZone,
        maxInput: Number(settings.maxInput),
        maxTokens: Number(settings.maxTokens),
        retentionDays: Number(settings.retentionDays),
        systemPrompt: settings.systemPrompt
      }, 'PUT');
      setSettings(current => ({...current, ...saved}));
      setNotice('Chatbot settings saved. The API key stays on the server.');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAnalytics(event) {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    setAnalytics(await api(`/admin/chatbot/analytics?${params}`));
    setSection('analytics');
  }

  async function loadLogs() {
    setLogs(await api('/admin/chatbot/logs?pageSize=20'));
    setSection('logs');
  }

  const maxBar = Math.max(1, ...(analytics?.daily || []).map(row => row.messages));

  return <div className="chatbot-admin">
    <div className="admin-tabs-inline">
      {[['overview', 'Overview'], ['users', 'Users'], ['analytics', 'Analytics'], ['logs', 'Logs'], ['settings', 'Configuration']].map(([id, label]) => <button key={id} type="button" className={section === id || (section === 'user' && id === 'users') ? 'active' : ''} onClick={() => setSection(id)}>{label}</button>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {section === 'overview' && dashboard && <div className="admin-stats">
      <Stat title="REGISTERED USERS" value={dashboard.totalUsers}/>
      <Stat title="CHATBOT USERS" value={dashboard.chatbotUsers}/>
      <Stat title="ACTIVE TODAY" value={dashboard.activeUsersToday}/>
      <Stat title="MESSAGES TODAY" value={dashboard.messagesToday}/>
      <Stat title="MESSAGES THIS MONTH" value={dashboard.messagesThisMonth}/>
      <Stat title="SUCCESSFUL REPLIES" value={dashboard.successfulResponses}/>
      <Stat title="FAILED REPLIES" value={dashboard.failedResponses}/>
      <Stat title="AT DAILY LIMIT" value={dashboard.usersAtLimitToday}/>
      <Stat title="TOKENS TODAY" value={dashboard.tokensToday}/>
      <Stat title="ESTIMATED COST TODAY" value={dashboard.estimatedCostToday == null ? 'Unavailable' : `$${dashboard.estimatedCostToday}`}/>
      <Stat title="AVAILABILITY" value={dashboard.ready ? 'Ready' : 'Unavailable'} detail={dashboard.apiKeyConfigured ? 'API key configured' : 'API key missing'}/>
    </div>}
    {section === 'users' && <div className="admin-panel">
      <form className="admin-filter-bar" onSubmit={event => { event.preventDefault(); const next = {...filters, page: 1}; setFilters(next); loadUsers(next).catch(err => setError(err.message)); }}>
        <input aria-label="Search by name or email" placeholder="Search name or email" value={filters.search} onChange={event => setFilters({...filters, search: event.target.value})}/>
        <select aria-label="Filter by usage status" value={filters.status} onChange={event => setFilters({...filters, status: event.target.value})}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Filter by access" value={filters.access} onChange={event => setFilters({...filters, access: event.target.value})}><option value="all">All access</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
        <input aria-label="Usage date" type="date" value={filters.date} onChange={event => setFilters({...filters, date: event.target.value})}/>
        <select aria-label="Sort users" value={filters.sort} onChange={event => setFilters({...filters, sort: event.target.value})}><option value="usage">Sort by usage</option><option value="lifetime">Sort by lifetime messages</option><option value="name">Sort by name</option></select>
        <button className="button dark small-button" type="submit">Apply</button>
        <a className="underlink" href={`/api/admin/chatbot/export?${new URLSearchParams({search: filters.search, status: filters.status === 'all' ? '' : filters.status, access: filters.access === 'all' ? '' : filters.access, date: filters.date})}`}>Export CSV</a>
      </form>
      <div className="table-wrap"><table>
        <thead><tr><th>User ID</th><th>User Name</th><th>Email</th><th>Daily Usage</th><th>Daily Limit</th><th>Remaining</th><th>Usage Status</th><th>Total Messages</th><th>Last Chat</th><th>Access</th><th>Actions</th></tr></thead>
        <tbody>{users?.users?.map(user => <tr key={user.id}><td>{user.id}</td><td>{user.name}</td><td>{user.email}</td><td>{user.used}/{user.limit}</td><td>{user.limit}</td><td>{user.remaining}</td><td>{user.usageStatus.replaceAll('_', ' ')}</td><td>{user.lifetimeMessages}</td><td>{user.lastChat ? new Date(user.lastChat).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}) : '—'}</td><td>{user.accessEnabled ? 'Enabled' : 'Disabled'}</td><td><button type="button" className="underlink" onClick={() => openUser(user.id).catch(err => setError(err.message))}>View Details</button></td></tr>)}</tbody>
      </table>{users && !users.users.length && <p>No customers match these filters.</p>}</div>
      {users && <div className="admin-pagination-bar"><button type="button" className="button secondary small-button" disabled={users.page <= 1} onClick={() => { const next = {...filters, page: users.page - 1}; setFilters(next); loadUsers(next); }}>Previous</button><span>Page {users.page} of {users.pageCount}</span><button type="button" className="button secondary small-button" disabled={users.page >= users.pageCount} onClick={() => { const next = {...filters, page: users.page + 1}; setFilters(next); loadUsers(next); }}>Next</button></div>}
    </div>}
    {section === 'user' && detail && <div className="admin-panel">
      <button type="button" className="underlink" onClick={() => setSection('users')}>Back to users</button>
      <h3>{detail.user.name}</h3>
      <p>{detail.user.email} · User {detail.user.id} · Registered {new Date(detail.user.registeredAt).toLocaleDateString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
      <div className="chatbot-usage-card">
        <p>Used today {detail.usage.used} / {detail.usage.limit}</p>
        <p>Remaining {detail.usage.remaining}</p>
        <div className="veyora-chat-meter" role="progressbar" aria-valuemin={0} aria-valuemax={detail.usage.limit} aria-valuenow={detail.usage.used}><span style={{width: `${Math.min(100, (detail.usage.used / detail.usage.limit) * 100)}%`}}/></div>
        <p>Next reset {new Date(detail.usage.resetAt).toLocaleString('en-IN', {timeZone: detail.usage.timeZone})}</p>
      </div>
      <p>Lifetime messages {detail.lifetime.messages} · Conversations {detail.lifetime.conversations} · Successful {detail.lifetime.successfulResponses} · Failed {detail.lifetime.failedRequests}</p>
      <p>Tokens in {detail.lifetime.inputTokens} · out {detail.lifetime.outputTokens} · Estimated cost {detail.lifetime.estimatedCost == null ? 'unavailable for this model' : `$${detail.lifetime.estimatedCost}`}</p>
      {!readonly && <form onSubmit={saveUser} className="chatbot-settings-form">
        <label>Daily message limit<input name="dailyMessageLimit" type="number" min="1" max="100" defaultValue={detail.usage.limit} disabled={readonly}/></label>
        <label>Access<select name="chatbotAccessEnabled" defaultValue={String(detail.usage.accessEnabled)} disabled={readonly}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
        <button className="button dark small-button" type="submit">Save user settings</button>
      </form>}
      <h3>Daily history</h3>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Messages</th></tr></thead><tbody>{detail.daily.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.messages}</td></tr>)}</tbody></table></div>
      <h3>Conversations</h3>
      {detail.conversations.map(conversation => <details key={conversation.id}><summary>{conversation.title} · {new Date(conversation.updatedAt).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</summary>{conversation.messages.map(message => <p key={message.id}><strong>{message.role}</strong> · {new Date(message.createdAt).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}<br/>{message.message}</p>)}{!readonly && <button type="button" className="underlink" onClick={async () => { await api(`/admin/chatbot/conversations/${conversation.id}`, {}, 'DELETE'); await openUser(detail.user.id); }}>Delete conversation</button>}</details>)}
      {!detail.conversations.length && <p>No conversations yet.</p>}
    </div>}
    {section === 'analytics' && <div className="admin-panel">
      <form onSubmit={event => loadAnalytics(event).catch(err => setError(err.message))} className="admin-filter-bar">
        <label>From<input type="date" value={range.from} onChange={event => setRange({...range, from: event.target.value})}/></label>
        <label>To<input type="date" value={range.to} onChange={event => setRange({...range, to: event.target.value})}/></label>
        <button className="button dark small-button" type="submit">Update charts</button>
      </form>
      {!analytics && <button type="button" className="button dark small-button" onClick={() => loadAnalytics().catch(err => setError(err.message))}>Load analytics</button>}
      {analytics && <>
        <p>Success rate {analytics.successRate == null ? '—' : `${Math.round(analytics.successRate * 100)}%`} · Failed {analytics.failed} · Successful {analytics.success}</p>
        <div className="chatbot-bars" aria-label="Daily message consumption">{analytics.daily.filter(row => row.messages || row.success || row.failed).map(row => <div key={row.date}><span style={{height: `${Math.max(4, (row.messages / maxBar) * 120)}px`}} title={`${row.date}: ${row.messages} messages, ${row.users} users, ${row.limitReached} at limit`}/><small>{row.date.slice(5)}</small></div>)}</div>
        <h3>Weekly</h3>
        <div className="table-wrap"><table><thead><tr><th>Week</th><th>Messages</th><th>Users</th><th>At limit</th><th>Tokens</th><th>Estimated cost</th></tr></thead><tbody>{analytics.weekly.map(row => <tr key={row.period}><td>{row.period}</td><td>{row.messages}</td><td>{row.users}</td><td>{row.limitReached}</td><td>{row.inputTokens + row.outputTokens}</td><td>{row.estimatedCost == null ? '—' : `$${row.estimatedCost}`}</td></tr>)}</tbody></table></div>
        <h3>Monthly</h3>
        <div className="table-wrap"><table><thead><tr><th>Month</th><th>Messages</th><th>Success</th><th>Failed</th></tr></thead><tbody>{analytics.monthly.map(row => <tr key={row.period}><td>{row.period}</td><td>{row.messages}</td><td>{row.success}</td><td>{row.failed}</td></tr>)}</tbody></table></div>
      </>}
    </div>}
    {section === 'logs' && <div className="admin-panel">
      {!logs && <button type="button" className="button dark small-button" onClick={() => loadLogs().catch(err => setError(err.message))}>Load logs</button>}
      {logs && <div className="table-wrap"><table><thead><tr><th>When</th><th>User</th><th>Status</th><th>Tokens</th><th>Cost</th><th>Error</th></tr></thead><tbody>{logs.logs.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</td><td>{row.email || row.userId}</td><td>{row.status}</td><td>{(row.inputTokens || 0) + (row.outputTokens || 0)}</td><td>{row.estimatedCost == null ? '—' : `$${row.estimatedCost}`}</td><td>{row.errorCode || '—'}</td></tr>)}</tbody></table></div>}
      {logs?.audit?.length > 0 && <><h3>Admin changes</h3><div className="table-wrap"><table><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>User</th></tr></thead><tbody>{logs.audit.map(row => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</td><td>{row.admin_id}</td><td>{row.action}</td><td>{row.target_user_id || '—'}</td></tr>)}</tbody></table></div></>}
    </div>}
    {section === 'settings' && settings && <form className="admin-panel chatbot-settings-form" onSubmit={saveSettings}>
      <p>API host: {dashboard?.apiHost || 'not configured'}. The API key is stored in server environment configuration and is not shown here.</p>
      <label>Chatbot enabled<select value={String(settings.enabled)} disabled={!canConfigure} onChange={event => setSettings({...settings, enabled: event.target.value === 'true'})}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
      <label>Provider label<input value={settings.provider} disabled={!canConfigure} onChange={event => setSettings({...settings, provider: event.target.value})}/></label>
      <label>Model<input value={settings.model} disabled={!canConfigure} onChange={event => setSettings({...settings, model: event.target.value})}/></label>
      <label>Default daily limit<input type="number" min="1" max="100" value={settings.maxDaily} disabled={!canConfigure} onChange={event => setSettings({...settings, maxDaily: event.target.value})}/></label>
      <label>Reset timezone<input value={settings.timeZone} disabled={!canConfigure} onChange={event => setSettings({...settings, timeZone: event.target.value})}/></label>
      <label>Maximum input length<input type="number" min="50" max="8000" value={settings.maxInput} disabled={!canConfigure} onChange={event => setSettings({...settings, maxInput: event.target.value})}/></label>
      <label>Maximum response tokens<input type="number" min="50" max="4000" value={settings.maxTokens} disabled={!canConfigure} onChange={event => setSettings({...settings, maxTokens: event.target.value})}/></label>
      <label>Conversation retention days<input type="number" min="7" max="3650" value={settings.retentionDays} disabled={!canConfigure} onChange={event => setSettings({...settings, retentionDays: event.target.value})}/></label>
      <label>System prompt<textarea rows={8} value={settings.systemPrompt} disabled={!canConfigure} onChange={event => setSettings({...settings, systemPrompt: event.target.value})}/></label>
      {canConfigure && <button className="button dark" type="submit">Save configuration</button>}
    </form>}
  </div>;
}

function Stat({title, value, detail}) {
  return <div className="stat"><span className="eyebrow">{title}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
