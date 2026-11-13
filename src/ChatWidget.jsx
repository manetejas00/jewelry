import useScrollLock from './useScrollLock.js';
import React, {useEffect, useId, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {MessageCircle, Send, X} from 'lucide-react';
import {api, request} from './api.js';
import {useStore} from './store.jsx';
import {chatProductLinks} from './chat-product-links.js';

const WELCOME = 'Hello. I can help with Veyora Jewels pieces, coins, care, and orders. What would you like to know?';
const GUEST = 'Please log in or create an account to access our AI assistant.';
const LIMIT = 'You\'ve reached your daily limit of 10 AI messages. Your free messages will reset at midnight. Please come back tomorrow.';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit'});
}

export default function ChatWidget() {
  const {customer, accountReady, products, coins} = useStore();
  const titleId = useId();
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sending = useRef('');
  const [availability, setAvailability] = useState(null);
  const [open, setOpen] = useState(false);
  useScrollLock(open&&accountReady&&availability?.enabled,panelRef,{onEscape:()=>setOpen(false)});
  const [usage, setUsage] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? navigator.onLine === false : false);

  useEffect(() => {
    let active = true;
    api('/chat/availability').then(result => { if (active) setAvailability(result); }).catch(() => { if (active) setAvailability({enabled: false}); });
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { active = false; window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!open || !customer) return;
    let active = true;
    api('/chat/history').then(result => {
      if (!active) return;
      setUsage(result.usage);
      setConversations(result.conversations || []);
      setConversationId(current => current || result.conversations?.[0]?.id || null);
      setError('');
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [open, customer]);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, conversations, conversationId, pending]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => { clearTimeout(timer); };
  }, [open]);

  if (!accountReady || !availability?.enabled) return null;

  const active = conversations.find(item => item.id === conversationId) || null;
  const messages = active?.messages || [];
  const blocked = !usage?.accessEnabled || (usage && usage.remaining <= 0);
  const limitText = usage ? `You've reached your daily limit of ${usage.limit} AI messages. Your free messages will reset at midnight. Please come back tomorrow.` : LIMIT;
  const used = usage?.used || 0;
  const limit = usage?.limit || 10;
  const percent = Math.min(100, Math.round((used / limit) * 100));

  async function refresh(result) {
    if (result?.usage) setUsage(result.usage);
    if (result?.conversationId) {
      setConversationId(result.conversationId);
      const history = await api('/chat/history');
      setConversations(history.conversations || []);
      setUsage(history.usage);
    }
  }

  async function send() {
    const message = draft.trim();
    if (!message || pending || blocked || offline || !customer) return;
    if (!sending.current) sending.current = crypto.randomUUID();
    setPending(true);
    setError('');
    setDraft('');
    try {
      const result = await request('/chat/message', {message, conversationId, idempotencyKey: sending.current}, 'POST', 60000);
      sending.current = '';
      await refresh(result);
    } catch (err) {
      if (err.status) sending.current = '';
      setDraft(message);
      setError(err.message);
      if (err.status === 429) {
        try { setUsage(await api('/chat/usage')); } catch { /* usage refresh is optional */ }
      }
    } finally {
      setPending(false);
    }
  }

  async function clearChat() {
    setError('');
    try {
      const result = await api('/chat/history', {}, 'DELETE');
      setConversations([]);
      setConversationId(null);
      setUsage(result.usage);
    } catch (err) {
      setError(err.message);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return <div className="veyora-chat">
    {open && <section id="veyora-chat-panel" ref={panelRef} className="veyora-chat-panel" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <header className="veyora-chat-header">
        <div>
          <img src="/assets/brand/logo.webp" alt="Veyora Jewels" className="chat-brand-logo"/>
          <h2 id={titleId}>AI Assistant</h2>
          <p className="veyora-chat-status"><span />{offline ? 'Offline' : usage?.accessEnabled === false ? 'Unavailable' : 'Available'}</p>
        </div>
        <button type="button" className="veyora-chat-icon-button" onClick={() => setOpen(false)} aria-label="Close AI assistant"><X size={18}/></button>
      </header>
      {!customer ? <div className="veyora-chat-guest">
        <p>{GUEST}</p>
        <div>
          <Link className="veyora-chat-button" to="/account?mode=login">Login</Link>
          <Link className="veyora-chat-button secondary" to="/account?mode=register">Register</Link>
        </div>
      </div> : <>
        <div className="veyora-chat-usage" aria-live="polite">
          <p>Daily Limit: {limit}</p>
          <p>Used Today: {used}/{limit}</p>
          <p>Remaining: {usage ? usage.remaining : limit}</p>
          <p className="veyora-chat-meter-label">Daily Messages {used} / {limit} Used</p>
          <div className="veyora-chat-meter" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label="Daily messages used">
            <span style={{width: `${percent}%`}}/>
          </div>
          <p>{usage ? `${usage.remaining} Messages Remaining` : ''}</p>
          {usage?.resetAt && <p className="veyora-chat-reset">Resets at midnight ({usage.timeZone.replace('_', ' ')}).</p>}
        </div>
        {conversations.length > 1 && <label className="veyora-chat-history">Conversation
          <select aria-label="Conversation history" value={conversationId || ''} onChange={event => setConversationId(Number(event.target.value))}>
            {conversations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>}
        <div className="veyora-chat-log" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
          <article className="veyora-chat-bubble assistant">
            <p>{WELCOME}</p>
          </article>
          {messages.map(item => <article key={item.id} className={`veyora-chat-bubble ${item.role === 'assistant' ? 'assistant' : 'visitor'}`}>
            <p>{item.message}</p>
            {item.role === 'assistant' && <div className="veyora-chat-product-links">
              {chatProductLinks(item.message, products, coins).map(product => <Link key={product.href} to={product.href} onClick={() => setOpen(false)}>View {product.name} →</Link>)}
            </div>}
            <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
          </article>)}
          {pending && <article className="veyora-chat-bubble assistant" aria-label="Assistant is typing"><p className="veyora-chat-typing"><span/><span/><span/></p></article>}
        </div>
        {offline && <p className="veyora-chat-note" role="status">You appear to be offline. Reconnect to send a message.</p>}
        {error && <p className="veyora-chat-note error" role="alert">{error}</p>}
        {blocked && <p className="veyora-chat-note" role="status">{usage?.accessEnabled === false ? 'The assistant is not available for this account.' : limitText}</p>}
        <form className="veyora-chat-form" onSubmit={event => { event.preventDefault(); send(); }}>
          <label className="visually-hidden" htmlFor="veyora-chat-input">Message</label>
          <textarea id="veyora-chat-input" ref={inputRef} rows={2} maxLength={usage?.maxInput || 2000} value={draft} disabled={blocked || pending} placeholder={blocked ? 'Daily limit reached' : 'Write a message'} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown}/>
          <div>
            <button type="button" className="veyora-chat-text" onClick={clearChat}>Clear conversation</button>
            <button type="submit" className="veyora-chat-send" disabled={blocked || pending || !draft.trim()} aria-label="Send message"><Send size={16}/> Send</button>
          </div>
        </form>
      </>}
    </section>}
    <button type="button" className="veyora-chat-launcher" aria-expanded={open} aria-controls="veyora-chat-panel" onClick={() => setOpen(value => !value)}>
      {open ? <X size={22}/> : <MessageCircle size={22}/>}
      <span>{open ? 'Close chat' : 'Chat'}</span>
    </button>
  </div>;
}
