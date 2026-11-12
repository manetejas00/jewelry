import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {Check} from 'lucide-react';
import {api,bumpCatalogueReads} from './api.js';
const Store = createContext();
export const useStore = () => useContext(Store);
const readList = key => {try {const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [];} catch {return [];}};
const compact = model => ({bag: model.bag.map(({sku, quantity}) => ({sku, quantity})), saved: [...model.saved]});
export function Provider({children}) {
  const [products,setProducts] = useState([]), [coins,setCoins] = useState([]), [offers,setOffers] = useState([]), [config,setConfig] = useState({brand:'Veyora Jewels',preview:true});
  const [catalogueRevision,setCatalogueRevision] = useState(0);
  const [error,setError] = useState(''), [bag,rawBag] = useState(() => readList('veyora-bag'));
  const [saved,rawSaved] = useState(() => readList('veyora-saved')), [bagOpen,setBagOpen] = useState(false);
  const [customer,setCustomer] = useState(null), [accountReady,setAccountReady] = useState(false);
  const [syncStatus,setSyncStatus] = useState(''), [syncError,setSyncError] = useState(''), [toast,setToast] = useState('');
  const model = useRef({bag,saved}), user = useRef(null), revision = useRef(0), queue = useRef(Promise.resolve()), syncFailure = useRef('');
  const catalogueRequest = useRef(0), tabId = useRef(crypto.randomUUID());
  function adopt(payload) {
    sessionStorage.setItem('customer-csrf',payload.csrf);
    user.current = payload.customer;
    setCustomer(payload.customer);
    if (payload.customer) {
      const state = payload.state;
      revision.current = state.revision;
      model.current = {bag:state.bag,saved:state.saved};
      rawBag(state.bag); rawSaved(state.saved);
      localStorage.removeItem('veyora-bag'); localStorage.removeItem('veyora-saved');
      setSyncStatus('Saved to your account');
    }
    syncFailure.current = ''; setSyncError('');
  }
  useEffect(() => {
    let cancelled = false;
    const requestId = ++catalogueRequest.current;
    Promise.all([api('/products'),api('/coins').catch(()=>[]),api('/config'),api('/account/session'),api('/offers').catch(()=>[])]).then(([p,cns,c,account,o]) => {
      if (cancelled) return;
      setConfig(c);adopt(account);
      if (requestId !== catalogueRequest.current) return;
      setProducts(p);setCoins(cns||[]);setOffers(o||[]);
    }).catch(e => {if (!cancelled) setError(e.message);}).finally(() => {if (!cancelled) setAccountReady(true);});
    return () => {cancelled = true;};
  }, []);
  async function refreshCatalogue({notify=false,fresh=false}={}) {
    if (fresh) bumpCatalogueReads();
    const requestId = ++catalogueRequest.current;
    const [pieces,coinsData,currentOffers] = await Promise.all([api('/products'),api('/coins').catch(()=>[]),api('/offers').catch(()=>[])]);
    if (requestId !== catalogueRequest.current) return;
    setProducts(pieces);setCoins(coinsData||[]);setError('');setOffers(currentOffers);setCatalogueRevision(n=>n+1);
    const all=[...pieces,...(coinsData||[])];
    const updatedBag=model.current.bag.map(item=>{const piece=all.find(p=>p.sku===item.sku);return piece?{...item,name:piece.name,image:piece.image,price:piece.price,stock:piece.stock,unavailable:!piece.checkout_available}:{...item,unavailable:true};});
    model.current={...model.current,bag:updatedBag};rawBag(updatedBag);
    if(notify && typeof BroadcastChannel!=='undefined') {
      const channel=new BroadcastChannel('veyora-catalogue');channel.postMessage({type:'prices-updated',origin:tabId.current});channel.close();
    }
  }
  useEffect(()=>{
    const reload=()=>{refreshCatalogue().catch(e=>setError(e.message));};
    const visible=()=>{if(document.visibilityState==='visible')reload();};
    window.addEventListener('focus',reload);document.addEventListener('visibilitychange',visible);
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('veyora-catalogue'):null;
    if(channel)channel.onmessage=event=>{if(event.data?.origin===tabId.current)return;reload();};
    return()=>{window.removeEventListener('focus',reload);document.removeEventListener('visibilitychange',visible);channel?.close();};
  },[]);
  useEffect(() => {if (toast) {const timer = setTimeout(() => setToast(''),3500);return () => clearTimeout(timer);}}, [toast]);
  function persist() {
    if (!user.current) {
      localStorage.setItem('veyora-bag',JSON.stringify(model.current.bag));
      localStorage.setItem('veyora-saved',JSON.stringify(model.current.saved));
      return;
    }
    const snapshot = compact(model.current), owner = user.current.id;
    setSyncStatus('Saving…');
    queue.current = queue.current.then(async () => {
      if (syncFailure.current || user.current?.id !== owner) return;
      try {
        const result = await api('/account/state',{...snapshot,revision:revision.current},'PUT');
        revision.current = result.revision;setSyncStatus('Saved to your account');
      } catch (e) {syncFailure.current = e.message;setSyncError(e.message);setSyncStatus('Changes not saved');}
    });
  }
  function setBag(action) {
    const next = typeof action === 'function' ? action(model.current.bag) : action;
    model.current = {...model.current,bag:next}; rawBag(next); persist();
  }
  function toggleSave(code) {
    const current = model.current.saved;
    const isAdding = !current.includes(code);
    const next = isAdding ? [...current,code] : current.filter(x => x !== code);
    model.current = {...model.current,saved:next};rawSaved(next);persist();
    setToast(isAdding ? 'Piece saved to your favourites' : 'Piece removed from saved favourites');
  }
  async function flushAccount() {await queue.current;if (syncFailure.current) throw Error(syncFailure.current);}
  async function refreshAccount() {
    await queue.current;
    const payload = await api('/account/session');
    if (!payload.customer) throw Error('Your session has ended. Sign in again to view your account.');
    adopt(payload);
  }
  async function authenticate(mode, fields) {
    const payload = await api('/account/'+mode,{...fields,guestState:compact(model.current)});
    adopt(payload);
    setToast(mode === 'register' ? 'Welcome to Veyora. Your account is ready.' : 'Welcome back. Your pieces are here.');
  }
  async function logoutCustomer() {
    await flushAccount();
    const payload = await api('/account/logout',{});
    user.current = null;setCustomer(null);sessionStorage.setItem('customer-csrf',payload.csrf);
    model.current = {bag:[],saved:[]};rawBag([]);rawSaved([]);setBagOpen(false);setSyncStatus('');
    localStorage.removeItem('veyora-bag');localStorage.removeItem('veyora-saved');
    setToast('You have signed out. Your pieces are saved in your account.');
  }
  async function afterCheckout() {
    if (!user.current) setBag([]);
    else {try {await refreshAccount();} catch (e) {model.current={...model.current,bag:[]};rawBag([]);syncFailure.current=e.message;setSyncError(e.message);}}
    try {await refreshCatalogue({notify:true,fresh:true});} catch (e) {setError(e.message);}
  }
  function add(p) {
    setBag(old => {
      const existing = old.find(i => i.sku === p.sku);
      return existing ? old.map(i => i.sku === p.sku ? {...i,quantity:Math.min(i.quantity+1,p.stock,20)} : i) : [...old,{sku:p.sku,name:p.name,image:p.image,slug:p.slug,size:p.size,price:p.price,stock:p.stock,quantity:1}];
    });
    setBagOpen(true);
  }
  return <Store.Provider value={{products,coins,offers,catalogueRevision,refreshCatalogue,config,error,bag,setBag,add,bagOpen,setBagOpen,saved,toggleSave,setToast,customer,accountReady,authenticate,logoutCustomer,flushAccount,refreshAccount,afterCheckout,syncStatus,syncError}}>
    {children}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </Store.Provider>;
}
