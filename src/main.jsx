import React,{useEffect,useState,useRef,createContext,useContext} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Link,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {Search,ShoppingBag,UserRound,Menu,X,ArrowRight,ArrowUpRight,Plus,Minus,Heart,ChevronDown,Check,ArrowLeft,ShieldCheck,Package,Truck,SlidersHorizontal,LogOut,LayoutDashboard,Gem,ChartNoAxesCombined,Upload,Settings,Download,RefreshCw,AlertCircle,CheckCircle2,Eye,Mail,MoveRight,Coins as CoinsIcon,CircleDollarSign,Trash2,Sparkles,Play,Pause,Power,Image as ImageIcon,Copy,Layers} from 'lucide-react';
import gsap from 'gsap';
import './style.css';
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(v||0);
const date=v=>v?new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'—';
const media=name=>'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/'+encodeURIComponent(name)+'.png';
import {api} from './api.js';
import {Provider,useStore} from './store.jsx';
import Account from './Account.jsx';
const grouped=products=>[...products.reduce((map,p)=>{const old=map.get(p.product_code);const curP=p.price!==null&&p.price!==undefined?Number(p.price):null;const isGoldLinked=p.pricing_mode==='GOLD_LINKED'||old?.pricing_mode==='GOLD_LINKED';if(!old){map.set(p.product_code,{...p,minPrice:curP,maxPrice:curP,pricing_mode:p.pricing_mode});}else{const minP=Math.min(old.minPrice??Infinity,curP??Infinity);const maxP=Math.max(old.maxPrice??-Infinity,curP??-Infinity);const keepNew=(p.stock>0&&old.stock===0)||(Boolean(p.stock>0)===Boolean(old.stock>0)&&p.price<old.price);const rep=keepNew?{...p}:{...old};rep.minPrice=minP===Infinity?null:minP;rep.maxPrice=maxP===-Infinity?null:maxP;if(isGoldLinked)rep.pricing_mode='GOLD_LINKED';map.set(p.product_code,rep);}return map;},new Map()).values()];
const priceBrackets=[{label:'All prices',value:''},{label:'Under ₹20,000',value:'0-20000'},{label:'₹20,000 – ₹30,000',value:'20000-30000'},{label:'₹30,000 – ₹50,000',value:'30000-50000'},{label:'Above ₹50,000',value:'50000-'}];
const matchPrice=(price,bracket)=>{if(!bracket)return true;if(price===null||price===undefined)return false;if(bracket.includes('-')){const [minStr,maxStr]=bracket.split('-');if(minStr&&price<Number(minStr))return false;if(maxStr&&price>Number(maxStr))return false;return true;}return price<=Number(bracket);};
function Scroll(){const loc=useLocation();useEffect(()=>{if(!loc.pathname.startsWith('/collections'))window.scrollTo(0,0);},[loc.pathname]);return null}
function Brand(){return <Link className="brand" to="/" aria-label="Veyora Jewels home"><span className="brand-emblem">✳</span><span>VEYORA<small>J E W E L S</small></span></Link>}
function Header(){const {bag,setBagOpen,saved,customer,syncError,refreshAccount}=useStore();const [menu,setMenu]=useState(false),[search,setSearch]=useState(false),[q,setQ]=useState('');const nav=useNavigate();const location=useLocation();useEffect(()=>{setMenu(false);setSearch(false)},[location.pathname]);return <><div className="announcement">A little wonder. An everyday heirloom. <span>Discover the Pearl Edit <ArrowRight size={12}/></span></div><header className="header"><button className="icon mobile-menu" aria-label="Open menu" onClick={()=>setMenu(!menu)}><Menu/></button><Brand/><nav className={menu?'nav open':'nav'}><Link to="/collections/all">All jewellery</Link><Link to="/coins">Coins</Link><Link to="/collections/earrings">Earrings</Link><Link to="/collections/necklaces">Necklaces</Link><Link to="/collections/rings">Rings</Link><Link to="/collections/bracelets">Bracelets</Link></nav><div className="header-tools"><Link className="icon account-nav" to="/account" aria-label={customer?"My account":"Sign in or register"}><UserRound size={20}/></Link><button className="icon" aria-label="Search jewellery" onClick={()=>setSearch(!search)}><Search size={20}/></button><Link className="icon save-nav" to="/collections/saved" aria-label="Saved pieces"><Heart size={20}/>{saved.length>0&&<i>{saved.length}</i>}</Link><button className="icon bag-icon" aria-label="Open shopping bag" onClick={()=>setBagOpen(true)}><ShoppingBag size={20}/><span>{bag.reduce((n,p)=>n+p.quantity,0)}</span></button></div></header>{search&&<form className="search-panel" onSubmit={e=>{e.preventDefault();nav('/collections/all?q='+encodeURIComponent(q));setSearch(false)}}><Search size={20}/><input autoFocus aria-label="Search products" placeholder="Find your next favourite piece…" value={q} onChange={e=>setQ(e.target.value)}/><button className="text-button">Search <ArrowRight size={16}/></button><button className="icon" type="button" aria-label="Close search" onClick={()=>setSearch(false)}><X/></button></form>}{syncError&&<div className="account-sync-banner" role="alert">{syncError} <button className="underlink" onClick={()=>refreshAccount().catch(()=>{})}>Reload account</button></div>}</>}
function Footer(){const {config}=useStore();return <footer><div className="footer-top"><div><Brand/><p>For the moments that become memories.</p></div><div><h4>EXPLORE</h4><Link to="/collections/all">All jewellery</Link><Link to="/coins">Gold & Silver Coins</Link><Link to="/collections/saved">Your saved pieces</Link><Link to="/bag">Shopping bag</Link><Link to="/account">My account</Link></div><div><h4>HERE TO HELP</h4><Link to="/information/shipping">Delivery & returns</Link><Link to="/information/care">Jewellery care</Link><Link to="/information/contact">Contact us</Link></div><div><h4>A NOTE FROM THE MAISON</h4><p>Beautiful things take time.<br/>Discover a collection made for yours.</p><Link to="/collections/all" className="footer-cta">Find your piece <ArrowUpRight size={17}/></Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Veyora Jewels</span><span>India · INR ₹</span><Link to="/admin">Merchant studio ↗</Link></div>{config.preview&&<p className="preview-note">Design preview · Fictional catalogue and prices · Reference imagery from the Maison Perle design brief</p>}</footer>}
function Layout({children}){return <><Header/><main>{children}</main><Footer/><BagDrawer/></>}
function Home(){const {products,error}=useStore();const hero=useRef();useEffect(()=>{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const ctx=gsap.context(()=>{gsap.from('.hero-copy > *',{y:22,opacity:0,duration:1.1,stagger:.12,ease:'power2.out'});gsap.from('.hero-photo',{opacity:0,duration:1.6})},hero);return()=>ctx.revert()}},[]);const unique=grouped(products);return <Layout><section className="hero" ref={hero}><div className="hero-photo"><video autoPlay={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} muted loop playsInline poster={media('Pearls Collection')} aria-label="Reference pearl jewellery campaign"><source src="https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4" type="video/mp4"/></video><div className="image-grain"/></div><div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/>THE PEARL EDIT · CHAPTER 01</div><h1>Quiet beauty.<br/>Lasting <em>impressions.</em></h1><p>A little light. A quiet statement.<br/>Jewellery that feels unmistakably you.</p><Link className="button light" to="/collections/pearls">Shop the collection <ArrowUpRight size={18}/></Link><span className="hero-bottom">THE EXTRAORDINARY, IN THE EVERYDAY</span></div><span className="hero-index">01 <span>/ 03</span></span><a className="hero-scroll" href="#collections">EXPLORE <span>↓</span></a></section><div className="value-strip"><span><Gem size={17}/>Considered details</span><span><Heart size={17}/>Pieces to make your own</span><span><Package size={17}/>A moment worth unwrapping</span></div><section id="collections" className="section collection-section"><div className="section-heading"><div><span className="eyebrow">A WORLD OF VEYORA</span><h2>Find your <em>kind of beautiful.</em></h2></div><Link className="underlink" to="/collections/all">Explore all jewellery <ArrowUpRight size={17}/></Link></div><div className="category-grid">{[['Earrings','Lune Pearl Drop','A little movement. A lot of meaning.'],['Necklaces','Atelier Ribbon Collar','Close to your heart.'],['Rings','Eclipse Ring','Your everyday signature.'],['Bracelets','Nocturne Cuff','The finishing touch.']].map(([name,img,sub],i)=><Link className="category-card" to={'/collections/'+name.toLowerCase()} key={name}><div className="category-photo"><img loading="lazy" src={media(img)} alt={`${name} reference collection`}/><span className="category-no">0{i+1}</span><span className="round-arrow"><ArrowUpRight size={21}/></span></div><h3>{name}</h3><p>{sub}</p></Link>)}</div></section><section className="featured section"><div className="section-heading"><div><span className="eyebrow">THE PIECES YOU COME BACK TO</span><h2>Destined to be <em>your favourite.</em></h2></div><Link className="underlink" to="/collections/all">Discover the edit <ArrowUpRight size={17}/></Link></div>{error?<p className="error">{error}</p>:<div className="product-grid home-products">{unique.slice(0,4).map(p=><ProductCard key={p.sku} p={p}/>)}</div>}</section><section className="editorial"><div className="editorial-image"><img loading="lazy" src={media('Fine Jewelry Collection')} alt="Fine jewellery reference study in light and texture"/></div><div className="editorial-copy"><span className="eyebrow">LESS, BUT MORE MEANINGFUL</span><h2>Never just<br/><em>an accessory.</em></h2><p>A first chapter. An everyday ritual. A moment you want to keep close. Find the piece that becomes part of your story.</p><Link className="underlink" to="/collections/all">Meet your next heirloom <ArrowUpRight size={18}/></Link><span className="editorial-flower">✳</span></div></section><section className="closing"><span className="eyebrow">SOMETHING TO TREASURE</span><h2>Good things come in <em>little boxes.</em></h2><p>For someone you love. Including yourself.</p><Link className="button dark" to="/collections/all">Find a little wonder <ArrowUpRight size={17}/></Link></section></Layout>}
function ProductCard({p}){const {saved,toggleSave}=useStore();const hasRange=p.minPrice&&p.maxPrice&&p.minPrice!==p.maxPrice;const priceDisplay=p.price===null?'Price awaiting rate':(hasRange?`${money(p.minPrice)} – ${money(p.maxPrice)}`:`${money(p.price)}${p.category==='Rings'?' onwards':''}`);const isGoldLinked=p.pricing_mode==='GOLD_LINKED';return <article className="product-card"><div className="product-photo"><Link to={'/products/'+p.slug}><img loading="lazy" src={p.image} alt={`${p.name}, ${p.metal} ${p.purity}, ${p.finish}`}/></Link>{isGoldLinked&&<span className="gold-linked-badge" title="Dynamic price linked to live bullion gold rate"><Sparkles size={10}/> GOLD-LINKED RATE</span>}<button className={'save-piece icon '+(saved.includes(p.product_code)?'selected':'')} aria-label={`Save ${p.name}`} aria-pressed={saved.includes(p.product_code)} onClick={()=>toggleSave(p.product_code)}><Heart size={18}/></button><span className="product-label">{p.stock===0?'CURRENTLY UNAVAILABLE':p.category==='Rings'?'YOUR EVERYDAY SIGNATURE':'THE PEARL EDIT'}</span></div><div className="product-info"><Link to={'/products/'+p.slug}><h3>{p.name}</h3></Link><span>{p.metal} · {p.purity} · {p.category}</span><p>{priceDisplay}</p>{isGoldLinked&&<span className="gold-linked-subtext">✦ Live Gold-Linked Pricing</span>}</div></article>}
function Collection(){const {category='all'}=useParams();const {products,saved}=useStore();const [params,setParams]=useSearchParams();const [filters,setFilters]=useState(false);const listRef=useRef();useEffect(()=>{document.title=`${category==='all'?'All jewellery':category} | Veyora Jewels`;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.fromTo(listRef.current,{opacity:0,y:10},{opacity:1,y:0,duration:.5});const key='scroll:'+location.pathname+location.search;requestAnimationFrame(()=>window.scrollTo(0,Number(sessionStorage.getItem(key)||0)));const save=()=>sessionStorage.setItem(key,String(window.scrollY));window.addEventListener('scroll',save);return()=>window.removeEventListener('scroll',save)},[category,params.toString()]);const update=(k,v)=>{const next=new URLSearchParams(params);v?next.set(k,v):next.delete(k);setParams(next,{replace:true})};const q=params.get('q')||'';let items=grouped(products.filter(p=>(['all','pearls','saved'].includes(category)||p.category.toLowerCase()===category)&&(category!=='saved'||saved.includes(p.product_code)))).filter(p=>(p.name+' '+p.description).toLowerCase().includes(q.toLowerCase())&&(!params.get('purity')||p.purity===params.get('purity'))&&(!params.get('stock')||p.stock>0)&&matchPrice(p.price,params.get('price')));if(params.get('sort')==='price-asc')items.sort((a,b)=>a.price-b.price);if(params.get('sort')==='price-desc')items.sort((a,b)=>b.price-a.price);const title={all:'The jewellery collection',pearls:'The Pearl Edit',saved:'Your saved pieces'}[category]||category;return <Layout><div className="collection-intro"><span className="eyebrow">THE VEYORA COLLECTIONS</span><h1>{title}</h1><p>Considered pieces. Quiet statements. Endlessly you.</p><div className="collection-tabs">{['all','earrings','necklaces','rings','bracelets'].map(c=><Link className={category===c?'active':''} key={c} to={'/collections/'+c}>{c==='all'?'All jewellery':c}</Link>)}</div><div className="price-bracket-bar" role="group" aria-label="Filter by price bracket"><span className="price-bracket-title">Price:</span>{priceBrackets.map(b=><button key={b.value} type="button" className={'price-bracket-pill '+((params.get('price')||'')===b.value?'active':'')} onClick={()=>update('price',b.value)} aria-pressed={(params.get('price')||'')===b.value}>{b.label}</button>)}</div></div><section className="section catalogue" ref={listRef}><div className="filter-toolbar"><button className="text-button" onClick={()=>setFilters(!filters)}><SlidersHorizontal size={16}/> Filter & refine {params.size>0&&`(${params.size})`}</button><span>{items.length} pieces</span><label>Sort by <select aria-label="Sort products" value={params.get('sort')||'featured'} onChange={e=>update('sort',e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div>{filters&&<div className="filters"><label>Search<input placeholder="Search the collection" value={q} onChange={e=>update('q',e.target.value)}/></label><label>Purity<select value={params.get('purity')||''} onChange={e=>update('purity',e.target.value)}><option value="">All purities</option><option>18K</option><option>22K</option></select></label><label>Price bracket<select value={params.get('price')||''} onChange={e=>update('price',e.target.value)}>{priceBrackets.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={!!params.get('stock')} onChange={e=>update('stock',e.target.checked?'1':'')}/> In stock only</label><button className="text-button" onClick={()=>setParams({})}>Clear all</button></div>}{items.length?<div className="product-grid">{items.map(p=><ProductCard p={p} key={p.sku}/>)}</div>:<div className="empty"><Gem/><h2>No pieces found</h2><p>Try another filter, or explore the full collection.</p><Link className="button dark" to="/collections/all">Explore all jewellery</Link></div>}</section></Layout>}
function Modal({title,children,onClose}){const el=useRef();useEffect(()=>{const prev=document.activeElement;el.current?.focus();const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=el.current.querySelectorAll('button,a,input,select,textarea');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=old;prev?.focus()}},[]);return <div className="modal-backdrop" onClick={onClose}><section ref={el} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{title}</h2><button className="icon" aria-label="Close dialog" onClick={onClose}><X/></button></div>{children}</section></div>}
function StructuredProduct({p}){const data={"@context":"https://schema.org","@type":"Product",name:p.name,description:p.description,image:p.image,sku:p.sku,material:p.metal,brand:{"@type":"Brand",name:"Veyora Jewels"},offers:{"@type":"Offer",priceCurrency:"INR",price:p.price,availability:"https://schema.org/"+(p.checkout_available?'InStock':'OutOfStock'),url:window.location.href}};return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>}
function Product(){
  const {slug}=useParams();
  const {products,add,saved,toggleSave}=useStore();
  const variants=products.filter(p=>p.slug===slug);
  const [sku,setSku]=useState(''),[guide,setGuide]=useState(false),[zoom,setZoom]=useState(false);
  const [selectedImage,setSelectedImage]=useState(null);
  const p=variants.find(p=>p.sku===sku)||variants[0];
  useEffect(()=>{setSku('');setSelectedImage(null);},[slug]);
  useEffect(()=>{if(p)document.title=p.name+' | Veyora Jewels'},[p?.name]);
  if(!p)return <Layout><div className="empty"><h1>Finding your piece…</h1><Link to="/collections/all">Back to collection</Link></div></Layout>;

  const angleImages=(p.images&&p.images.length>0)?p.images:(p.image?[{id:'default',role:'hero',url:p.image,alt_text:p.name}]:[]);
  const activeImage=selectedImage||angleImages[0]?.url||p.image;

  return <Layout><StructuredProduct p={p}/><div className="breadcrumbs section"><Link to="/collections/all">Jewellery</Link><span>/</span><Link to={'/collections/'+p.category.toLowerCase()}>{p.category}</Link><span>/</span><span>{p.name}</span></div><section className="product-detail section"><div className="detail-gallery"><button aria-label="Zoom product photograph" className="detail-image" onClick={()=>setZoom(true)}><img src={activeImage} alt={`${p.name}, ${p.size}, ${p.purity} ${p.metal}`}/>{p.pricing_mode==='GOLD_LINKED'&&<span className="gold-linked-badge"><Sparkles size={11}/> LIVE GOLD-LINKED RATE</span>}<span><Plus size={16}/> Click to explore</span></button>{angleImages.length>1&&<div className="product-angle-gallery" role="group" aria-label="Product angle views">{angleImages.map((img,idx)=>{const isSelected=activeImage===img.url;const roleLabels={hero:'Hero Shot',front:'Front Angle',left:'Left View',right:'Right View',model:'Model Shot',detail:'Detail'};const label=roleLabels[img.role]||img.role;return <button key={img.id||idx} type="button" className={'angle-thumb-btn '+(isSelected?'active':'')} onClick={()=>setSelectedImage(img.url)} aria-label={`View ${label}`} title={label}><img src={img.url} alt={img.alt_text||`${p.name} ${label}`}/><span className="angle-label">{img.role}</span></button>;})}</div>}<p className="caption">MULTI-ANGLE PHOTOGRAPHY · PREVIEW CATALOGUE</p></div><div className="detail-copy"><span className="eyebrow">THE PEARL EDIT</span><h1>{p.name}</h1><p className="material-line">{p.purity} {p.metal} · {p.finish} finish</p><div className="detail-price">{p.price===null?'Awaiting approved rate':money(p.price)}</div>{p.pricing_mode==='GOLD_LINKED'&&<div><span className="gold-linked-pill"><Sparkles size={12}/> Live Gold-Linked Rate</span></div>}<p className="small muted">Preview price · Shipping calculated before payment</p><p className="detail-description">{p.description}</p><div className="size-label"><label htmlFor="size">{p.category==='Rings'?'Ring size':'Size / length'}</label><button className="underlink" onClick={()=>setGuide(true)}>Size guide ↗</button></div><select id="size" value={p.sku} onChange={e=>setSku(e.target.value)}>{variants.map(v=><option value={v.sku} key={v.sku}>{v.size}{v.stock===0?' — Out of stock':''}</option>)}</select><p className={'stock '+(!p.checkout_available?'unavailable':'')}><span/>{p.stock===0?'Currently out of stock':!p.checkout_available?'Awaiting a fresh verified gold rate':`${p.stock} available · Ready for your next chapter`}</p><div className="add-row"><button className="button dark" disabled={!p.checkout_available} onClick={()=>add(p)}>{p.checkout_available?'Add to bag':'Currently unavailable'}<ShoppingBag size={18}/></button><button className="wishlist-button" aria-label="Save piece" aria-pressed={saved.includes(p.product_code)} onClick={()=>toggleSave(p.product_code)}><Heart fill={saved.includes(p.product_code)?'currentColor':'none'} size={20}/></button></div><dl className="specs"><div><dt>Metal & purity</dt><dd>{p.metal}, {p.purity}</dd></div><div><dt>Net metal weight</dt><dd>{Number(p.net_weight_g).toFixed(3)} g</dd></div><div><dt>Size / finish</dt><dd>{p.size} / {p.finish}</dd></div><div><dt>SKU</dt><dd>{p.sku}</dd></div></dl><details><summary>Price details <Plus size={15}/></summary>{p.breakdown?.mode==='GOLD_LINKED'?<div className="breakdown">{[['Metal value',p.breakdown.metal],['Making charges',p.breakdown.making],['Stone charges',p.breakdown.stone],['Other charges',p.breakdown.other],['Tax',p.breakdown.tax]].map(([l,v])=><p key={l}><span>{l}</span>{money(v)}</p>)}<p className="small">Rate: {money(p.breakdown.rate)}/g · {p.breakdown.rate_date}</p></div>:<p>Fixed merchant selling price. Gold-rate changes do not change this price.</p>}</details><details><summary>Delivery & returns <Plus size={15}/></summary><p>Delivery and return policies are awaiting merchant details. <Link to="/information/shipping">View current information</Link>.</p></details></div></section>{guide&&<Modal title="Find your fit" onClose={()=>setGuide(false)}><p>For a ring, measure the inside diameter of a comfortable ring. These are general reference sizes; confirm the final merchant sizing chart before ordering.</p><table><thead><tr><th>Indian size</th><th>Inside diameter</th></tr></thead><tbody><tr><td>12</td><td>16.5 mm</td></tr><tr><td>14</td><td>17.2 mm</td></tr></tbody></table><p>For necklaces, use a soft tape to check the listed length. Cuff sizing requires the merchant’s wrist measurements.</p></Modal>}{zoom&&<Modal title={p.name} onClose={()=>setZoom(false)}><div className="zoom-frame"><img src={activeImage} alt={`${p.name}, enlarged view`} /></div><p className="small">High-resolution reference photography. Pinch or scroll to inspect craftsmanship details.</p></Modal>}</Layout>}
function BagLines(){const {bag,setBag}=useStore();const change=(sku,n)=>setBag(b=>b.map(p=>p.sku===sku?{...p,quantity:p.quantity+n}:p).filter(p=>p.quantity>0));return bag.map(p=><div className="bag-line" key={p.sku}><Link to={p.sku?.startsWith('COIN-')?'/coins':'/products/'+(p.slug||p.sku)}><img src={p.image} alt={p.name}/></Link><div><h3>{p.name}</h3><p>{p.size} · {p.sku}</p><strong>{money(p.price)}</strong><div className="quantity"><button aria-label={`Remove one ${p.name}`} onClick={()=>change(p.sku,-1)}><Minus size={13}/></button><span>{p.quantity}</span><button aria-label={`Add one ${p.name}`} onClick={()=>change(p.sku,1)} disabled={p.quantity>=20}><Plus size={13}/></button><button className="remove" onClick={()=>setBag(b=>b.filter(x=>x.sku!==p.sku))}>Remove</button></div></div></div>)}
function BagDrawer(){const {bagOpen,setBagOpen,bag}=useStore();const nav=useNavigate();if(!bagOpen)return null;return <Modal title={`Your bag (${bag.reduce((n,p)=>n+p.quantity,0)})`} onClose={()=>setBagOpen(false)}>{bag.length?<><BagLines/><div className="summary-line"><span>Estimated subtotal</span><strong>{money(bag.reduce((n,p)=>n+p.price*p.quantity,0))}</strong></div><p className="small muted">Current price, availability and delivery charges are checked at checkout.</p><button className="button dark full" onClick={()=>{setBagOpen(false);nav('/checkout')}}>Continue to checkout <ArrowRight size={17}/></button><button className="text-button full" onClick={()=>{setBagOpen(false);nav('/collections/all')}}>Continue discovering</button></>:<div className="empty"><ShoppingBag size={32}/><h3>A little room for wonder.</h3><p>Your bag is waiting for something special.</p><button className="button dark" onClick={()=>{setBagOpen(false);nav('/collections/all')}}>Explore the collection</button></div>}</Modal>}
function Bag(){const {bag}=useStore();return <Layout><section className="section bag-page"><span className="eyebrow">YOUR LITTLE TREASURES</span><h1>The shopping bag</h1>{bag.length?<><BagLines/><Link className="button dark" to="/checkout">Continue to checkout <ArrowRight size={17}/></Link></>:<div className="empty"><p>Your bag is empty.</p><Link className="button dark" to="/collections/all">Find your piece</Link></div>}</section></Layout>}
function Checkout(){const {bag,setBag,config,customer,flushAccount,afterCheckout}=useStore();const [quote,setQuote]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[accepted,setAccepted]=useState(false),[changed,setChanged]=useState(false),[testFailure,setTestFailure]=useState(false);const key=useRef(crypto.randomUUID());const nav=useNavigate();useEffect(()=>{setAccepted(false);api('/quote',{items:bag.map(({sku,quantity})=>({sku,quantity}))}).then(setQuote).catch(e=>setError(e.message));},[bag]);async function pay(e){e.preventDefault();if(!accepted||!quote)return;setBusy(true);setError('');if(testFailure){setError('Test payment declined. Your bag is saved. Untick the test failure option to retry.');setBusy(false);return;}const customer=Object.fromEntries(new FormData(e.target));try{await flushAccount();const r=await api('/checkout',{items:bag.map(({sku,quantity})=>({sku,quantity})),token:quote.token,customer,idempotencyKey:key.current});await afterCheckout();nav('/order/'+r.id);}catch(e){setError(e.message);if(e.quote){setQuote(e.quote);setChanged(true);setAccepted(false)}}finally{setBusy(false)}}return <Layout><section className="section checkout-page"><Link className="underlink" to="/bag"><ArrowLeft size={15}/> Back to bag</Link><div className="section-heading"><div><span className="eyebrow">ONE STEP CLOSER</span><h1>A little wonder, on its way.</h1></div><span className="test-badge">TEST CHECKOUT · NO MONEY COLLECTED</span></div>{!bag.length?<div className="empty"><p>Your bag is empty.</p><Link to="/collections/all">Explore jewellery</Link></div>:<div className="checkout-grid"><form onSubmit={pay}><h3>Contact & delivery</h3>{customer?<p className="checkout-account-note">Signed in as {customer.email} · This order will appear in your account.</p>:<p className="checkout-account-note"><Link to="/account">Sign in or create an account</Link> to keep your order history. Guest checkout is also available.</p>}<div className="form-grid">{[['name','Full name','text'],['email','Email address','email'],['phone','Mobile number','tel'],['pincode','PIN code','text'],['address','Address','text'],['city','City','text']].map(([name,label,type])=><label key={name} className={name==='address'?'span-two':''}>{label}<input name={name} type={type} defaultValue={name==='name'?customer?.name:name==='email'?customer?.email:undefined} autoComplete={{name:'name',email:'email',phone:'tel',pincode:'postal-code',address:'street-address',city:'address-level2'}[name]} required maxLength={name==='phone'?10:name==='pincode'?6:200} pattern={name==='phone'?'[0-9]{10}':name==='pincode'?'[0-9]{6}':undefined}/></label>)}</div><div className="checkout-note"><ShieldCheck size={20}/><p>This is a simulated payment. No card or bank details are requested. Delivery and returns are awaiting merchant configuration.</p></div><label className="checkbox"><input type="checkbox" checked={testFailure} onChange={e=>setTestFailure(e.target.checked)}/> Simulate a failed test payment</label>{changed&&<div className="notice">The price changed. Review the updated order summary before accepting.</div>}<label className="checkbox consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/>I accept the displayed total of {money(quote?.total)} for this test order.</label>{error&&<p className="error" role="alert">{error}</p>}<button className="button dark full" disabled={busy||!quote||!accepted}>{busy?'Confirming…':`Place test order · ${money(quote?.total)}`}<ArrowRight size={17}/></button></form><aside className="order-summary"><h3>Your chosen pieces</h3>{quote?.lines.map(p=><div className="summary-product" key={p.sku}><img src={p.image} alt={p.name}/><div><h4>{p.name}</h4><p>{p.size} · Qty {p.quantity}</p><span>{money(p.unit_price*p.quantity)}</span></div></div>)}<div className="summary-line"><span>Subtotal</span>{money(quote?.subtotal)}</div><div className="summary-line"><span>Delivery</span>{quote?.shipping===0?'Complimentary':money(quote?.shipping)}</div><div className="summary-line total"><span>Total payable</span>{money(quote?.total)}</div><p className="small">Displayed total includes any configured taxes. All orders in this preview are fictional.</p></aside></div>}</section></Layout>}
function Order(){const {id}=useParams();const [o,setO]=useState(null),[error,setError]=useState('');useEffect(()=>{api('/orders/'+id).then(setO).catch(e=>setError(e.message))},[id]);return <Layout><section className="order-confirm section"><CheckCircle2 size={42}/><span className="eyebrow">A NEW CHAPTER</span><h1>A little wonder is yours.</h1>{error?<p className="error">{error}</p>:o?<><p>Your test order is confirmed. No payment has been collected.</p><div className="confirmation-card"><div className="summary-line"><span>Order reference</span><strong>{o.id}</strong></div><div className="summary-line"><span>Placed</span>{date(o.created_at)}</div><div className="summary-line"><span>Saved order total</span>{money(o.total)}</div>{o.items.map(i=><p key={i.sku}>{i.name} · {i.size} × {i.quantity}</p>)}</div></>:<p>Loading your confirmation…</p>}<Link className="button dark" to="/collections/all">Keep discovering <ArrowRight size={17}/></Link></section></Layout>}
function Information(){const {page}=useParams();const {config}=useStore();return <Layout><section className="section info-page"><span className="eyebrow">AT YOUR SERVICE</span><h1>{page==='shipping'?'Delivery & returns':page==='care'?'Care for your jewellery':'Get in touch'}</h1>{page==='shipping'?<><h3>Delivery</h3><p>{config.shippingPolicy||'The merchant’s delivery areas and timeframes are awaiting confirmation. Preview shipping is ₹250, with complimentary delivery from ₹25,000. The final charge is shown before a test order is placed.'}</p><h3>Returns</h3><p>{config.returnsPolicy||'The merchant’s actual returns, exchange and cancellation policy has not yet been supplied. This preview does not accept live orders.'}</p></>:page==='care'?<p>Store pieces separately in a soft pouch. Avoid perfume, harsh cleaning products and prolonged water exposure. Ask the merchant for material-specific care instructions for your chosen piece.</p>:<p>{config.contact?<a href={'mailto:'+config.contact}>{config.contact}</a>:'The merchant’s contact details will appear here once supplied. This store is currently a design and checkout preview.'}</p>}</section></Layout>}
const adminTabs=[['Dashboard',LayoutDashboard],['Products',Gem],['Coins',CoinsIcon],['Gold Rates',ChartNoAxesCombined],['Pricing Rules',SlidersHorizontal],['Imports',Upload],['Orders',Package],['Settings',Settings]];
function Admin(){const [staff,setStaff]=useState(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[tab,setTab]=useState('Dashboard'),[data,setData]=useState(null),[products,setProducts]=useState([]),[busy,setBusy]=useState(false);const {config}=useStore();async function refresh(){const [d,p]=await Promise.all([api('/admin/dashboard'),api('/admin/products')]);setData(d);setProducts(p)}useEffect(()=>{api('/admin/session').then(s=>{sessionStorage.setItem('csrf',s.csrf);setStaff(s.staff);return refresh()}).catch(()=>{}).finally(()=>setLoaded(true))},[]);async function login(e){e.preventDefault();setError('');try{const s=await api('/admin/login',Object.fromEntries(new FormData(e.target)));sessionStorage.setItem('csrf',s.csrf);setStaff(s.staff);await refresh()}catch(e){setError(e.message)}}async function run(kind){setBusy(true);setError('');try{const r=await api('/admin/run',{kind});await refresh();if(Object.values(r.result).some(v=>!v.ok))setError(Object.entries(r.result).filter(([,v])=>!v.ok).map(([k,v])=>`${k}: ${v.message}`).join(' · '))}catch(e){setError(e.message)}finally{setBusy(false)}}if(!loaded)return <div className="empty">Opening merchant studio…</div>;if(!staff)return <div className="admin-login"><Link className="underlink" to="/"><ArrowLeft size={16}/>Back to storefront</Link><div className="login-card"><Brand/><span className="eyebrow">THE MERCHANT STUDIO</span><h1>Welcome back.</h1><p>Your collections, thoughtfully managed.</p><form onSubmit={login}><label>Email<input name="email" type="email" autoComplete="username" defaultValue={config.preview?'preview@veyora.local':''} required/></label><label>Password<input name="password" type="password" autoComplete="current-password" defaultValue={config.preview?'preview-veyora-2026':''} required/></label>{error&&<p className="error">{error}</p>}<button className="button dark full">Sign in <ArrowRight size={17}/></button></form>{config.preview&&<p className="small muted">Local preview account is prefilled. Production requires your own staff account.</p>}</div></div>;return <div className="admin-shell"><aside className="admin-sidebar"><Brand/><span className="studio-label">MERCHANT STUDIO</span><nav>{adminTabs.map(([label,Icon])=><button key={label} className={tab===label?'active':''} onClick={()=>{setTab(label);setError('')}}><Icon size={18}/>{label}</button>)}</nav><div className="admin-sidebar-bottom"><Link to="/">View storefront <ArrowUpRight size={15}/></Link><small>{staff.email}<br/>{staff.role}</small><button className="text-button" onClick={async()=>{await api('/admin/logout',{});setStaff(null);sessionStorage.removeItem('csrf')}}><LogOut size={15}/>Sign out</button></div></aside><main className="admin-main"><header className="admin-header"><span>VEYORA / STUDIO / {tab.toUpperCase()}</span><span className="test-badge">{data?.preview?'PREVIEW ENVIRONMENT':'MERCHANT ENVIRONMENT'}</span></header><div className="admin-content"><div className="section-heading"><div><span className="eyebrow">YOUR MAISON, AT A GLANCE</span><h1>{tab==='Dashboard'?'A considered overview.':tab}</h1></div><button className="text-button" onClick={()=>refresh().catch(e=>setError(e.message))}><RefreshCw size={15}/>Refresh</button></div>{error&&<div className="error" role="alert">{error}</div>}{!data?<p>Loading studio…</p>:<>{tab==='Dashboard'&&<><div className="admin-stats"><Stat title="ACTIVE GOLD RATES" value={data.rates.length} detail={`${data.rates.filter(r=>r.fresh).length} within freshness limit`}/><Stat title="CATALOGUE VARIANTS" value={products.length} detail={`${products.filter(p=>p.stock===0).length} out of stock`}/><Stat title="TODAY’S IMPORTS" value={data.todayImports?.failed?'Needs review':'All clear'} detail={`${data.todayImports?.published||0} published · ${data.todayImports?.failed||0} failed`}/><Stat title="ORDERS" value={data.orders.length} detail={`${money(data.orders.reduce((s,o)=>s+Number(o.total),0))} total · includes test orders`}/></div><div className="admin-two"><div className="admin-panel"><div className="panel-title"><h3>Active gold rates</h3><button className="underlink" onClick={()=>setTab('Gold Rates')}>View rates ↗</button></div><RateTable rates={data.rates}/></div><div className="admin-panel"><h3>Needs your attention</h3>{data.feedSettings?.feedStatus==='stopped'&&<div className="attention" style={{borderLeft:'3px solid #c62828',paddingLeft:'12px'}}><AlertCircle size={19} color="#c62828"/><div><strong style={{color:'#c62828'}}>Feed Automation is STOPPED</strong><p>Background syncs and live rates are paused. <button className="underlink" onClick={()=>setTab('Settings')}>Open Settings to start ↗</button></p></div></div>}<div className="attention"><AlertCircle size={19}/><div><strong>{data.rates.some(r=>!r.fresh)?'Gold rates are stale':'Launch configuration pending'}</strong><p>Live payments, merchant policies, original photography and Hostinger verification are still required.</p></div></div>{data.scheduleMissed&&<div className="attention"><AlertCircle size={19}/><div><strong>Daily schedule needs attention</strong><p>Daily imports default to 09:00 India time. A manual run does not verify cron.</p></div></div>}<p className="small">Maximum rate age: {data.maxAgeHours} hours. Stale gold-linked items pause at checkout.</p></div></div><div className="admin-panel"><h3>Supplier freshness</h3><div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Feed</th><th>Last published source</th></tr></thead><tbody>{data.suppliers.map(s=><tr key={s.supplier+s.kind}><td>{s.supplier}</td><td>{s.kind}</td><td>{date(s.last_update)}</td></tr>)}</tbody></table></div></div><BatchTable batches={data.batches.slice(0,6)}/><div className="admin-panel"><h3>Recent staff activity</h3>{data.audits.slice(0,8).map(a=><p className="audit-line" key={a.id}><span>{a.action} · Staff {a.staff_id||'system'}</span><span>{date(a.created_at)}</span></p>)}</div></>}{tab==='Gold Rates'&&<><div className="notice">Rates are explicitly purity-specific. No automatic purity conversion is enabled. Original values and corrections remain in rate history. Maximum age: {data.maxAgeHours} hours.</div><div className="admin-panel"><div className="panel-title"><h3>Approved rates</h3><button disabled={busy||staff.role==='viewer'} className="button dark small-button" onClick={()=>run('gold')}><RefreshCw size={15}/>Run rate feed</button></div><RateTable rates={data.rates}/></div><ImportPanel kind="gold" refresh={refresh} readonly={staff.role==='viewer'}/><div className="admin-panel"><h3>Rate history & corrections</h3><RateTable rates={(data.rateHistory||[]).map(r=>({...r,fresh:data.rates.some(a=>a.id===r.id&&a.fresh)}))}/></div></>}{tab==='Products'&&<><div className="notice">Supplier imports preserve merchant names, descriptions and publication status by default. Stock is an absolute snapshot, adjusted for paid orders after its source timestamp.</div><ImageUploader products={products} refreshParent={refresh}/><div className="admin-panel"><div className="table-wrap"><table><thead><tr><th>Piece / SKU</th><th>Pricing</th><th>Weight</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>{products.map(p=><ProductRow key={p.id} p={p} readonly={staff.role==='viewer'} refresh={refresh}/>)}</tbody></table></div></div><div style={{display:'flex',gap:'12px',marginTop:'16px'}}><button className="button dark" onClick={()=>setTab('Imports')}>Add products through CSV <Upload size={16}/></button><a className="button secondary" href="/api/admin/export/products" download style={{display:'inline-flex',alignItems:'center',gap:'8px',textDecoration:'none'}}>Export catalogue CSV <Download size={16}/></a></div></>}{tab==='Coins'&&<CoinsAdmin readonly={staff.role==='viewer'} refreshParent={refresh}/>}{tab==='Pricing Rules'&&<Rules rule={data.rule} readonly={staff.role!=='owner'} refresh={refresh}/ >}{tab==='Imports'&&<><div className="admin-two"><div className="admin-panel"><span className="eyebrow">DAILY WORKFLOW</span><h3>Rates first. Catalogue second.</h3><p>09:00 Asia/Kolkata · 03:30 UTC</p><p className="small muted">Feed sources are configured securely on the server. Current inventory mode: {data.feedSettings.inventoryMode}.</p><button className="button dark" disabled={busy||staff.role==='viewer'} onClick={()=>run(null)}>{busy?'Running…':'Run both feeds now'}<RefreshCw size={16}/></button></div><div className="admin-panel"><h3>Source connections</h3><p>Gold feed: <Status text={data.feedSettings.goldConfigured?'Configured':'Not configured'}/></p><p>Product feed: <Status text={data.feedSettings.productsConfigured?'Configured':'Not configured'}/></p><p className="small muted">Private feed URLs and credentials never appear in this screen. Failed rate feeds retain the last verified rate.</p><button className="underlink" disabled={busy||staff.role==='viewer'} onClick={()=>run('products')}>Run product feed only ↗</button></div></div><div className="admin-two"><ImportPanel kind="gold" refresh={refresh} readonly={staff.role==='viewer'}/><ImportPanel kind="products" refresh={refresh} readonly={staff.role==='viewer'}/></div><ImageUploader products={products} refreshParent={refresh}/><FeedSettings data={data} refresh={refresh} readonly={staff.role!=='owner'}/><BatchTable batches={data.batches} retry={async b=>{try{await api(`/admin/import/${b.id}/publish`,{});await refresh()}catch(e){setError(e.message)}}} readonly={staff.role==='viewer'}/><div className="admin-panel"><h3>Workflow history</h3>{data.runs.length?data.runs.map(r=><div key={r.id} className="run-record"><strong>Run #{r.id} · {r.trigger} · {date(r.started_at)}</strong>{Object.entries(r.result).map(([k,v])=><p key={k}>{k}: {v.ok?`Succeeded · Source ${v.source_date} · Created ${v.created} / Updated ${v.updated} / Unchanged ${v.unchanged} / Rejected ${v.rejected}`:v.message}</p>)}</div>):<p>No workflow has run. The Hostinger schedule is unverified.</p>}</div></>}{tab==='Orders'&&<div className="admin-panel"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}><h3>All Orders</h3><a className="underlink" href="/api/admin/export/orders" download style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>Export orders CSV ↓</a></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Placed (India)</th><th>Payment</th><th>Total</th></tr></thead><tbody>{data.orders.map(o=><tr key={o.id}><td><Link to={'/order/'+o.id}>{o.id} ↗</Link></td><td>{o.customer.name}<small>{o.customer.email}</small></td><td>{date(o.created_at)}</td><td><Status text={`${o.payment_mode} · ${o.status}`}/></td><td>{money(o.total)}</td></tr>)}</tbody></table>{!data.orders.length&&<p className="empty">Orders will appear here after checkout.</p>}</div></div>}{tab==='Settings'&&<SettingsAdmin data={data} refresh={refresh} readonly={staff.role!=='owner'}/>}</>}</div></main></div>}
function Stat({title,value,detail}){return <div className="stat"><span className="eyebrow">{title}</span><strong>{value}</strong><small>{detail}</small></div>}
function Status({text}){return <span className={'status-badge '+(/failed|stale|Not configured/.test(text)?'warning':'')}>{text}</span>}
function RateTable({rates}){return <div className="table-wrap"><table><thead><tr><th>Purity</th><th>INR / gram</th><th>Source / original</th><th>Effective date</th><th>Status</th></tr></thead><tbody>{rates.map(r=><tr key={r.id}><td><strong>{r.purity}</strong></td><td>{money(r.inr_per_gram)}</td><td>{r.supplier}<small>{money(r.original_rate)} / {r.original_unit}</small></td><td>{r.effective_date}<small>{date(r.source_timestamp)}</small></td><td><Status text={r.fresh?'Verified':'stale — checkout paused'}/></td></tr>)}</tbody></table>{!rates.length&&<p>No approved rates. Import a rate file to begin.</p>}</div>}
function BatchTable({batches,retry,readonly}){return <div className="admin-panel"><h3>Import history</h3><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Supplier / source</th><th>Status</th><th>Created / Updated / Rejected</th><th>Actions</th></tr></thead><tbody>{batches.map(b=><tr key={b.id}><td>#{b.id} · {b.kind}</td><td>{b.supplier}<small>{date(b.source_timestamp)}</small></td><td><Status text={b.status}/></td><td>{b.summary.created} / {b.summary.updated} / {b.summary.rejected}</td><td>{b.status==='failed'?<a className="underlink" href={`/api/admin/import/${b.id}/errors`}>Errors CSV ↓</a>:b.status==='staged'&&retry&&!readonly?<button className="underlink" onClick={()=>retry(b)}>Publish / retry ↗</button>:'—'}</td></tr>)}</tbody></table></div></div>}
function ImportPanel({kind,refresh,readonly}){const [batch,setBatch]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const prefix=kind==='gold'?'gold-rates':'products';async function upload(e){const file=e.target.files[0];if(!file)return;setError('');setBatch(null);setBusy(true);try{if(file.size>5*1024*1024)throw Error('Maximum CSV size is 5 MB');const b=await api('/admin/import/preview',{kind,csv:await file.text()});setBatch(b);await refresh()}catch(e){setError(e.message)}finally{setBusy(false);e.target.value=''}}async function publish(){setBusy(true);try{await api(`/admin/import/${batch.id}/publish`,{});setBatch(null);await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}return <div className="admin-panel import-panel"><Upload size={23}/><h3>{kind==='gold'?'Gold rates':'Products & stock'}</h3><p className="small muted">Upload a private UTF-8 CSV. Validate first, then review and confirm.</p><div className="download-links"><a href={`/api/admin/samples/${prefix}-template.csv`}><Download size={14}/>Blank template</a><a href={`/api/admin/samples/${prefix}-example.csv`}><Download size={14}/>Fictional example</a><a href={`/api/admin/export/${kind}`} download><Download size={14}/>Export current {kind==='gold'?'rates':'catalogue'} CSV</a></div><label className="upload-zone"><Upload size={22}/><strong>{busy?'Validating…':'Choose a CSV to preview'}</strong><span>Private upload · 5 MB maximum</span><input disabled={busy||readonly} type="file" accept=".csv,text/csv" onChange={upload}/></label>{error&&<p className="error">{error}</p>}{batch&&<div className="import-preview"><Status text={`Batch #${batch.id} · ${batch.status}${batch.duplicate?' · duplicate':''}`}/><p>{batch.summary.created} new · {batch.summary.updated} updates · {batch.summary.rejected} errors</p>{batch.errors?.length>0?<><p className="error">No changes published. Correct the file and upload it again.</p>{batch.errors.slice(0,5).map((e,i)=><p className="small" key={i}>Row {e.row} · {e.field}: {e.value} → {e.correction}</p>)}<a className="underlink" href={`/api/admin/import/${batch.id}/errors`}>Download error report ↓</a></>:<>{<div className="table-wrap"><table><thead><tr><th>SKU</th><th>Old</th><th>New</th><th>Stock</th></tr></thead><tbody>{batch.summary.changes?.map(c=><tr key={c.sku}><td>{c.sku}</td><td>{c.before===null?'New':money(c.before)}</td><td>{c.after===null?'Awaiting rate':money(c.after)}</td><td>{c.stock}</td></tr>)}</tbody></table></div>}{batch.status==='staged'&&<button disabled={busy||readonly} className="button dark full" onClick={publish}>Confirm & publish <Check size={16}/></button>}</>}</div>}</div>}
function ProductAngleManager({product,readonly,refreshParent}){
  const [busyRole,setBusyRole]=useState(null);
  const [error,setError]=useState('');
  const [urlInputs,setUrlInputs]=useState({});
  const [copiedId,setCopiedId]=useState(null);

  const roles=[
    {key:'hero',label:'Hero Image',desc:'Primary display / catalog shot',icon:'🌟'},
    {key:'front',label:'Front Angle',desc:'Straight direct view',icon:'📷'},
    {key:'left',label:'Left View',desc:'Left side profile angle',icon:'👈'},
    {key:'right',label:'Right View',desc:'Right side profile angle',icon:'👉'},
    {key:'model',label:'Model Shot',desc:'On-model wearing view',icon:'💃'}
  ];

  const images=product.images||[];

  async function handleSlotUpload(e,role){
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>8*1024*1024){setError('Image must be under 8 MB');return;}
    setError('');setBusyRole(role);
    try{
      const reader=new FileReader();
      reader.onload=async ev=>{
        try{
          await api('/admin/upload-image',{
            name:`${product.product_code}-${role}-${file.name}`,
            data:ev.target.result,
            role,
            product_code:product.product_code
          });
          if(refreshParent)await refreshParent();
        }catch(err){setError(err.message);}finally{setBusyRole(null);}
      };
      reader.readAsDataURL(file);
    }catch(err){setError(err.message);setBusyRole(null);}finally{e.target.value='';}
  }

  async function handleSetUrl(role){
    const inputUrl=(urlInputs[role]||'').trim();
    if(!inputUrl)return;
    setError('');setBusyRole(role);
    try{
      await api('/admin/product-images',{product_code:product.product_code,role,url:inputUrl});
      setUrlInputs(prev=>({...prev,[role]:''}));
      if(refreshParent)await refreshParent();
    }catch(err){setError(err.message);}finally{setBusyRole(null);}
  }

  async function handleDelete(imgId,role){
    if(readonly)return;
    setError('');setBusyRole(role);
    try{
      await api(`/admin/product-images/${imgId}`,{},'DELETE');
      if(refreshParent)await refreshParent();
    }catch(err){setError(err.message);}finally{setBusyRole(null);}
  }

  function copy(url,id){
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(()=>setCopiedId(null),2000);
  }

  return <div className="product-angles-editor">
    <div className="angles-editor-header">
      <div>
        <h4>Multi-Angle Photography ({product.name})</h4>
        <p className="small muted" style={{margin:'2px 0 0'}}>
          Upload specific angles for <strong>{product.product_code}</strong>. Customers can interactively switch between Hero, Front, Left, Right, and Model shots on the storefront.
        </p>
      </div>
      <span className="status-badge" style={{fontSize:'9px',padding:'4px 10px'}}>
        {images.length}/5 Angles Configured
      </span>
    </div>

    {error&&<p className="error" style={{margin:'10px 0'}}>{error}</p>}

    <div className="angle-slots-grid">
      {roles.map(r=>{
        const img=images.find(i=>i.role===r.key);
        const isBusy=busyRole===r.key;
        return <div key={r.key} className={'angle-slot-card '+(img?'has-image':'')}>
          <div style={{display:'flex',justifyContent:'space-between',width:'100%',alignItems:'center'}}>
            <span className={'role-badge '+r.key}>{r.icon} {r.label}</span>
            {img&&<button
              type="button"
              className="text-button"
              style={{padding:0,color:'#c62828'}}
              title="Remove angle"
              disabled={readonly||isBusy}
              onClick={()=>handleDelete(img.id,r.key)}
            >
              <Trash2 size={12}/>
            </button>}
          </div>

          {img?<img src={img.url} alt={`${product.name} ${r.label}`} className="angle-slot-preview"/>:<div className="angle-slot-placeholder"><span>{r.desc}</span></div>}

          <div className="angle-slot-actions">
            <label className="button dark small-button" style={{padding:'4px 8px',minHeight:'28px',cursor:'pointer',fontSize:'8px',gap:'4px'}}>
              {isBusy?'Saving…':img?'Change':'+ Upload'}
              <input type="file" accept="image/*" style={{display:'none'}} disabled={readonly||isBusy} onChange={e=>handleSlotUpload(e,r.key)}/>
            </label>
            {img&&<button
              type="button"
              className="button secondary small-button"
              style={{padding:'4px 8px',minHeight:'28px',fontSize:'8px',gap:'4px'}}
              onClick={()=>copy(img.url,img.id)}
            >
              {copiedId===img.id?<><Check size={10}/> Copied</>:<><Copy size={10}/> URL</>}
            </button>}
          </div>

          {!img&&<div style={{display:'flex',gap:'4px',width:'100%',marginTop:'4px'}}>
            <input
              type="text"
              placeholder="or paste URL"
              style={{minHeight:'26px',padding:'3px 6px',fontSize:'8px',margin:0}}
              value={urlInputs[r.key]||''}
              disabled={readonly||isBusy}
              onChange={e=>setUrlInputs({...urlInputs,[r.key]:e.target.value})}
            />
            <button
              type="button"
              className="button dark small-button"
              style={{minHeight:'26px',padding:'0 6px',fontSize:'8px'}}
              disabled={readonly||isBusy||!urlInputs[r.key]}
              onClick={()=>handleSetUrl(r.key)}
            >
              Set
            </button>
          </div>}
        </div>;
      })}
    </div>
  </div>;
}

function ImageUploader({products=[],refreshParent}){
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  const [error,setError]=useState('');
  const [uploadedList,setUploadedList]=useState([]);
  const [copiedUrl,setCopiedUrl]=useState(null);
  const [selectedProduct,setSelectedProduct]=useState('');
  const [selectedRole,setSelectedRole]=useState('unassigned');
  const [mediaLibrary,setMediaLibrary]=useState(null);
  const [showMedia,setShowMedia]=useState(false);

  async function handleBulkUpload(e){
    const files=Array.from(e.target.files||[]);
    if(!files.length)return;
    setError('');setBusy(true);
    setProgress({current:0,total:files.length,percent:0});

    const newlyUploaded=[];
    try{
      for(let i=0;i<files.length;i++){
        const file=files[i];
        if(file.size>8*1024*1024)continue;
        const dataUrl=await new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=ev=>resolve(ev.target.result);
          reader.onerror=reject;
          reader.readAsDataURL(file);
        });

        const res=await api('/admin/upload-image',{
          name:file.name,
          data:dataUrl,
          product_code:selectedProduct||undefined,
          role:selectedRole!=='unassigned'?selectedRole:undefined
        });

        newlyUploaded.unshift({
          ...res,
          size:file.size,
          role:selectedRole!=='unassigned'?selectedRole:null,
          product_code:selectedProduct||null
        });

        setProgress({
          current:i+1,
          total:files.length,
          percent:Math.round(((i+1)/files.length)*100)
        });
      }

      setUploadedList(prev=>[...newlyUploaded,...prev]);
      if(refreshParent)await refreshParent();
    }catch(err){
      setError(err.message);
    }finally{
      setBusy(false);
      setProgress(null);
      e.target.value='';
    }
  }

  async function loadMediaLibrary(){
    try{
      const list=await api('/admin/media');
      setMediaLibrary(list);
      setShowMedia(true);
    }catch(err){
      setError(err.message);
    }
  }

  function copy(url){
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(()=>setCopiedUrl(null),2000);
  }

  return <div className="bulk-uploader-card">
    <div className="panel-title">
      <div>
        <h3>Local Bulk Image Uploader & Multi-Angle Asset Manager</h3>
        <p className="small muted" style={{margin:'2px 0 0'}}>
          Select multiple photos from your device to bulk upload. Optionally link them to a product and angle role (Hero, Front, Left, Right, Model) immediately.
        </p>
      </div>
      <button
        type="button"
        className="button secondary small-button"
        onClick={()=>{if(!showMedia&&!mediaLibrary)loadMediaLibrary();else setShowMedia(!showMedia);}}
      >
        <ImageIcon size={14}/> {showMedia?'Hide Media Library':'Browse Media Library'}
      </button>
    </div>

    <div className="bulk-controls">
      <label>
        Target Product (Optional)
        <select value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} disabled={busy}>
          <option value="">General Media Pool (Unassigned)</option>
          {products.map(p=><option key={p.product_code} value={p.product_code}>{p.name} ({p.product_code})</option>)}
        </select>
      </label>
      <label>
        Angle Role (Optional)
        <select value={selectedRole} onChange={e=>setSelectedRole(e.target.value)} disabled={busy}>
          <option value="unassigned">General / Unassigned</option>
          <option value="hero">🌟 Hero Image (Main Display)</option>
          <option value="front">📷 Front Angle</option>
          <option value="left">👈 Left View</option>
          <option value="right">👉 Right View</option>
          <option value="model">💃 Model Wearing Shot</option>
          <option value="detail">🔍 Detail / Close-up</option>
        </select>
      </label>
    </div>

    <label className="bulk-dropzone">
      <Upload size={28} style={{margin:'0 auto 8px',color:'var(--gold)'}}/>
      <strong style={{fontSize:'13px',display:'block'}}>
        {busy?'Bulk Uploading Photos…':'Choose Multiple Photos from Computer'}
      </strong>
      <span style={{fontSize:'10px',color:'var(--muted)',marginTop:'4px',display:'block'}}>
        Select multiple JPG, PNG, or WEBP images · High-resolution bulk processing
      </span>
      <input type="file" multiple accept="image/*" disabled={busy} onChange={handleBulkUpload}/>
    </label>

    {progress&&<div className="bulk-progress">
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',fontWeight:600}}>
        <span>Uploading photo {progress.current} of {progress.total}…</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{width:`${progress.percent}%`}}/>
      </div>
    </div>}

    {error&&<p className="error" style={{marginTop:'12px'}}>{error}</p>}

    {uploadedList.length>0&&<div style={{marginTop:'22px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
        <strong style={{fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>
          Recent Uploads ({uploadedList.length})
        </strong>
        <button className="text-button" style={{fontSize:'10px'}} onClick={()=>setUploadedList([])}>Clear list</button>
      </div>
      <div className="media-gallery-grid">
        {uploadedList.map((item,idx)=><div key={item.filename||idx} className="media-card">
          <img src={item.url} alt={item.filename}/>
          <div className="media-info">
            <span className="media-filename" title={item.filename}>{item.filename}</span>
            <small className="media-url">{item.url}</small>
            <div style={{marginTop:'4px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {item.role&&<span className={'role-badge '+item.role}>{item.role}</span>}
              {item.product_code&&<span className="status-badge" style={{fontSize:'7px'}}>{item.product_code}</span>}
            </div>
          </div>
          <div className="media-actions">
            <button
              type="button"
              className="button dark small-button"
              style={{minHeight:'28px',padding:'0 10px',fontSize:'9px',width:'100%',justifyContent:'center',gap:'6px'}}
              onClick={()=>copy(item.url)}
            >
              {copiedUrl===item.url?<><Check size={12}/> Copied Link</>:<><Copy size={12}/> Copy Link</>}
            </button>
          </div>
        </div>)}
      </div>
    </div>}

    {showMedia&&mediaLibrary&&<div style={{marginTop:'25px',paddingTop:'20px',borderTop:'1px solid var(--line)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <strong style={{fontSize:'13px'}}>Uploaded Media Library ({mediaLibrary.length} files)</strong>
        <button className="text-button" style={{fontSize:'10px'}} onClick={loadMediaLibrary}>
          <RefreshCw size={12}/> Refresh Library
        </button>
      </div>
      <div className="media-gallery-grid">
        {mediaLibrary.map(item=><div key={item.filename} className="media-card">
          <img src={item.url} alt={item.filename} loading="lazy"/>
          <div className="media-info">
            <span className="media-filename" title={item.filename}>{item.filename}</span>
            <small className="media-url">{(item.size/1024).toFixed(1)} KB</small>
          </div>
          <div className="media-actions">
            <button
              type="button"
              className="button dark small-button"
              style={{minHeight:'28px',padding:'0 10px',fontSize:'9px',width:'100%',justifyContent:'center',gap:'6px'}}
              onClick={()=>copy(item.url)}
            >
              {copiedUrl===item.url?<><Check size={12}/> Copied Link</>:<><Copy size={12}/> Copy Link</>}
            </button>
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}

function ProductRow({p,readonly,refresh}){
  const [editing,setEditing]=useState(false),[error,setError]=useState('');
  async function save(e){
    e.preventDefault();
    try{
      await api('/admin/products/'+p.sku,Object.fromEntries(new FormData(e.target)),'PATCH');
      setEditing(false);
      await refresh();
    }catch(e){
      setError(e.message);
    }
  }
  return <>
    <tr>
      <td>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          {p.image?<img src={p.image} alt={p.name} style={{width:'36px',height:'36px',objectFit:'cover',borderRadius:'3px',flexShrink:0}}/>:<div style={{width:'36px',height:'36px',background:'var(--paper)',display:'grid',placeItems:'center',borderRadius:'3px',flexShrink:0}}><ImageIcon size={16}/></div>}
          <div>
            <strong>{p.name}</strong>
            <small>{p.sku} · {p.product_code}</small>
          </div>
        </div>
      </td>
      <td>
        {p.pricing_mode==='GOLD_LINKED'?<span className="coin-badge gold">GOLD_LINKED</span>:<span className="status-badge">FIXED</span>}
        <small>{p.pricing_mode==='FIXED'?money(p.fixed_price):`${p.purity} · Live Rate`}</small>
      </td>
      <td>{p.net_weight_g} g</td>
      <td>{p.stock}</td>
      <td><Status text={p.status}/></td>
      <td><button className="underlink" disabled={readonly} onClick={()=>setEditing(!editing)}>{editing?'Close':'Edit'}</button></td>
    </tr>
    {editing&&<tr>
      <td colSpan="6">
        <div style={{background:'var(--ivory)',border:'1px solid var(--line)',padding:'20px',borderRadius:'4px',margin:'10px 0'}}>
          <form className="product-edit" onSubmit={save}>
            <label>Name<input name="name" defaultValue={p.name}/></label>
            <label>Status<select name="status" defaultValue={p.status}><option>published</option><option>draft</option></select></label>
            <label className="span-two">Primary Image URL (Hero)<input name="image" defaultValue={p.image}/></label>
            <label className="span-two">Description<textarea name="description" defaultValue={p.description}/></label>
            {error&&<p className="error span-two">{error}</p>}
            <div className="span-two" style={{display:'flex',gap:'10px',marginTop:'8px'}}>
              <button className="button dark small-button" type="submit">Save merchant edits</button>
              <button className="text-button" type="button" onClick={()=>setEditing(false)}>Cancel</button>
            </div>
          </form>

          {/* Multi-Angle Visual Manager */}
          <ProductAngleManager product={p} readonly={readonly} refreshParent={refresh}/>
        </div>
      </td>
    </tr>}
  </>;
}
function SettingsAdmin({data,refresh,readonly}){
  const [error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
  const [silverInput,setSilverInput]=useState('');
  const [silverSaved,setSilverSaved]=useState(false);

  const feedSettings=data?.feedSettings||{};
  const isStopped=feedSettings.feedStatus==='stopped';
  const isGoldOn=feedSettings.goldFeedEnabled!==false;
  const isProductOn=feedSettings.productFeedEnabled!==false;

  async function toggleMaster(newStatus){
    setBusy(true);setError('');setSaved(false);
    try{
      await api('/admin/feed-toggle',{status:newStatus});
      await refresh();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function toggleChannel(kind,currentVal){
    setBusy(true);setError('');setSaved(false);
    try{
      await api('/admin/feed-toggle',{kind,enabled:!currentVal});
      await refresh();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function saveSettings(e){
    e.preventDefault();
    setBusy(true);setError('');setSaved(false);
    try{
      const formData=Object.fromEntries(new FormData(e.target));
      await api('/admin/feed-settings',formData);
      setSaved(true);
      await refresh();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function saveSilver(e){
    e.preventDefault();
    setError('');setSilverSaved(false);
    try{
      await api('/admin/coins/silver-rate',{rate:Number(silverInput)});
      setSilverSaved(true);
      await refresh();
    }catch(e){setError(e.message)}
  }

  return <div className="settings-admin">
    {/* Master Start / Stop Feed Toggle Banner */}
    <div className={'feed-status-card '+(isStopped?'stopped':'active')}>
      <div className="feed-toggle-header">
        <div>
          <span className="eyebrow" style={{letterSpacing:'1.5px',marginBottom:'6px',display:'block',color:isStopped?'#c62828':'#2e7d32'}}>
            FEED AUTOMATION ENGINE
          </span>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
            <h2 style={{margin:0,fontSize:'28px',color:isStopped?'#c62828':'#1b5e20'}}>
              {isStopped?'Feeds Are Currently Stopped':'Feeds Are Active & Running'}
            </h2>
            <span className={'status-badge '+(isStopped?'warning':'')} style={{fontSize:'10px',fontWeight:700,padding:'5px 12px',borderRadius:'20px'}}>
              {isStopped?'🔴 STOPPED':'🟢 RUNNING'}
            </span>
          </div>
          <p style={{margin:'8px 0 0',fontSize:'12px',color:'var(--muted)',maxWidth:'540px',lineHeight:'1.6'}}>
            {isStopped
              ? 'Automatic scheduled daily cron runs and live rate fetches are halted. No external supplier requests or market rate updates will be made until started.'
              : 'Daily scheduled imports and live gold spot rate synchronization are active. Scheduled runs take place at 09:00 IST.'}
          </p>
        </div>
        <div>
          <button
            type="button"
            disabled={busy||readonly}
            className={'feed-toggle-switch '+(isStopped?'start':'stop')}
            onClick={()=>toggleMaster(isStopped?'active':'stopped')}
            style={{padding:'12px 24px',fontSize:'13px',gap:'10px'}}
          >
            {isStopped?<><Play size={18}/> Start Feed Automation</>:<><Pause size={18}/> Stop Feed Automation</>}
          </button>
        </div>
      </div>
    </div>

    {error&&<div className="error" role="alert">{error}</div>}
    {saved&&<div className="notice" style={{background:'#e8f5e9',borderColor:'#a5d6a7',color:'#1b5e20'}}>Settings updated and audited successfully.</div>}

    {/* Individual Feed Channel Controls */}
    <div className="feed-channel-grid">
      <div className="feed-channel-card">
        <div className="feed-channel-card-header">
          <div>
            <h4>Live Gold Bullion Feed</h4>
            <small style={{color:'var(--muted)'}}>XAU/INR Live Market Rates</small>
          </div>
          <button
            type="button"
            disabled={busy||readonly}
            className={'channel-toggle-btn '+(isGoldOn?'on':'off')}
            onClick={()=>toggleChannel('gold',isGoldOn)}
          >
            {isGoldOn?'● Enabled':'○ Disabled'}
          </button>
        </div>
        <p style={{fontSize:'11px',color:'var(--muted)',margin:'0 0 12px'}}>
          Pulls live 24K, 22K, 18K, 14K rates from configured gold API or supplier feed.
        </p>
        <div style={{fontSize:'10px',background:'var(--paper)',padding:'8px 12px',borderRadius:'4px',wordBreak:'break-all'}}>
          <strong>Source: </strong>{feedSettings.goldConfigured?'https://api.gold-api.com/price/XAU/INR (Configured)':'Not configured'}
        </div>
      </div>

      <div className="feed-channel-card">
        <div className="feed-channel-card-header">
          <div>
            <h4>Product Catalogue & Inventory Feed</h4>
            <small style={{color:'var(--muted)'}}>Jewellery Stock & Variant Sync</small>
          </div>
          <button
            type="button"
            disabled={busy||readonly}
            className={'channel-toggle-btn '+(isProductOn?'on':'off')}
            onClick={()=>toggleChannel('products',isProductOn)}
          >
            {isProductOn?'● Enabled':'○ Disabled'}
          </button>
        </div>
        <p style={{fontSize:'11px',color:'var(--muted)',margin:'0 0 12px'}}>
          Synchronizes jewellery pieces, making charges, and absolute inventory stock counts.
        </p>
        <div style={{fontSize:'10px',background:'var(--paper)',padding:'8px 12px',borderRadius:'4px',wordBreak:'break-all'}}>
          <strong>Source: </strong>{feedSettings.productsConfigured?'Supplier HTTPS Feed Configured':'Not configured'}
        </div>
      </div>
    </div>

    {/* Detailed Feed Configuration Form */}
    <div className="admin-panel">
      <h3>Supplier & Inventory Sync Configuration</h3>
      <p className="small muted">
        Configure rate freshness windows, supplier endpoints, and inventory overwrite permissions. Owner edits are recorded in staff audit logs.
      </p>
      <form onSubmit={saveSettings}>
        <div className="form-grid">
          <label>
            Maximum gold-rate age (hours)
            <input name="maxAgeHours" type="number" min="1" max="168" defaultValue={data.maxAgeHours||48} disabled={readonly}/>
            <small className="muted" style={{display:'block',marginTop:'4px'}}>Rates older than this will pause gold-linked checkout.</small>
          </label>
          <label>
            Inventory sync mode
            <select name="inventoryMode" defaultValue={feedSettings.inventoryMode||'incremental'} disabled={readonly}>
              <option value="incremental">Incremental — omitted SKUs remain unchanged</option>
              <option value="full">Full — omitted supplier SKUs set to out of stock</option>
            </select>
          </label>
          <label>
            Gold CSV Feed URL
            <input name="goldUrl" type="text" placeholder="https://api.gold-api.com/price/XAU/INR or supplier URL" defaultValue={feedSettings.goldUrl||''} disabled={readonly}/>
          </label>
          <label>
            Product CSV Feed URL
            <input name="productUrl" type="url" placeholder="https://supplier.example/products.csv" defaultValue={feedSettings.productUrl||''} disabled={readonly}/>
          </label>
          <label className="span-two">
            Supplier fields allowed to overwrite merchant edits
            <input name="overwriteFields" defaultValue={feedSettings.overwriteFields||'stock,fixed_price,net_weight_g,making_flat,stone_charge,other_charge'} disabled={readonly}/>
          </label>
        </div>
        <button style={{marginTop:20}} className="button dark" disabled={busy||readonly}>
          Save Feed Settings <Check size={16}/>
        </button>
      </form>
    </div>

    {/* Silver Bullion Benchmark */}
    <div className="admin-panel">
      <h3>999 Fine Silver Benchmark Rate</h3>
      <p className="small muted">Base spot rate per gram used to calculate prices for 999 fine silver coins and bullion bars.</p>
      <form onSubmit={saveSilver} style={{display:'flex',gap:'12px',alignItems:'flex-end',maxWidth:'450px',marginTop:'14px'}}>
        <label style={{flex:1}}>
          Silver rate (₹ / gram)
          <input type="number" step="0.1" min="1" placeholder="e.g. 98.0" defaultValue={silverInput||98} onChange={e=>setSilverInput(e.target.value)} disabled={readonly}/>
        </label>
        <button className="button dark small-button" style={{height:'43px',marginBottom:'0'}} disabled={readonly}>
          Update Silver Rate <Check size={14}/>
        </button>
      </form>
      {silverSaved&&<p style={{color:'#2e7d32',fontSize:'11px',marginTop:'8px'}}>Silver benchmark rate updated.</p>}
    </div>
  </div>;
}
const FeedSettings=SettingsAdmin;
function Rules({rule,readonly,refresh}){const [value,setValue]=useState({...rule}),[changes,setChanges]=useState(null),[error,setError]=useState('');const set=(k,v)=>{setValue(s=>({...s,[k]:v}));setChanges(null)};async function preview(e){e.preventDefault();try{setChanges(await api('/admin/rules/preview',{...value,current:rule}));setError('')}catch(e){setError(e.message)}}async function publish(){try{await api('/admin/rules',value);await refresh();setChanges(null);setError('')}catch(e){setError(e.message)}}return <div className="admin-panel rules"><h3>Gold-linked pricing</h3><p className="formula">Metal weight × purity-specific rate + making + stones + other charges</p><p>Percentage making charges use metal value as their basis. Fixed prices are final merchant selling prices and stay unchanged. No purity conversion is enabled.</p><form onSubmit={preview}><div className="form-grid"><label>Tax percentage<input type="number" step="0.01" min="0" max="100" value={value.tax_percent} onChange={e=>set('tax_percent',e.target.value)} disabled={readonly}/></label><label>Tax treatment<select value={value.tax_treatment} onChange={e=>set('tax_treatment',e.target.value)} disabled={readonly}><option value="exclusive">Add tax to subtotal</option><option value="inclusive">Subtotal includes tax</option></select></label><label>Round final price to<select value={value.rounding} onChange={e=>set('rounding',e.target.value)} disabled={readonly}><option value="0.01">₹0.01</option><option value="1">₹1</option><option value="10">₹10</option><option value="100">₹100</option></select></label></div><p className="small">Synthetic check: 5.000 g × ₹6,000/g + ₹2,000 flat making = ₹32,000 before other charges or tax.</p>{error&&<p className="error">{error}</p>}<button className="button dark" disabled={readonly}>Preview price changes <Eye size={16}/></button></form>{changes&&<><table><thead><tr><th>SKU</th><th>Old price</th><th>New price</th></tr></thead><tbody>{changes.map(c=><tr key={c.sku}><td>{c.sku}</td><td>{money(c.before)}</td><td>{money(c.after)}</td></tr>)}</tbody></table><button className="button dark" disabled={readonly} onClick={publish}>Confirm pricing rule <Check size={16}/></button></>}</div>}
function CoinsAdmin({readonly,refreshParent}){
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[subTab,setSubTab]=useState('all');
  const [editingCoin,setEditingCoin]=useState(null),[addingCoin,setAddingCoin]=useState(false);
  const [silverInput,setSilverInput]=useState(''),[editingSilver,setEditingSilver]=useState(false);
  const [uploading,setUploading]=useState(false);

  async function load(){
    setBusy(true);setError('');
    try{
      const res=await api('/admin/coins');
      setData(res);
      setSilverInput(String(res.silverRate||98));
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  useEffect(()=>{load();},[]);

  async function updateSilver(e){
    e.preventDefault();
    try{
      await api('/admin/coins/silver-rate',{rate:Number(silverInput)});
      setEditingSilver(false);
      await load();
      if(refreshParent)await refreshParent();
    }catch(e){setError(e.message)}
  }

  async function saveCoin(e){
    e.preventDefault();
    const form=new FormData(e.target);
    const body=Object.fromEntries(form);
    setError('');
    try{
      if(editingCoin){
        await api('/admin/coins/'+editingCoin.sku,body,'PATCH');
      }else{
        await api('/admin/coins',body,'POST');
      }
      setEditingCoin(null);
      setAddingCoin(false);
      await load();
      if(refreshParent)await refreshParent();
    }catch(e){setError(e.message)}
  }

  async function deleteCoin(sku){
    if(!window.confirm(`Are you sure you want to delete coin SKU ${sku}?`))return;
    try{
      await api('/admin/coins/'+sku,{},'DELETE');
      await load();
      if(refreshParent)await refreshParent();
    }catch(e){setError(e.message)}
  }

  async function handleImageUpload(e,setter){
    const file=e.target.files?.[0];
    if(!file)return;
    setUploading(true);
    try{
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        try{
          const res=await api('/admin/upload-image',{name:file.name,data:ev.target.result});
          setter(res.url);
        }catch(err){setError(err.message)}finally{setUploading(false)}
      };
      reader.readAsDataURL(file);
    }catch(err){setError(err.message);setUploading(false)}
  }

  const coins=data?.coins||[];
  const filteredCoins=coins.filter(c=>{
    if(subTab==='all')return true;
    if(subTab==='gold')return (c.metal||'').toLowerCase()==='gold'||(c.coin_type||'').toLowerCase().includes('gold');
    if(subTab==='silver')return (c.metal||'').toLowerCase()==='silver'||(c.coin_type||'').toLowerCase().includes('silver');
    return true;
  });

  const goldCount=coins.filter(c=>(c.metal||'').toLowerCase()==='gold').length;
  const silverCount=coins.filter(c=>(c.metal||'').toLowerCase()==='silver').length;

  return <div className="coins-admin">
    <div className="notice">
      Coins are stored in a dedicated database table (separate from standard jewellery). Prices are metal-linked and update dynamically based on live market rates for Gold (24K) and Silver (999).
    </div>

    {/* Bullion Live Rate Bar */}
    <div className="coins-market-bar">
      <div className="coins-market-rates">
        <span className="coin-rate-tag gold">
          <CoinsIcon size={16}/> Live 24K Gold: <strong>{data?.goldRate24k?money(data.goldRate24k)+'/g':'Rate pending'}</strong>
        </span>
        <span className="coin-rate-tag silver">
          <CircleDollarSign size={16}/> 999 Fine Silver: <strong>₹{data?.silverRate||98}/g</strong>
          {!editingSilver&&!readonly&&<button className="underlink" style={{fontSize:'10px',marginLeft:'8px'}} onClick={()=>setEditingSilver(true)}>Edit Rate</button>}
        </span>
      </div>
      {editingSilver&&<form onSubmit={updateSilver} style={{display:'inline-flex',gap:'8px',alignItems:'center'}}>
        <label style={{margin:0,fontSize:'11px'}}>New Silver ₹/g: <input type="number" step="0.1" style={{width:'80px',minHeight:'32px',padding:'4px 8px'}} value={silverInput} onChange={e=>setSilverInput(e.target.value)} required/></label>
        <button className="button dark small-button" type="submit">Save</button>
        <button className="text-button" type="button" onClick={()=>setEditingSilver(false)}>Cancel</button>
      </form>}
    </div>

    {/* Submenu Tabs & Actions */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'18px'}}>
      <div className="coins-subtabs" style={{margin:0,border:0,padding:0}}>
        <button className={'coins-subtab-btn '+(subTab==='all'?'active':'')} onClick={()=>setSubTab('all')}>All Coins ({coins.length})</button>
        <button className={'coins-subtab-btn '+(subTab==='gold'?'active':'')} onClick={()=>setSubTab('gold')}>Gold Coins ({goldCount})</button>
        <button className={'coins-subtab-btn '+(subTab==='silver'?'active':'')} onClick={()=>setSubTab('silver')}>Silver Coins ({silverCount})</button>
      </div>
      <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
        <button className="button dark small-button" disabled={readonly} onClick={()=>setAddingCoin(true)}>+ Add Coin</button>
        <a className="underlink" href="/api/admin/export/coins" download style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><Download size={14}/>Export Coins CSV</a>
      </div>
    </div>

    {error&&<p className="error">{error}</p>}

    {/* Table */}
    <div className="admin-panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Coin / SKU</th>
              <th>Metal / Purity</th>
              <th>Weight & Dimensions</th>
              <th>Making Charge</th>
              <th>Live Calculated Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoins.map(c=><tr key={c.sku}>
              <td>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  {c.image?<img src={c.image} alt={c.name} style={{width:'40px',height:'40px',objectFit:'cover',borderRadius:'4px'}}/>:<div style={{width:'40px',height:'40px',background:'var(--paper)',display:'grid',placeItems:'center',borderRadius:'4px'}}><CoinsIcon size={18}/></div>}
                  <div>
                    <strong>{c.name}</strong>
                    <small>{c.sku}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className={'coin-badge '+(c.metal==='Silver'?'silver':'gold')}>{c.metal}</span>
                <small>{c.purity} · {c.coin_type}</small>
              </td>
              <td>
                <strong>{Number(c.weight_g).toFixed(3)} g</strong>
                <small>{c.dimension||'Standard round'}</small>
              </td>
              <td>{money(c.making_charge)}</td>
              <td>
                <strong>{c.calculated_price!==null?money(c.calculated_price):'Awaiting rate'}</strong>
                {c.breakdown&&<small>Metal {money(c.breakdown.metal)} + Making {money(c.breakdown.making)}</small>}
              </td>
              <td><strong>{c.stock}</strong></td>
              <td><Status text={c.status}/></td>
              <td>
                <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                  <button className="underlink" disabled={readonly} onClick={()=>setEditingCoin(c)}>Edit</button>
                  <button className="text-button" disabled={readonly} style={{color:'#a83232',padding:0}} onClick={()=>deleteCoin(c.sku)} title="Delete coin"><Trash2 size={14}/></button>
                </div>
              </td>
            </tr>)}
            {!filteredCoins.length&&<tr><td colSpan="8" style={{textAlign:'center',padding:'30px',color:'var(--muted)'}}>No coins found in this category.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    {/* Modal for Add / Edit Coin */}
    {(addingCoin||editingCoin)&&<CoinFormModal
      coin={editingCoin}
      onClose={()=>{setAddingCoin(false);setEditingCoin(null);}}
      onSave={saveCoin}
      handleImageUpload={handleImageUpload}
      uploading={uploading}
    />}
  </div>;
}

function CoinFormModal({coin,onClose,onSave,handleImageUpload,uploading}){
  const [imageUrl,setImageUrl]=useState(coin?.image||'');
  const [metal,setMetal]=useState(coin?.metal||'Gold');
  const [pricingMode,setPricingMode]=useState(coin?.pricing_mode||'METAL_LINKED');
  return <Modal title={coin?`Edit ${coin.sku}`:'Add New Coin'} onClose={onClose}>
    <form onSubmit={onSave} className="coin-form">
      <div className="form-grid">
        <label>SKU (Unique identifier)*
          <input name="sku" defaultValue={coin?.sku||''} placeholder="e.g. COIN-AU-2G" required disabled={!!coin}/>
        </label>
        <label>Coin Name*
          <input name="name" defaultValue={coin?.name||''} placeholder="e.g. 24K Lakshmi 999 Pure Gold Coin" required/>
        </label>
        <label>Metal*
          <select name="metal" value={metal} onChange={e=>setMetal(e.target.value)}>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
          </select>
        </label>
        <label>Coin Category / Type
          <input name="coin_type" defaultValue={coin?.coin_type||(metal==='Silver'?'Silver Coin':'Gold Coin')} placeholder="Gold Coin / Silver Coin / Bar"/>
        </label>
        <label>Purity*
          <input name="purity" defaultValue={coin?.purity||(metal==='Silver'?'999':'24K')} placeholder="24K, 22K, 999, 925" required/>
        </label>
        <label>Weight (in grams)*
          <input name="weight_g" type="number" step="0.001" min="0.001" defaultValue={coin?.weight_g||''} placeholder="e.g. 5.000" required/>
        </label>
        <label>Dimensions / Shape
          <input name="dimension" defaultValue={coin?.dimension||''} placeholder="e.g. 20 mm Round"/>
        </label>
        <label>Making Charge (₹ flat)
          <input name="making_charge" type="number" step="0.01" min="0" defaultValue={coin?.making_charge||0}/>
        </label>
        <label>Pricing Mode
          <select name="pricing_mode" value={pricingMode} onChange={e=>setPricingMode(e.target.value)}>
            <option value="METAL_LINKED">METAL_LINKED (Live market rate)</option>
            <option value="FIXED">FIXED (Static price)</option>
          </select>
        </label>
        {pricingMode==='FIXED'&&<label>Fixed Selling Price (₹)
          <input name="fixed_price" type="number" step="0.01" min="1" defaultValue={coin?.fixed_price||''} required/>
        </label>}
        <label>Stock snapshot*
          <input name="stock" type="number" min="0" defaultValue={coin?.stock??10} required/>
        </label>
        <label>Publication Status
          <select name="status" defaultValue={coin?.status||'published'}>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
        </label>
        <label className="span-two">Image URL
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input name="image" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://... or upload below"/>
            <label className="button secondary small-button" style={{margin:0,whiteSpace:'nowrap',cursor:'pointer'}}>
              {uploading?'Uploading…':'Upload Photo'}
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleImageUpload(e,setImageUrl)}/>
            </label>
          </div>
        </label>
        <label className="span-two">Description
          <textarea name="description" defaultValue={coin?.description||''} placeholder="Describe the coin design, hallmark, tamper-proof packaging, etc." rows="3"/>
        </label>
      </div>
      <div style={{display:'flex',gap:'12px',justifyContent:'flex-end',marginTop:'24px'}}>
        <button type="button" className="text-button" onClick={onClose}>Cancel</button>
        <button type="submit" className="button dark">{coin?'Save Changes':'Create Coin'} <Check size={16}/></button>
      </div>
    </form>
  </Modal>;
}

function CoinsPage(){
  const [coins,setCoins]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selectedCoin,setSelectedCoin]=useState(null);
  const {category='all'}=useParams();
  const [params,setParams]=useSearchParams();
  const {add}=useStore();

  useEffect(()=>{
    document.title='Gold & Silver Coins | Veyora Jewels';
    api('/coins').then(setCoins).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  const update=(k,v)=>{const next=new URLSearchParams(params);v?next.set(k,v):next.delete(k);setParams(next,{replace:true});};

  const selectedCategory=category.toLowerCase();
  let items=coins.filter(c=>{
    if(selectedCategory==='gold')return (c.metal||'').toLowerCase()==='gold'||(c.coin_type||'').toLowerCase().includes('gold');
    if(selectedCategory==='silver')return (c.metal||'').toLowerCase()==='silver'||(c.coin_type||'').toLowerCase().includes('silver');
    return true;
  }).filter(c=>matchPrice(c.price,params.get('price')));

  if(params.get('sort')==='price-asc')items.sort((a,b)=>(a.price||0)-(b.price||0));
  if(params.get('sort')==='price-desc')items.sort((a,b)=>(b.price||0)-(a.price||0));

  return <Layout>
    <div className="collection-intro">
      <span className="eyebrow">PURE BULLION & HEIRLOOMS</span>
      <h1>Gold & Silver Coins</h1>
      <p>Certified 24K 999 pure gold and 999 fine silver minted coins. Encased in tamper-evident assay certification packs for auspicious celebrations, gifting, and generational wealth.</p>
      
      <div className="collection-tabs">
        <Link className={selectedCategory==='all'?'active':''} to="/coins">All Coins ({coins.length})</Link>
        <Link className={selectedCategory==='gold'?'active':''} to="/coins/gold">Gold Coins</Link>
        <Link className={selectedCategory==='silver'?'active':''} to="/coins/silver">Silver Coins</Link>
      </div>

      <div className="price-bracket-bar" role="group" aria-label="Filter by price bracket">
        <span className="price-bracket-title">Price:</span>
        {priceBrackets.map(b=><button key={b.value} type="button" className={'price-bracket-pill '+((params.get('price')||'')===b.value?'active':'')} onClick={()=>update('price',b.value)} aria-pressed={(params.get('price')||'')===b.value}>{b.label}</button>)}
      </div>
    </div>

    <section className="section catalogue">
      {/* Purity Guarantee Trust Banner */}
      <div className="coin-trust-banner">
        <div className="coin-trust-item">
          <ShieldCheck size={24}/>
          <div>
            <strong>100% Certified Purity</strong>
            <p className="muted" style={{margin:0,fontSize:'10px'}}>24K 999 Pure Gold & 999 Fine Silver</p>
          </div>
        </div>
        <div className="coin-trust-item">
          <Package size={24}/>
          <div>
            <strong>Assay Certified Packing</strong>
            <p className="muted" style={{margin:0,fontSize:'10px'}}>Individual tamper-proof security blister pack</p>
          </div>
        </div>
        <div className="coin-trust-item">
          <ChartNoAxesCombined size={24}/>
          <div>
            <strong>Live Market Pricing</strong>
            <p className="muted" style={{margin:0,fontSize:'10px'}}>Transparent bullion pricing linked to daily rates</p>
          </div>
        </div>
      </div>

      <div className="filter-toolbar">
        <span>{items.length} minted coins</span>
        <label>Sort by <select aria-label="Sort coins" value={params.get('sort')||'featured'} onChange={e=>update('sort',e.target.value)}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select></label>
      </div>

      {loading?<p className="empty">Loading minted coins…</p>:error?<p className="error">{error}</p>:items.length?<div className="product-grid">
        {items.map(c=><article className="product-card" key={c.sku}>
          <div className="product-photo" onClick={()=>setSelectedCoin(c)} style={{cursor:'pointer'}}>
            {c.image?<img loading="lazy" src={c.image} alt={c.name}/>:<div style={{height:'100%',display:'grid',placeItems:'center',background:'var(--paper)'}}><CoinsIcon size={48} color="var(--gold)"/></div>}
            <span className={'product-label '+(c.metal==='Silver'?'':'gold')}>{c.metal==='Silver'?'999 FINE SILVER':'24K 999 PURE GOLD'}</span>
          </div>
          <div className="product-info">
            <h3 onClick={()=>setSelectedCoin(c)} style={{cursor:'pointer'}}>{c.name}</h3>
            <span>{c.weight_g}g · {c.purity} {c.metal} {c.dimension?`· ${c.dimension}`:''}</span>
            <p>{c.price!==null?money(c.price):'Price awaiting rate'}</p>
            {c.breakdown&&<span className="price-suffix" style={{display:'block',marginTop:'3px'}}>Metal {money(c.breakdown.metal)} + Making {money(c.breakdown.making)}</span>}
            <div style={{marginTop:'12px',display:'flex',gap:'8px'}}>
              <button
                className="button dark full"
                style={{minHeight:'40px',fontSize:'10px',padding:'0 16px'}}
                disabled={!c.checkout_available}
                onClick={()=>add({sku:c.sku,name:c.name,image:c.image,price:c.price,stock:c.stock,size:`${c.weight_g}g (${c.purity})`,slug:'coins'})}
              >
                {c.stock===0?'Out of stock':!c.checkout_available?'Awaiting live rate':'Add to bag'}<ShoppingBag size={14}/>
              </button>
            </div>
          </div>
        </article>)}
      </div>:<div className="empty">
        <CoinsIcon size={36}/>
        <h2>No coins found</h2>
        <p>Try clearing filters or view all coins.</p>
        <Link className="button dark" to="/coins">View all coins</Link>
      </div>}
    </section>

    {selectedCoin&&<Modal title={selectedCoin.name} onClose={()=>setSelectedCoin(null)}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
        <div>
          {selectedCoin.image?<img src={selectedCoin.image} alt={selectedCoin.name} style={{width:'100%',borderRadius:'4px'}}/>:<div style={{height:'220px',background:'var(--paper)',display:'grid',placeItems:'center'}}><CoinsIcon size={64}/></div>}
        </div>
        <div>
          <span className={'coin-badge '+(selectedCoin.metal==='Silver'?'silver':'gold')}>{selectedCoin.metal} · {selectedCoin.purity}</span>
          <h3 style={{marginTop:'8px',marginBottom:'12px'}}>{selectedCoin.name}</h3>
          <div style={{fontSize:'22px',fontWeight:600,marginBottom:'12px'}}>{selectedCoin.price!==null?money(selectedCoin.price):'Awaiting rate'}</div>
          <p className="small muted">{selectedCoin.description}</p>
          <dl className="specs" style={{marginTop:'15px'}}>
            <div><dt>Weight</dt><dd>{selectedCoin.weight_g} Grams</dd></div>
            <div><dt>Purity</dt><dd>{selectedCoin.purity} ({selectedCoin.metal==='Gold'?'99.9% Pure':'99.9% Fine'})</dd></div>
            {selectedCoin.dimension&&<div><dt>Dimensions</dt><dd>{selectedCoin.dimension}</dd></div>}
            <div><dt>SKU</dt><dd>{selectedCoin.sku}</dd></div>
            <div><dt>Stock</dt><dd>{selectedCoin.stock>0?`${selectedCoin.stock} ready to dispatch`:'Out of stock'}</dd></div>
          </dl>
          {selectedCoin.breakdown&&<div style={{background:'var(--paper)',padding:'12px',borderRadius:'4px',margin:'15px 0',fontSize:'11px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}><span>Metal bullion value</span><strong>{money(selectedCoin.breakdown.metal)}</strong></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}><span>Minting & packaging</span><strong>{money(selectedCoin.breakdown.making)}</strong></div>
            {selectedCoin.breakdown.tax>0&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}><span>Applicable tax</span><strong>{money(selectedCoin.breakdown.tax)}</strong></div>}
            <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--line)',paddingTop:'6px',marginTop:'6px'}}><span>Total</span><strong>{money(selectedCoin.price)}</strong></div>
          </div>}
          <button
            className="button dark full"
            disabled={!selectedCoin.checkout_available}
            onClick={()=>{
              add({sku:selectedCoin.sku,name:selectedCoin.name,image:selectedCoin.image,price:selectedCoin.price,stock:selectedCoin.stock,size:`${selectedCoin.weight_g}g (${selectedCoin.purity})`,slug:'coins'});
              setSelectedCoin(null);
            }}
          >
            {selectedCoin.checkout_available?'Add to bag':'Currently unavailable'}<ShoppingBag size={16}/>
          </button>
        </div>
      </div>
    </Modal>}
  </Layout>;
}

function NotFound(){return <Layout><section className="empty"><span className="eyebrow">A SMALL DETOUR</span><h1>This page is yet to be discovered.</h1><Link className="button dark" to="/">Return to the maison</Link></section></Layout>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Provider><Scroll/><Routes><Route path="/" element={<Home/>}/><Route path="/collections/:category" element={<Collection/>}/><Route path="/products/:slug" element={<Product/>}/><Route path="/coins" element={<CoinsPage/>}/> <Route path="/coins/:category" element={<CoinsPage/>}/><Route path="/account" element={<Account Layout={Layout} BagLines={BagLines} ProductCard={ProductCard} grouped={grouped}/>}/><Route path="/bag" element={<Bag/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/order/:id" element={<Order/>}/><Route path="/information/:page" element={<Information/>}/><Route path="/admin/*" element={<Admin/>}/><Route path="*" element={<NotFound/>}/></Routes></Provider></BrowserRouter>);
