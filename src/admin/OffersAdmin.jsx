import React, {useEffect, useState} from 'react';
import {Check, Plus, RefreshCw, Tag, Trash2} from 'lucide-react';
import {api} from '../api.js';
import {money} from '../format.js';
import Modal from '../components/Modal.jsx';

export default function OffersAdmin({readonly,refreshParent}){
  const [offers,setOffers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [editingOffer,setEditingOffer]=useState(null);
  const [isCreating,setIsCreating]=useState(false);
  const [busyId,setBusyId]=useState(null);

  async function load(){
    setLoading(true);setError('');
    try{
      const data=await api('/admin/offers');
      setOffers(data);
    }catch(e){setError(e.message)}finally{setLoading(false)}
  }

  useEffect(()=>{load();},[]);

  async function toggleStatus(offer){
    if(readonly)return;
    const nextStatus=offer.status==='active'?'paused':'active';
    setBusyId(offer.id);setError('');
    try{
      await api(`/admin/offers/${offer.id}`,{status:nextStatus},'PATCH');
      await load();
      if(refreshParent)await refreshParent();
    }catch(e){setError(e.message)}finally{setBusyId(null)}
  }

  async function togglePlacement(offer,key){
    if(readonly)return;
    setBusyId(offer.id);setError('');
    try{
      await api(`/admin/offers/${offer.id}`,{[key]:offer[key]?0:1},'PATCH');
      await load();
      if(refreshParent)await refreshParent();
    }catch(e){setError(e.message)}finally{setBusyId(null)}
  }

  async function deleteOffer(offer){
    if(readonly)return;
    if(!window.confirm(`Are you sure you want to delete offer "${offer.name}"?`))return;
    setBusyId(offer.id);setError('');
    try{
      await api(`/admin/offers/${offer.id}`,{},'DELETE');
      await load();
      if(refreshParent)await refreshParent();
    }catch(e){setError(e.message)}finally{setBusyId(null)}
  }

  const activeCount=offers.filter(o=>o.status==='active').length;
  const bannerOffer=offers.find(o=>o.status==='active'&&o.show_in_banner);

  return <div className="admin-offers">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
      <div>
        <h3>Promotional Offers & Festive Discounts</h3>
        <p className="small muted" style={{margin:'4px 0 0'}}>
          Offers can apply on their own, or wait for a coupon code. Active banner lines rotate with jewellery, coins, and kurtas in the top bar. A coupon can be limited to one catalogue.
        </p>
      </div>
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
        <button className="button" disabled={readonly} onClick={()=>{setEditingOffer({badge_text:'COUPON',discount_type:'total_percent',discount_value:10,applies_to:'all',code_required:1,show_in_banner:1,banner_headline:'A coupon is waiting on jewellery, coins, and kurtas'});setIsCreating(true);}}>
          <Tag size={16}/> Create coupon
        </button>
        <button
          className="button dark"
          disabled={readonly}
          onClick={()=>{setEditingOffer(null);setIsCreating(true);}}
        >
          <Plus size={16}/> Create Promotional Offer
        </button>
      </div>
    </div>

    {error&&<p className="error" style={{marginBottom:'16px'}}>{error}</p>}

    <div className="offers-stat-grid">
      <div className="stat">
        <span className="eyebrow">TOTAL OFFERS</span>
        <strong>{offers.length}</strong>
        <small>{activeCount} currently active</small>
      </div>
      <div className="stat">
        <span className="eyebrow">LIVE STATUS</span>
        <strong style={{color:activeCount>0?'#2e7d32':'var(--muted)'}}>{activeCount>0?'Active & Live':'No Active Offers'}</strong>
        <small>Auto-applies to matching catalogue</small>
      </div>
      <div className="stat">
        <span className="eyebrow">ANNOUNCEMENT BAR</span>
        <strong>{bannerOffer?'Live':'Off'}</strong>
        <small>{bannerOffer?`${offers.filter(o=>o.status==='active'&&o.show_in_banner).length} in the carousel`:'No banner selected'}</small>
      </div>
      <div className="stat">
        <span className="eyebrow">COUPONS</span>
        <strong>{offers.filter(o => o.code && (o.code_required === 1 || o.code_required === true)).length}</strong>
        <small>Codes entered at checkout</small>
      </div>
    </div>

    <div className="admin-panel">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <span className="eyebrow" style={{letterSpacing:'1px',fontWeight:700}}>CONFIGURED OFFERS ({offers.length})</span>
        <button className="text-button" onClick={load}><RefreshCw size={12}/> Refresh</button>
      </div>

      {loading?<p className="empty">Loading promotional offers…</p>:!offers.length?<div className="empty">
        <Tag size={32}/>
        <p>No promotional offers configured yet. Create your first festive offer to attract customers.</p>
        <button className="button dark" disabled={readonly} onClick={()=>{setEditingOffer(null);setIsCreating(true);}}>+ Create Offer</button>
      </div>:<div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Offer & Code</th>
              <th>Badge Ribbon</th>
              <th>Discount Rule</th>
              <th>Scope (Applies To)</th>
              <th>Placements</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(o=><tr key={o.id}>
              <td>
                <div style={{fontWeight:600}}>{o.name}</div>
                <small style={{color:'var(--muted)'}}>{o.code?`Coupon: ${o.code}${o.code_required?' · entered at checkout':' · optional'}`:'Auto-applied (no coupon)'} · Priority: {o.priority}</small>
              </td>
              <td>
                <span className="offer-ribbon-badge" style={{position:'static',display:'inline-flex',borderRadius:'2px',padding:'4px 8px',fontSize:'9px',boxShadow:'none'}}>
                  {o.badge_text}
                </span>
              </td>
              <td>
                <strong style={{fontSize:'12px'}}>
                  {o.discount_type==='making_percent'&&`${o.discount_value}% OFF on Making Charges`}
                  {o.discount_type==='total_percent'&&`${o.discount_value}% OFF on Subtotal`}
                  {o.discount_type==='flat_amount'&&`Flat ${money(o.discount_value)} OFF`}
                  {o.discount_type==='badge_only'&&`Badge Only (No discount)`}
                </strong>
              </td>
              <td>
                <span className="status-badge" style={{textTransform:'uppercase',fontSize:'8px'}}>
                  {o.applies_to==='all'&&'Jewellery, coins, and kurtas'}
                  {o.applies_to==='products'&&'Jewellery only'}
                  {o.applies_to==='jewelry'&&'Jewellery only'}
                  {o.applies_to==='kurtas'&&'Kurtas only'}
                  {o.applies_to==='coins'&&'Coins only'}
                  {o.applies_to==='gold'&&'Gold Items Only'}
                  {o.applies_to==='silver'&&'Silver Items Only'}
                  {o.applies_to==='category'&&`Category: ${o.target_value}`}
                  {o.applies_to==='sku'&&`SKU: ${o.target_value}`}
                </span>
              </td>
              <td>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <button
                    type="button"
                    className={'text-button '+(o.show_in_banner?'underlink':'')}
                    style={{fontSize:'9px',opacity:o.show_in_banner?1:0.5}}
                    disabled={readonly||busyId===o.id}
                    onClick={()=>togglePlacement(o,'show_in_banner')}
                    title="Toggle Header Announcement Bar"
                  >
                    Top Banner: {o.show_in_banner?'✓':'✗'}
                  </button>
                  <button
                    type="button"
                    className={'text-button '+(o.show_in_grid?'underlink':'')}
                    style={{fontSize:'9px',opacity:o.show_in_grid?1:0.5}}
                    disabled={readonly||busyId===o.id}
                    onClick={()=>togglePlacement(o,'show_in_grid')}
                    title="Toggle In-Grid Promotional Banner Card"
                  >
                    Grid Card: {o.show_in_grid?'✓':'✗'}
                  </button>
                </div>
              </td>
              <td>
                <button
                  type="button"
                  className={'status-pill '+(o.status==='active'?'active':'paused')}
                  style={{cursor:readonly?'default':'pointer',border:'none'}}
                  disabled={readonly||busyId===o.id}
                  onClick={()=>toggleStatus(o)}
                  title="Click to toggle active / paused"
                >
                  {o.status}
                </button>
              </td>
              <td>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <button
                    type="button"
                    className="underlink"
                    disabled={readonly||busyId===o.id}
                    onClick={()=>setEditingOffer(o)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    style={{color:'#c62828',padding:'4px'}}
                    disabled={readonly||busyId===o.id}
                    onClick={()=>deleteOffer(o)}
                    title="Delete offer"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </div>

    {(isCreating||editingOffer)&&<OfferModal
      offer={editingOffer}
      onClose={()=>{setIsCreating(false);setEditingOffer(null);}}
      onSaved={async()=>{
        setIsCreating(false);
        setEditingOffer(null);
        await load();
        if(refreshParent)await refreshParent();
      }}
    />}
  </div>;
}

function OfferModal({offer,onClose,onSaved}){
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [badgeText,setBadgeText]=useState(offer?.badge_text||'50% OFF ON MC ✦');
  const [discountType,setDiscountType]=useState(offer?.discount_type||'making_percent');
  const [appliesTo,setAppliesTo]=useState(offer?.applies_to||'all');

  async function handleSubmit(e){
    e.preventDefault();
    setError('');setBusy(true);
    const form=new FormData(e.target);
    const payload=Object.fromEntries(form);
    payload.show_in_banner=form.get('show_in_banner')==='on'?1:0;
    payload.show_in_grid=form.get('show_in_grid')==='on'?1:0;
    payload.discount_value=Number(payload.discount_value)||0;
    payload.priority=Number(payload.priority)||10;

    try{
      if(offer?.id){
        await api(`/admin/offers/${offer.id}`,payload,'PATCH');
      }else{
        await api('/admin/offers',payload,'POST');
      }
      onSaved();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }

  const editing=Boolean(offer?.id);
  return <Modal title={editing?`Edit offer: ${offer.name}`:(offer?.code_required?'Create coupon':'Create promotional offer')} onClose={onClose}>
    <form onSubmit={handleSubmit} style={{maxWidth:'640px'}}>
      {error&&<p className="error" style={{marginBottom:'16px'}}>{error}</p>}

      {/* Live Badge Preview */}
      <div style={{background:'var(--paper)',padding:'14px 18px',borderRadius:'4px',marginBottom:'18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
        <div>
          <span className="eyebrow" style={{fontSize:'8px'}}>LIVE BADGE PREVIEW</span>
          <p className="small muted" style={{margin:'2px 0 0'}}>Appears on product and coin card top-left corner</p>
        </div>
        <span className="offer-ribbon-badge" style={{position:'static',boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
          {badgeText||'50% OFF ON MC ✦'}
        </span>
      </div>

      <div className="form-grid">
        <label className="span-two">Offer Display Name
          <input name="name" required defaultValue={offer?.name||''} placeholder="e.g. Diwali & Dhanteras Festive Dhamaka"/>
        </label>

        <label>Coupon code
          <input name="code" defaultValue={offer?.code||''} placeholder="e.g. KURTA10 (leave blank for an automatic offer)"/>
        </label>
        <label>Starts
          <input name="starts_at" type="datetime-local" defaultValue={offer?.starts_at?offer.starts_at.slice(0,16):''}/>
        </label>
        <label>Ends
          <input name="ends_at" type="datetime-local" defaultValue={offer?.ends_at?offer.ends_at.slice(0,16):''}/>
        </label>
        <label className="span-two">Checkout code
          <input type="hidden" name="code_required" value="0"/>
          <span className="small"><input type="checkbox" name="code_required" value="1" defaultChecked={Boolean(offer?.code_required)}/> Require this coupon at checkout. Leave unchecked to apply the discount automatically.</span>
        </label>

        <label>Badge Ribbon Text
          <input
            name="badge_text"
            required
            value={badgeText}
            onChange={e=>setBadgeText(e.target.value)}
            placeholder="e.g. 50% OFF ON MC ✦"
          />
        </label>

        <label>Discount Type
          <select name="discount_type" value={discountType} onChange={e=>setDiscountType(e.target.value)}>
            <option value="making_percent">Percentage OFF on Making Charges (MC)</option>
            <option value="total_percent">Percentage OFF on Subtotal</option>
            <option value="flat_amount">Flat Discount (₹ off)</option>
            <option value="badge_only">Ribbon Badge Only (0% discount)</option>
          </select>
        </label>

        <label>Discount Value ({discountType==='flat_amount'?'₹':'%'})
          <input
            type="number"
            step="0.01"
            min="0"
            name="discount_value"
            defaultValue={offer?.discount_value??50}
            disabled={discountType==='badge_only'}
            required={discountType!=='badge_only'}
          />
        </label>

        <label>Applies To (Target Audience)
          <select name="applies_to" value={appliesTo} onChange={e=>setAppliesTo(e.target.value)}>
            <option value="all">Jewellery, coins, and kurtas</option>
            <option value="products">Jewellery only</option>
            <option value="kurtas">Kurtas only</option>
            <option value="coins">Coins only</option>
            <option value="gold">Gold Items Only (Jewellery & Coins)</option>
            <option value="silver">Silver Items Only (Jewellery & Coins)</option>
            <option value="category">Specific Category</option>
            <option value="sku">Specific Product / Coin SKU</option>
          </select>
        </label>

        {(appliesTo==='category'||appliesTo==='sku')?<label>Target Value
          <input
            name="target_value"
            required
            defaultValue={offer?.target_value||''}
            placeholder={appliesTo==='category'?'e.g. Earrings or Necklaces':'e.g. RNG-001 or COIN-GLD-1G'}
          />
        </label>:<input type="hidden" name="target_value" value=""/>}

        <label>Status
          <select name="status" defaultValue={offer?.status||'active'}>
            <option value="active">Active (Live on website)</option>
            <option value="paused">Paused (Temporarily hidden)</option>
            <option value="expired">Expired</option>
          </select>
        </label>

        <label>Priority (Higher runs first)
          <input type="number" name="priority" defaultValue={offer?.priority??10}/>
        </label>

        <label className="span-two">Top Banner Headline
          <input
            name="banner_headline"
            defaultValue={offer?.banner_headline||'✨ Festive offer is live | Up to 50% off* on Making Charges'}
            placeholder="Top announcement bar text"
          />
        </label>

        <label className="span-two">Grid Banner Subtext
          <textarea
            name="banner_subtext"
            rows="2"
            defaultValue={offer?.banner_subtext||'Limited period festive celebration across fine gold, diamond jewellery & bullion coins.'}
            placeholder="Displayed on in-grid festive promotional card"
          />
        </label>

        <div className="span-two" style={{display:'flex',gap:'24px',marginTop:'4px',flexWrap:'wrap'}}>
          <label className="checkbox" style={{margin:0}}>
            <input type="checkbox" name="show_in_banner" defaultChecked={offer?Boolean(offer.show_in_banner):true}/>
            Show in the top announcement carousel
          </label>
          <label className="checkbox" style={{margin:0}}>
            <input type="checkbox" name="show_in_grid" defaultChecked={offer?Boolean(offer.show_in_grid):true}/>
            Display in-grid promotional festive card
          </label>
        </div>
      </div>

      <div style={{display:'flex',gap:'12px',justifyContent:'flex-end',marginTop:'24px'}}>
        <button type="button" className="text-button" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="button dark" disabled={busy}>
          {busy?'Saving…':editing?'Save changes':offer?.code_required?'Publish coupon':'Publish offer'} <Check size={16}/>
        </button>
      </div>
    </form>
  </Modal>;
}
