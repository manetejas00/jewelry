import React,{useEffect,useState,useRef,createContext,useContext,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Link,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {Search,ShoppingBag,UserRound,Menu,X,ArrowRight,ArrowUpRight,Plus,Minus,Heart,ChevronDown,Check,ArrowLeft,ShieldCheck,Package,Truck,SlidersHorizontal,LogOut,LayoutDashboard,Gem,ChartNoAxesCombined,Upload,Settings,Download,RefreshCw,AlertCircle,CheckCircle2,Eye,Mail,MoveRight,Coins as CoinsIcon,CircleDollarSign,Trash2,Sparkles,Play,Pause,Power,Image as ImageIcon,Copy,Layers,Tag,Percent,Maximize2,Star,RotateCcw} from 'lucide-react';
import gsap from 'gsap';
import './style.css';
import PhotoPicker from './PhotoPicker.jsx';
import Pagination, {usePagination} from './Pagination.jsx';
import ImageViewer from './ImageViewer.jsx';
import HeroBanner from './HeroBanner.jsx';
import {ProductReviewsSection,RatingBadge,StarRating} from './Reviews.jsx';
import {ReviewsAdmin} from './ReviewsAdmin.jsx';
import AiCopy from './AiCopy.jsx';
import ProductMagicZoom from './ProductMagicZoom.jsx';
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2,minimumFractionDigits:0}).format(v||0);
const date=v=>v?new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'—';
const media=name=>'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/'+encodeURIComponent(name)+'.png';
import {api} from './api.js';
import {Provider,useStore} from './store.jsx';
import Account from './Account.jsx';
import {grouped} from './catalogue.js';
import {coinImage} from './media.js';
import ListingImage from './ListingImage.jsx';
import {galleryPhotos} from './image-zoom.js';
import {listingThumbnail,imageFallback} from './listing-media.js';
import {SearchAutocomplete} from './SearchAutocomplete.jsx';
import InstallApp from './InstallApp.jsx';
import StaffAccess from './StaffAccess.jsx';
const priceBrackets=[{label:'All prices',value:''},{label:'Under ₹20,000',value:'0-20000'},{label:'₹20,000 – ₹30,000',value:'20000-30000'},{label:'₹30,000 – ₹50,000',value:'30000-50000'},{label:'Above ₹50,000',value:'50000-'}];
const matchPrice=(price,bracket)=>{if(!bracket)return true;if(price===null||price===undefined)return false;if(bracket.includes('-')){const [minStr,maxStr]=bracket.split('-');if(minStr&&price<Number(minStr))return false;if(maxStr&&price>Number(maxStr))return false;return true;}return price<=Number(bracket);};
function Scroll(){const loc=useLocation();useEffect(()=>{if(!loc.pathname.startsWith('/collections'))window.scrollTo(0,0);},[loc.pathname]);return null}
function Brand(){return <Link className="brand" to="/" aria-label="Veyora Jewels home"><span className="brand-emblem">✳</span><span>VEYORA<small>J E W E L S</small></span></Link>}
function Header(){
  const {bag,setBagOpen,saved,customer,logoutCustomer,syncError,refreshAccount,offers=[],products=[]}=useStore();
  const [menu,setMenu]=useState(false),[search,setSearch]=useState(false),[q,setQ]=useState('');
  const [accountOpen,setAccountOpen]=useState(false);
  const accountRef=useRef(null);
  const hoverTimer=useRef(null);
  const nav=useNavigate();
  const location=useLocation();
  const searchInputRef=useRef(null);

  useEffect(()=>{setMenu(false);setSearch(false);setAccountOpen(false);},[location.pathname,location.search]);
  useEffect(()=>{
    const close=e=>{
      if(e.key==='Escape'){
        setMenu(false);
        setSearch(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener('keydown',close);
    return()=>document.removeEventListener('keydown',close);
  },[]);

  useEffect(()=>{
    if(!accountOpen)return;
    const onOutside=e=>{
      if(accountRef.current&&!accountRef.current.contains(e.target)){
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown',onOutside);
    document.addEventListener('touchstart',onOutside);
    return()=>{
      document.removeEventListener('mousedown',onOutside);
      document.removeEventListener('touchstart',onOutside);
    };
  },[accountOpen]);

  const handleAccountEnter=()=>{
    if(typeof window!=='undefined'&&window.matchMedia('(hover: hover)').matches){
      clearTimeout(hoverTimer.current);
      setAccountOpen(true);
    }
  };

  const handleAccountLeave=()=>{
    if(typeof window!=='undefined'&&window.matchMedia('(hover: hover)').matches){
      hoverTimer.current=setTimeout(()=>{
        setAccountOpen(false);
      },200);
    }
  };

  const handleLogout=async()=>{
    setAccountOpen(false);
    setMenu(false);
    try{
      await logoutCustomer();
      if(location.pathname==='/account'){
        nav('/account');
      }
    }catch(e){
      console.error('Logout error:',e);
    }
  };

  const bannerOffer=offers.find(o=>o.show_in_banner&&o.banner_headline)||offers[0];
  const bannerTarget=bannerOffer?(bannerOffer.applies_to==='silver'?'/coins/silver':bannerOffer.applies_to==='coins'?'/coins':'/collections/all'):'/collections/pearls';

  return <>
    <Link to={bannerTarget} className="announcement" aria-label="Announcement banner">
      {bannerOffer?<><Sparkles size={11} color="#f9ca24"/> {bannerOffer.banner_headline} {bannerOffer.code?<span>Code: {bannerOffer.code} <ArrowRight size={12}/></span>:<span>Offer auto-applied <ArrowRight size={12}/></span>}</>:<>A little wonder. An everyday heirloom. <span>Discover the Pearl Edit <ArrowRight size={12}/></span></>}
    </Link>
    <header className="header">
      <button className="icon mobile-menu" aria-label={menu?'Close navigation menu':'Open navigation menu'} aria-expanded={menu} aria-controls="store-navigation" onClick={()=>setMenu(!menu)}>
        {menu?<X size={22}/>:<Menu size={22}/>}
      </button>
      <Brand/>
      <nav id="store-navigation" className={menu?'nav open':'nav'}>
        <Link onClick={()=>setMenu(false)} to="/collections/all">All jewellery</Link>
        <Link onClick={()=>setMenu(false)} to="/collections/pearls">The Pearl Edit</Link>
        <Link onClick={()=>setMenu(false)} to="/coins">Coins</Link>
        <Link onClick={()=>setMenu(false)} to="/collections/earrings">Earrings</Link>
        <Link onClick={()=>setMenu(false)} to="/collections/necklaces">Necklaces</Link>
        <Link onClick={()=>setMenu(false)} to="/collections/rings">Rings</Link>
        <Link onClick={()=>setMenu(false)} to="/collections/bracelets">Bracelets</Link>
        {menu&&<div className="mobile-nav-footer">
          {customer?(
            <>
              <div className="mobile-user-card">
                <span className="account-icon-wrapper">
                  <UserRound size={18}/>
                  <span className="auth-indicator" title="Logged in" aria-label="Logged in"/>
                </span>
                <div>
                  <strong>{customer.name}</strong>
                  <small>{customer.email}</small>
                </div>
              </div>
              <Link onClick={()=>setMenu(false)} to="/account?tab=overview" className="mobile-nav-link">
                <UserRound size={16}/> My Profile
              </Link>
              <Link onClick={()=>setMenu(false)} to="/account?tab=orders" className="mobile-nav-link">
                <Package size={16}/> My Orders
              </Link>
              <Link onClick={()=>setMenu(false)} to="/collections/saved" className="mobile-nav-link">
                <Heart size={16}/> Saved pieces {saved.length>0&&<span>({saved.length})</span>}
              </Link>
              <Link onClick={()=>setMenu(false)} to="/information/shipping" className="mobile-nav-link">
                <Truck size={16}/> Delivery & returns
              </Link>
              <button onClick={handleLogout} className="mobile-nav-link mobile-nav-logout">
                <LogOut size={16}/> Logout
              </button>
            </>
          ):(
            <>
              <Link onClick={()=>setMenu(false)} to="/account?mode=login" className="mobile-nav-link">
                <UserRound size={16}/> Sign In
              </Link>
              <Link onClick={()=>setMenu(false)} to="/account?mode=register" className="mobile-nav-link">
                <Sparkles size={16}/> Register
              </Link>
              <Link onClick={()=>setMenu(false)} to="/collections/saved" className="mobile-nav-link">
                <Heart size={16}/> Saved pieces {saved.length>0&&<span>({saved.length})</span>}
              </Link>
              <Link onClick={()=>setMenu(false)} to="/information/shipping" className="mobile-nav-link">
                <Truck size={16}/> Delivery & returns
              </Link>
            </>
          )}
        </div>}
      </nav>
      <div className="header-tools">
        <div
          className="account-menu-container"
          ref={accountRef}
          onMouseEnter={handleAccountEnter}
          onMouseLeave={handleAccountLeave}
        >
          <button
            type="button"
            className={`icon account-nav ${customer ? 'logged-in' : ''}`}
            onClick={()=>setAccountOpen(prev=>!prev)}
            aria-expanded={accountOpen}
            aria-haspopup="true"
            aria-label={customer ? `Account menu for ${customer.name}` : "Account: Sign in or register"}
          >
            <span className="account-icon-wrapper">
              <UserRound size={20}/>
              {customer&&<span className="auth-indicator" title="Logged in" aria-label="Logged in"/>}
            </span>
            {customer&&<span className="account-name-label">{customer.name.split(' ')[0]}</span>}
            <ChevronDown size={13} className={`account-chevron ${accountOpen?'open':''}`} aria-hidden="true"/>
          </button>
          {accountOpen&&(
            <div className="account-dropdown" role="menu">
              {customer?(
                <>
                  <div className="account-dropdown-header">
                    <span className="account-dropdown-status"><span className="auth-indicator inline"/> Signed in</span>
                    <strong className="account-dropdown-name">{customer.name}</strong>
                    <small className="account-dropdown-email">{customer.email}</small>
                  </div>
                  <div className="account-dropdown-divider"/>
                  <Link
                    to="/account?tab=overview"
                    className="account-dropdown-item"
                    role="menuitem"
                    onClick={()=>setAccountOpen(false)}
                  >
                    <UserRound size={15}/>
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/account?tab=orders"
                    className="account-dropdown-item"
                    role="menuitem"
                    onClick={()=>setAccountOpen(false)}
                  >
                    <Package size={15}/>
                    <span>My Orders</span>
                  </Link>
                  <div className="account-dropdown-divider"/>
                  <button
                    type="button"
                    className="account-dropdown-item account-dropdown-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={15}/>
                    <span>Logout</span>
                  </button>
                </>
              ):(
                <>
                  <div className="account-dropdown-header">
                    <strong className="account-dropdown-title">Account</strong>
                    <small className="account-dropdown-subtitle">Access your orders & wishlist</small>
                  </div>
                  <div className="account-dropdown-divider"/>
                  <Link
                    to="/account?mode=login"
                    className="account-dropdown-item"
                    role="menuitem"
                    onClick={()=>setAccountOpen(false)}
                  >
                    <UserRound size={15}/>
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/account?mode=register"
                    className="account-dropdown-item"
                    role="menuitem"
                    onClick={()=>setAccountOpen(false)}
                  >
                    <Sparkles size={15}/>
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        <button className="icon" aria-label="Search jewellery" onClick={()=>setSearch(!search)}><Search size={20}/></button>
        <Link className="icon save-nav" to="/collections/saved" aria-label="Saved pieces"><Heart size={20}/>{saved.length>0&&<i>{saved.length}</i>}</Link>
        <button className="icon bag-icon" aria-label="Open shopping bag" onClick={()=>setBagOpen(true)}><ShoppingBag size={20}/><span>{bag.reduce((n,p)=>n+p.quantity,0)}</span></button>
      </div>
    </header>
    {search&&<SearchAutocomplete onClose={()=>setSearch(false)} initialQuery={q} />}
    {syncError&&<div className="account-sync-banner" role="alert">{syncError} <button className="underlink" onClick={()=>refreshAccount().catch(()=>{})}>Reload account</button></div>}
  </>;
}
function Footer(){const {config}=useStore();return <footer><div className="footer-top"><div><Brand/><p>For the moments that become memories.</p></div><div><h4>EXPLORE</h4><Link to="/collections/all">All jewellery</Link><Link to="/coins">Gold & Silver Coins</Link><Link to="/collections/saved">Your saved pieces</Link><Link to="/bag">Shopping bag</Link><Link to="/account">My account</Link></div><div><h4>HERE TO HELP</h4><Link to="/information/shipping">Delivery & returns</Link><Link to="/information/care">Jewellery care</Link><Link to="/information/contact">Contact us</Link></div><div><h4>A NOTE FROM THE MAISON</h4><p>Beautiful things take time.<br/>Discover a collection made for yours.</p><Link to="/collections/all" className="footer-cta">Find your piece <ArrowUpRight size={17}/></Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Veyora Jewels</span><span>India · INR ₹</span><Link to="/admin">Merchant studio ↗</Link></div>{config.preview&&<p className="preview-note">Design preview · Fictional catalogue and prices · Reference imagery from the Maison Perle design brief</p>}</footer>}
function Layout({children}){return <><Header/><main>{children}</main><Footer/><BagDrawer/><InstallApp/></>}
function Home(){const location=useLocation();const {products,error}=useStore();const hero=useRef();const [editorialZoom,setEditorialZoom]=useState(false);useEffect(()=>{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const ctx=gsap.context(()=>{gsap.from('.hero-copy > *',{y:22,opacity:0,duration:1.1,stagger:.12,ease:'power2.out'});gsap.from('.hero-photo',{opacity:0,duration:1.6})},hero);return()=>ctx.revert()}},[]);const unique=grouped(products);return <Layout><HeroBanner key={location.key} heroRef={hero}/><div className="value-strip"><span><Gem size={17}/>Considered details</span><span><Heart size={17}/>Pieces to make your own</span><span><Package size={17}/>A moment worth unwrapping</span></div><section id="collections" className="section collection-section"><div className="section-heading"><div><span className="eyebrow">A WORLD OF VEYORA</span><h2>Find your <em>kind of beautiful.</em></h2></div><Link className="underlink" to="/collections/all">Explore all jewellery <ArrowUpRight size={17}/></Link></div><div className="category-grid">{[['Earrings','Lune Pearl Drop','A little movement. A lot of meaning.'],['Necklaces','Atelier Ribbon Collar','Close to your heart.'],['Rings','Eclipse Ring','Your everyday signature.'],['Bracelets','Nocturne Cuff','The finishing touch.']].map(([name,img,sub],i)=><Link className="category-card" to={'/collections/'+name.toLowerCase()} key={name}><div className="category-photo"><img loading="lazy" src={media(img)} alt={`${name} reference collection`}/><span className="category-no">0{i+1}</span><span className="round-arrow"><ArrowUpRight size={21}/></span></div><h3>{name}</h3><p>{sub}</p></Link>)}</div></section><section className="featured section"><div className="section-heading"><div><span className="eyebrow">THE PIECES YOU COME BACK TO</span><h2>Destined to be <em>your favourite.</em></h2></div><Link className="underlink" to="/collections/all">Discover the edit <ArrowUpRight size={17}/></Link></div>{error?<p className="error">{error}</p>:<div className="product-grid home-products">{unique.slice(0,4).map(p=><ProductCard key={p.sku} p={p}/>)}</div>}</section><section className="editorial"><button type="button" className="editorial-image editorial-zoom" aria-label="Zoom editorial jewellery image" onClick={()=>setEditorialZoom(true)}><img loading="lazy" src={media('Fine Jewelry Collection')} alt="Fine jewellery reference study in light and texture"/></button><div className="editorial-copy"><span className="eyebrow">LESS, BUT MORE MEANINGFUL</span><h2>Never just<br/><em>an accessory.</em></h2><p>A first chapter. An everyday ritual. A moment you want to keep close. Find the piece that becomes part of your story.</p><Link className="underlink" to="/collections/all">Meet your next heirloom <ArrowUpRight size={18}/></Link><span className="editorial-flower">✳</span></div></section><section className="closing"><span className="eyebrow">SOMETHING TO TREASURE</span><h2>Good things come in <em>little boxes.</em></h2><p>For someone you love. Including yourself.</p><Link className="button dark" to="/collections/all">Find a little wonder <ArrowUpRight size={17}/></Link></section>{editorialZoom&&<ImageViewer images={[{url:media('Fine Jewelry Collection'),alt_text:'Fine jewellery reference study in light and texture'}]} title="Veyora jewellery study" onClose={()=>setEditorialZoom(false)}/>}</Layout>}
function FestiveGridBanner({offer}){
  if(!offer)return null;
  const isSilverMakingOffer=offer.applies_to==='silver'&&offer.discount_type==='making_percent'&&Number(offer.discount_value)===100;
  if(isSilverMakingOffer)return <article className="festive-grid-banner festive-grid-banner-artwork">
    <Link to="/coins/silver" aria-label="Shop festive offers on 999 fine silver coins: zero making charges, 100% off on MC">
      <img src="/assets/banners/festive-silver-coins.webp" width="1024" height="1536" loading="lazy" decoding="async" alt="Festive celebration. 999 Fine Silver Coins. Zero making charges. 100% off on MC. Pure silver. Transparent metal rates. Shop festive offers."/>
    </Link>
  </article>;
  return <article className="festive-grid-banner">
    <div>
      <span className="festive-banner-badge"><Sparkles size={12}/> FESTIVE CELEBRATION</span>
      <h3 className="festive-banner-title">{offer.banner_headline||offer.name}</h3>
      <div className="festive-banner-discount">{offer.badge_text}</div>
      <p className="festive-banner-subtext">{offer.banner_subtext||'Special festive discounts auto-applied to eligible jewellery and coins'}</p>
    </div>
    <Link to={offer.applies_to==='silver'?'/coins/silver':offer.applies_to==='coins'?'/coins':'/collections/all'} className="festive-banner-btn">Shop Festive Offers <ArrowRight size={14}/></Link>
  </article>;
}
// One information layout for jewellery, bullion and future catalogue categories.
function CardInfo({product:p,href,specifications,price,note,action}){
  return <div className="product-info">
    <Link className="product-card-title" to={href} title={p.name}><h3>{p.name}</h3></Link>
    <div className="product-card-rating">
      <RatingBadge rating={p.rating_average} count={p.rating_count} showEmpty={true} size="sm" />
    </div>
    <div className="product-card-specifications"><span>{specifications}</span>{p.image_kind==='illustration'&&<small className="illustration-note">Illustrative image</small>}</div>
    <div className="product-card-price">{p.original_price&&p.original_price>p.price?<div className="price-row"><span className="discounted-price">{money(p.price)}</span><del className="original-price-del">{money(p.original_price)}</del>{p.discount_amount>0&&<span className="offer-save-tag">SAVE {money(p.discount_amount)}</span>}</div>:<p>{price}</p>}</div>
    <div className="product-card-note">{note}</div>
    <div className="product-card-actions">{action}</div>
  </div>;
}
function ProductCard({p}){
  const {products,add,saved,toggleSave}=useStore();
  const isCoin=p.is_coin||!!p.coin_type||p.sku?.startsWith('COIN-');
  const href=isCoin?'/coins/product/'+encodeURIComponent(p.sku):'/products/'+p.slug;
  const hasVariants=!isCoin&&products.filter(product=>product.product_code===p.product_code).length>1;
  const hasRange=!isCoin&&p.minPrice&&p.maxPrice&&p.minPrice!==p.maxPrice;
  const isGoldLinked=p.pricing_mode==='GOLD_LINKED'||(isCoin&&p.pricing_mode==='METAL_LINKED');
  return <article className="product-card">
    <div className="product-photo">
      <Link className="product-card-link" to={href} aria-label={`View ${p.name}`}>
        <ListingImage product={p} alt={`${p.name}, ${p.metal} ${p.purity}`}/>
      </Link>
      {p.offer?.badge_text && (
        <span className="offer-ribbon-badge" title={p.offer.name}>
          <Sparkles size={10}/> {p.offer.badge_text}
        </span>
      )}
      {isGoldLinked&&!p.offer?.badge_text&&<span className="gold-linked-badge" title="Dynamic price linked to live bullion rate"><Sparkles size={10}/> {isCoin?'LIVE METAL RATE':'GOLD-LINKED RATE'}</span>}
      {!isCoin&&<button className={'save-piece icon '+(saved.includes(p.product_code)?'selected':'')} aria-label={`Save ${p.name}`} aria-pressed={saved.includes(p.product_code)} onClick={()=>toggleSave(p.product_code)}><Heart size={18}/></button>}
      <span className="product-label">{p.stock===0?'CURRENTLY UNAVAILABLE':isCoin?`${p.purity} ${p.metal.toUpperCase()}`:p.category==='Rings'?'YOUR EVERYDAY SIGNATURE':'THE PEARL EDIT'}</span>
    </div>
    <CardInfo product={p} href={href}
      specifications={isCoin?`${p.weight_g}g · ${p.purity} ${p.metal}${p.dimension?` · ${p.dimension}`:''}`:`${p.metal} · ${p.purity} · ${p.category}`}
      price={p.price===null?'Price awaiting rate':(hasRange?`${money(p.minPrice)} – ${money(p.maxPrice)}`:`${money(p.price)}${p.category==='Rings'?' onwards':''}`)}
      note={isGoldLinked&&<span className="gold-linked-subtext">✦ Live {isCoin?'Metal':'Gold'}-Linked Pricing</span>}
      action={hasVariants?<Link className="button dark product-card-cart" to={href}>Choose options <ArrowRight size={16}/></Link>:<button type="button" className="button dark product-card-cart" disabled={!p.checkout_available} onClick={()=>add(isCoin?{sku:p.sku,name:p.name,image:p.image,price:p.price,stock:p.stock,size:`${p.weight_g}g (${p.purity})`,slug:'coins'}:p)}>{p.checkout_available?'Add to cart':p.stock===0?'Out of stock':'Currently unavailable'}<ShoppingBag size={16}/></button>}/>

  </article>;
}
function Collection(){
  const {category='all'}=useParams();
  const {products,coins=[],saved,offers=[],error,accountReady,refreshCatalogue}=useStore();
  const [params,setParams]=useSearchParams();
  const [filters,setFilters]=useState(false);
  const [visible,setVisible]=useState(24);
  useEffect(()=>setVisible(24),[category,params.toString()]);
  const listRef=useRef();
  const q=params.get('q')||'';
  useEffect(()=>{
    document.title=`${q?`Search: “${q}”`:category==='all'?'All jewellery':category==='pearls'?'The Pearl Edit':category} | Veyora Jewels`;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.fromTo(listRef.current,{opacity:0,y:10},{opacity:1,y:0,duration:.5});
    const key='scroll:'+location.pathname+location.search;
    requestAnimationFrame(()=>window.scrollTo(0,Number(sessionStorage.getItem(key)||0)));
    const save=()=>sessionStorage.setItem(key,String(window.scrollY));
    window.addEventListener('scroll',save);
    return()=>window.removeEventListener('scroll',save);
  },[category,params.toString()]);

  const update=(k,v)=>{const next=new URLSearchParams(params);v?next.set(k,v):next.delete(k);setParams(next,{replace:true})};
  const cleanQ=q.trim().toLowerCase();
  const qTokens=cleanQ.split(/\s+/).filter(Boolean);

  function matchesSearch(item, isCoin) {
    if(!cleanQ)return true;
    const name=(item.name||'').toLowerCase();
    const cat=(item.category||item.coin_type||'').toLowerCase();
    const sku=(item.sku||'').toLowerCase();
    const metal=(item.metal||'').toLowerCase();
    const purity=(item.purity||'').toLowerCase();
    const desc=(item.description||'').toLowerCase();
    const weight=isCoin?`${item.weight_g}g ${item.weight_g} gram ${item.weight_g} grams`:(item.net_weight_g?`${item.net_weight_g}g`:'');
    const fullText=`${name} ${cat} ${sku} ${metal} ${purity} ${weight} ${desc}`;

    return qTokens.every(t=>{
      const mapped = {
        peral: 'pearl', perals: 'pearl', perl: 'pearl',
        neclace: 'necklace', neckless: 'necklace',
        earings: 'earrings', erring: 'earrings',
        braclet: 'bracelet', barcelet: 'bracelet',
        silvr: 'silver', gld: 'gold', laxmi: 'lakshmi',
        nocturn: 'nocturne', eclise: 'eclipse'
      }[t] || t;
      return fullText.includes(t) || fullText.includes(mapped);
    });
  }

  const jewelleryItems=grouped(products.filter(p=>(['all','pearls','saved'].includes(category)||p.category.toLowerCase()===category)&&(category!=='saved'||saved.includes(p.product_code))));
  const coinItems=(coins||[]).map(c=>({...c,is_coin:true}));

  const baseList=q
    ?(category==='all'?[...jewelleryItems,...coinItems]:jewelleryItems)
    :jewelleryItems;

  let items=baseList.filter(p=>matchesSearch(p,p.is_coin)&&(!params.get('purity')||p.purity===params.get('purity'))&&(!params.get('stock')||p.stock>0)&&matchPrice(p.price,params.get('price')));
  if(params.get('sort')==='price-asc')items.sort((a,b)=>a.price-b.price);
  if(params.get('sort')==='price-desc')items.sort((a,b)=>b.price-a.price);
  const title=q?`Search results for “${q}”`:({all:'The jewellery collection',pearls:'The Pearl Edit',saved:'Your saved pieces'}[category]||category);
  const gridOffer=offers.find(o=>o.show_in_grid)||offers[0];

  return <Layout>
    <div className="collection-intro">
      <span className="eyebrow">{q?`FOUND ${items.length} MATCHING PIECES`:'THE VEYORA COLLECTIONS'}</span>
      <h1>{title}</h1>
      <p>{q?`Showing jewellery and coins matching “${q}”.`:'Considered pieces. Quiet statements. Endlessly you.'}</p>
      <div className="collection-tabs">
        <Link className={category==='all'?'active':''} to="/collections/all">All jewellery</Link>
        <Link className={category==='pearls'?'active':''} to="/collections/pearls">The Pearl Edit</Link>
        <Link className={category==='earrings'?'active':''} to="/collections/earrings">Earrings</Link>
        <Link className={category==='necklaces'?'active':''} to="/collections/necklaces">Necklaces</Link>
        <Link className={category==='rings'?'active':''} to="/collections/rings">Rings</Link>
        <Link className={category==='bracelets'?'active':''} to="/collections/bracelets">Bracelets</Link>
        <Link to="/coins">Coins</Link>
        {category==='saved'&&<Link className="active" to="/collections/saved">Saved pieces ({saved.length})</Link>}
      </div>
      <div className="price-bracket-bar" role="group" aria-label="Filter by price bracket">
        <span className="price-bracket-title">Price:</span>
        {priceBrackets.map(b=>{
          const isActive=(params.get('price')||'')===b.value;
          return <button key={b.value} type="button" className={'price-bracket-pill '+(isActive?'active':'')} onClick={()=>update('price',isActive&&b.value?'':b.value)} aria-pressed={isActive}>{b.label}</button>;
        })}
      </div>
    </div>
    <section className="section catalogue" ref={listRef}>
      <div className="filter-toolbar">
        <button className="text-button" onClick={()=>setFilters(!filters)}>
          <SlidersHorizontal size={16}/> Filter & refine {params.size>0&&`(${params.size})`}
        </button>
        <span>{items.length} pieces</span>
        <label>Sort by <select aria-label="Sort products" value={params.get('sort')||'featured'} onChange={e=>update('sort',e.target.value)}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select></label>
      </div>
      {params.size>0&&<div className="active-filters-row">
        {params.get('q')&&<button className="active-filter-chip" onClick={()=>update('q','')}>Search: “{params.get('q')}” <X size={12}/></button>}
        {params.get('purity')&&<button className="active-filter-chip" onClick={()=>update('purity','')}>Purity: {params.get('purity')} <X size={12}/></button>}
        {params.get('price')&&<button className="active-filter-chip" onClick={()=>update('price','')}>Price: {priceBrackets.find(p=>p.value===params.get('price'))?.label||params.get('price')} <X size={12}/></button>}
        {params.get('stock')&&<button className="active-filter-chip" onClick={()=>update('stock','')}>In stock only <X size={12}/></button>}
        <button className="underlink" style={{fontSize:'10px',padding:0}} onClick={()=>setParams({})}>Clear all</button>
      </div>}
      {filters&&<div className="filters">
        <label>Search<input placeholder="Search the collection" value={q} onChange={e=>update('q',e.target.value)}/></label>
        <label>Purity<select value={params.get('purity')||''} onChange={e=>update('purity',e.target.value)}><option value="">All purities</option><option>18K</option><option>22K</option><option>925</option></select></label>
        <label>Price bracket<select value={params.get('price')||''} onChange={e=>update('price',e.target.value)}>{priceBrackets.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
        <label className="checkbox"><input type="checkbox" checked={!!params.get('stock')} onChange={e=>update('stock',e.target.checked?'1':'')}/> In stock only</label>
        <button className="text-button" onClick={()=>setParams({})}>Clear all</button>
      </div>}
      {error?<div className="empty"><p className="error" role="alert">{error}</p><button className="underlink" onClick={()=>refreshCatalogue().catch(()=>{})}>Try again</button></div>:!accountReady?<p className="empty" role="status">Loading jewellery…</p>:items.length?<><div className="product-grid">{items.slice(0,visible).map((p,idx)=><React.Fragment key={p.sku}>{idx===2&&gridOffer&&<FestiveGridBanner offer={gridOffer}/>}<ProductCard p={p}/></React.Fragment>)}</div>{items.length>visible&&<div className="load-more"><button className="button dark" onClick={()=>setVisible(n=>n+24)}>Load more ({items.length-visible} remaining)</button></div>}</>:<div className="empty"><Gem size={36}/><h2>No pieces found</h2><p>Try clearing your filters or exploring our full jewellery catalogue.</p><div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginTop:'18px'}}>{params.size>0&&<button className="button dark" onClick={()=>setParams({})}>Clear all filters</button>}<Link className="button secondary" to="/collections/all">Explore all jewellery</Link></div></div>}
    </section>
  </Layout>;
}
function Modal({title,children,onClose}){const el=useRef();useEffect(()=>{const prev=document.activeElement;el.current?.focus();const key=e=>{if(!el.current?.contains(document.activeElement))return;if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=el.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled])');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=old;prev?.focus()}},[]);return <div className="modal-backdrop" onClick={onClose}><section ref={el} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{title}</h2><button className="icon" aria-label="Close dialog" onClick={onClose}><X/></button></div>{children}</section></div>}
function StructuredProduct({p}){if(typeof document!=='undefined'&&document.querySelector('script[type="application/ld+json"]'))return null;const data={"@context":"https://schema.org","@type":"Product",name:p.name,description:p.description,image:p.image,sku:p.sku,material:p.metal,brand:{"@type":"Brand",name:"Veyora Jewels"},offers:{"@type":"Offer",priceCurrency:"INR",price:p.price,availability:"https://schema.org/"+(p.checkout_available?'InStock':'OutOfStock'),url:window.location.href}};return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>}
function Product(){
  const {slug}=useParams();
  const navigate=useNavigate();
  const {products,add,saved,toggleSave,accountReady,error,refreshCatalogue}=useStore();
  const listed=products.find(item=>item.slug===slug);
  const variants=listed?products.filter(item=>item.product_code===listed.product_code):[];
  const [sku,setSku]=useState(''),[guide,setGuide]=useState(false);
  const p=variants.find(item=>item.sku===sku)||listed;
  const relatedProducts = useMemo(()=>products.filter(item=>item.category===p?.category&&item.product_code!==p?.product_code),[products,p?.category,p?.product_code]);
  useEffect(()=>{setSku('');},[slug]);
  useEffect(()=>{if(p)document.title=p.seo_title||p.name+' | Veyora Jewels'},[p?.name,p?.seo_title]);
  if(!p)return <Layout><div className="empty"><h1>{!accountReady?'Finding your piece…':error?'Could not load this piece':'Piece not found'}</h1>{error&&<><p className="error" role="alert">{error}</p><button className="underlink" onClick={()=>refreshCatalogue().catch(()=>{})}>Try again</button></>}<Link to="/collections/all">Back to collection</Link></div></Layout>;

  const photos=galleryPhotos(p.images);
  const angleImages=photos.length?photos:galleryPhotos([{id:'default',role:'hero',url:p.image,alt_text:p.name}]);

  return <Layout><StructuredProduct p={p}/><div className="breadcrumbs section"><Link to="/collections/all">Jewellery</Link><span>/</span><Link to={'/collections/'+p.category.toLowerCase()}>{p.category}</Link><span>/</span><span>{p.name}</span></div><section className="product-detail section"><ProductMagicZoom id={p.sku} images={angleImages} title={`${p.name}, ${p.size}, ${p.purity} ${p.metal}`}><p className="caption">{angleImages.length>1?'MULTI-ANGLE PHOTOGRAPHY · PREVIEW CATALOGUE':'PRODUCT IMAGE · PREVIEW CATALOGUE'}</p></ProductMagicZoom><div className="detail-copy"><span className="eyebrow">THE PEARL EDIT</span><h1>{p.name}</h1><p className="material-line">{p.purity} {p.metal} · {p.finish} finish</p><div className="pdp-rating-row" style={{marginBottom:'10px'}}><RatingBadge rating={p.rating_average} count={p.rating_count} showEmpty={true} size="md" onClick={()=>{const el=document.getElementById('reviews');if(el)el.scrollIntoView({behavior:'smooth'});}}/></div><div className="detail-price">{p.original_price&&p.original_price>p.price?<div className="price-row" style={{alignItems:'baseline',gap:'10px',margin:0}}><span className="discounted-price" style={{fontSize:'26px'}}>{money(p.price)}</span><del className="original-price-del" style={{fontSize:'16px'}}>{money(p.original_price)}</del>{p.discount_amount>0&&<span className="offer-save-tag">SAVE {money(p.discount_amount)}</span>}</div>:p.price===null?'Awaiting approved rate':money(p.price)}</div>{p.offer&&<div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}><span className="offer-ribbon-badge" style={{position:'static',clipPath:'none',borderRadius:'2px',padding:'4px 10px',fontSize:'10px',boxShadow:'none'}}>✦ {p.offer.name}: {p.offer.badge_text}</span>{p.offer.code&&<span className="status-badge" style={{fontSize:'9px'}}>CODE: {p.offer.code}</span>}</div>}{p.pricing_mode==='GOLD_LINKED'&&<div style={{marginTop:'6px'}}><span className="gold-linked-pill"><Sparkles size={12}/> Live Gold-Linked Rate</span></div>}<p className="small muted">Preview price · Shipping calculated before payment</p><p className="detail-description">{p.description}</p><div className="size-label"><label htmlFor="size">{p.category==='Rings'?'Ring size':'Size / length'}</label><button className="underlink" onClick={()=>setGuide(true)}>Size guide ↗</button></div><select id="size" value={p.sku} onChange={e=>{const next=variants.find(item=>item.sku===e.target.value);if(!next)return;setSku(next.sku);if(next.slug!==slug)navigate('/products/'+next.slug);}}>{variants.map(v=><option value={v.sku} key={v.sku}>{v.size}{v.stock===0?' — Out of stock':''}</option>)}</select><p className={'stock '+(!p.checkout_available?'unavailable':'')}><span/>{p.stock===0?'Currently out of stock':!p.checkout_available?'Awaiting a fresh verified gold rate':`${p.stock} available · Ready for your next chapter`}</p><div className="add-row"><button className="button dark" disabled={!p.checkout_available} onClick={()=>add(p)}>{p.checkout_available?'Add to cart':p.stock===0?'Out of stock':'Currently unavailable'}<ShoppingBag size={18}/></button><button className={'wishlist-button '+(saved.includes(p.product_code)?'selected':'')} aria-label={saved.includes(p.product_code)?`Remove ${p.name} from saved`:`Save ${p.name}`} aria-pressed={saved.includes(p.product_code)} onClick={()=>toggleSave(p.product_code)}><Heart fill={saved.includes(p.product_code)?'currentColor':'none'} size={20}/></button></div><dl className="specs"><div><dt>Metal & purity</dt><dd>{p.metal}, {p.purity}</dd></div><div><dt>Net metal weight</dt><dd>{Number(p.net_weight_g).toFixed(3)} g</dd></div><div><dt>Size / finish</dt><dd>{p.size} / {p.finish}</dd></div><div><dt>SKU</dt><dd>{p.sku}</dd></div></dl><details><summary>Price details <Plus size={15}/></summary>{p.breakdown?.mode==='GOLD_LINKED'?<div className="breakdown">{[['Metal value',p.breakdown.metal],p.breakdown.original_making!==undefined&&p.breakdown.original_making!==p.breakdown.making?['Original making charges',p.breakdown.original_making]:null,p.breakdown.discount_amount>0?['Festive offer savings',-p.breakdown.discount_amount]:null,['Making charges'+(p.offer?' (discounted)':''),p.breakdown.making],['Stone charges',p.breakdown.stone],['Other charges',p.breakdown.other],['Margin',p.breakdown.margin||0],['Tax',p.breakdown.tax]].filter(Boolean).map(([l,v])=><p key={l} style={v<0?{color:'#2e7d32',fontWeight:600}:{}}><span>{l}</span>{v<0?`-${money(Math.abs(v))}`:money(v)}</p>)}{p.offer&&<p className="small" style={{color:'#b7791f',fontWeight:600,marginTop:'8px'}}>✦ Applied offer: {p.offer.name} ({p.offer.badge_text})</p>}<p className="small">Rate: {money(p.breakdown.rate)}/g · {p.breakdown.rate_date}</p></div>:<p>Merchant selling price {money(p.fixed_price)} + margin {money(p.breakdown?.margin||0)}{p.breakdown?.discount_amount>0?` − offer ${money(p.breakdown.discount_amount)}`:''}. Gold-rate changes do not change this fixed base price.</p>}</details><details><summary>Delivery & returns <Plus size={15}/></summary><p>Delivery and return policies are awaiting merchant details. <Link to="/information/shipping">View current information</Link>.</p></details></div></section><ProductReviewsSection product={p}/>{relatedProducts.length>0&&<section className="related-products-section section"><div className="section-heading"><div><span className="eyebrow">CURATED COMPLEMENTS</span><h2>You may also adore</h2></div><Link className="underlink" to={'/collections/'+p.category.toLowerCase()}>Explore more {p.category} <ArrowUpRight size={16}/></Link></div><div className="product-grid">{relatedProducts.slice(0,4).map(rel=><ProductCard key={rel.sku} p={rel}/>)}</div></section>}{guide&&<Modal title="Find your fit" onClose={()=>setGuide(false)}><p>For a ring, measure the inside diameter of a comfortable ring. These are general reference sizes; confirm the final merchant sizing chart before ordering.</p><table><thead><tr><th>Indian size</th><th>Inside diameter</th></tr></thead><tbody><tr><td>12</td><td>16.5 mm</td></tr><tr><td>14</td><td>17.2 mm</td></tr></tbody></table><p>For necklaces, use a soft tape to check the listed length. Cuff sizing requires the merchant’s wrist measurements.</p></Modal>}</Layout>}
function BagLines(){const {bag,setBag,setBagOpen}=useStore();const change=(sku,n)=>setBag(b=>b.map(p=>p.sku===sku?{...p,quantity:p.quantity+n}:p).filter(p=>p.quantity>0));return bag.map(p=><div className="bag-line" key={p.sku}><Link onClick={()=>setBagOpen(false)} to={(p.slug==='coins'||p.kind==='coin'||p.sku?.startsWith('COIN-'))?'/coins/product/'+encodeURIComponent(p.sku):'/products/'+(p.slug||p.sku)}><img src={coinImage(p.image,true)} alt={p.name}/></Link><div><h3>{p.name}</h3><p>{p.size} · {p.sku}</p><strong>{p.price==null?'Price awaiting rate':money(p.price)}</strong>{p.unavailable&&<p className="error">Currently unavailable. Remove this piece to continue.</p>}<div className="quantity"><button aria-label={`Remove one ${p.name}`} onClick={()=>change(p.sku,-1)}><Minus size={13}/></button><span>{p.quantity}</span><button aria-label={`Add one ${p.name}`} onClick={()=>change(p.sku,1)} disabled={p.quantity>=Math.min(20,p.stock??20)||p.unavailable}><Plus size={13}/></button><button className="remove" onClick={()=>setBag(b=>b.filter(x=>x.sku!==p.sku))}>Remove</button></div></div></div>)}
function BagDrawer(){const {bagOpen,setBagOpen,bag}=useStore();const nav=useNavigate();if(!bagOpen)return null;return <Modal title={`Your bag (${bag.reduce((n,p)=>n+p.quantity,0)})`} onClose={()=>setBagOpen(false)}>{bag.length?<><BagLines/><div className="summary-line"><span>Estimated subtotal</span><strong>{money(bag.reduce((n,p)=>n+p.price*p.quantity,0))}</strong></div><p className="small muted">Current price, availability and delivery charges are checked at checkout.</p><button className="button dark full" onClick={()=>{setBagOpen(false);nav('/checkout')}}>Continue to checkout <ArrowRight size={17}/></button><button className="text-button full" onClick={()=>{setBagOpen(false);nav('/collections/all')}}>Continue discovering</button></>:<div className="empty"><ShoppingBag size={32}/><h3>A little room for wonder.</h3><p>Your bag is waiting for something special.</p><button className="button dark" onClick={()=>{setBagOpen(false);nav('/collections/all')}}>Explore the collection</button></div>}</Modal>}
function Bag(){
  const {bag}=useStore();
  const subtotal=bag.reduce((n,p)=>n+p.price*p.quantity,0);
  return <Layout><section className="section bag-page">
    <span className="eyebrow">YOUR LITTLE TREASURES</span>
    <h1>The shopping bag</h1>
    {bag.length?<>
      <BagLines/>
      <div className="summary-line" style={{marginTop:'25px',paddingTop:'20px',borderTop:'1px solid var(--line)'}}>
        <span>Estimated subtotal</span>
        <strong style={{fontSize:'18px'}}>{money(subtotal)}</strong>
      </div>
      <p className="small muted">Live metal rates, final delivery, and item availability are confirmed at checkout.</p>
      <div style={{display:'flex',gap:'18px',flexWrap:'wrap',marginTop:'24px',alignItems:'center'}}>
        <Link className="button dark" to="/checkout">Continue to checkout <ArrowRight size={17}/></Link>
        <Link className="underlink" to="/collections/all">Continue discovering <ArrowUpRight size={15}/></Link>
      </div>
    </>:<div className="empty">
      <ShoppingBag size={38} color="var(--gold)"/>
      <h2>Your bag is empty</h2>
      <p>Discover beautiful jewellery and coins to start your collection.</p>
      <Link className="button dark" to="/collections/all" style={{marginTop:'15px'}}>Explore all jewellery</Link>
    </div>}
  </section></Layout>;
}
function Checkout(){
  const {bag,setBag,config,customer,flushAccount,afterCheckout,refreshCatalogue}=useStore();
  const [quote,setQuote]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[accepted,setAccepted]=useState(false),[changed,setChanged]=useState(false),[codeNote,setCodeNote]=useState(''),[offerCode,setOfferCode]=useState(''),[appliedOffer,setAppliedOffer]=useState('');
  const key=useRef(crypto.randomUUID()),formRef=useRef();
  const nav=useNavigate();
  const placeholders={name:'e.g. Priya Sharma',email:'e.g. priya@example.com',phone:'10-digit mobile number',pincode:'6-digit PIN code',address:'Flat, house no., building, street',city:'e.g. Mumbai'};
  useEffect(()=>{
    let active=true;setAccepted(false);setQuote(null);setError('');
    if(bag.length)api('/quote',{items:bag.map(({sku,quantity})=>({sku,quantity})),offerCode:appliedOffer||undefined}).then(q=>{if(active)setQuote(q)}).catch(e=>{if(active)setError(e.message)});
    return()=>{active=false};
  },[bag,appliedOffer]);
  async function pay(e){
    e.preventDefault();
    if(config.checkoutEnabled===false){setError('Checkout is awaiting merchant configuration.');return;}
    if(!quote){setError('Waiting for current price quote. Please check your bag items.');return;}
    if(!accepted){setError('Please check the confirmation box above to confirm your Cash on Delivery order.');return;}
    setBusy(true);setError('');
    const fields=Object.fromEntries(new FormData(e.target));
    const otp=fields.otp;
    delete fields.otp;
    try{
      await flushAccount();
      const r=await api('/checkout',{items:bag.map(({sku,quantity})=>({sku,quantity})),token:quote.token,customer:fields,otp,offerCode:appliedOffer||undefined,paymentMode:'cod',idempotencyKey:key.current});
      await afterCheckout();
      nav('/order/'+r.id);
    }catch(e){
      setError(e.message);
      if(e.quote){setQuote(e.quote);setChanged(true);setAccepted(false);}
      if(/stock|unavailable/i.test(e.message||''))refreshCatalogue({notify:true,fresh:true}).catch(()=>{});
    }finally{setBusy(false);}
  }
  return <Layout><section className="section checkout-page">
    <Link className="underlink" to="/bag"><ArrowLeft size={15}/> Back to bag</Link>
    <div className="section-heading"><div><span className="eyebrow">ONE STEP CLOSER</span><h1>A little wonder, on its way.</h1></div><span className="status-badge" style={{background:'#e8f5e9',color:'#1b5e20',borderColor:'#a5d6a7',fontSize:'10px',fontWeight:700,letterSpacing:'1px'}}>CASH ON DELIVERY (COD)</span></div>
    {!bag.length?<div className="empty"><p>Your bag is empty.</p><Link to="/collections/all">Explore jewellery</Link></div>:<div className="checkout-grid">
      <form onSubmit={pay} ref={formRef}>
        <h3>Contact & delivery</h3>
        {customer?<p className="checkout-account-note">Signed in as {customer.email} · This order will appear in your account.</p>:<p className="checkout-account-note"><Link to="/account">Sign in or create an account</Link> to keep your order history. Guest checkout is also available.</p>}
        <div className="form-grid">
          {[['name','Full name','text'],['email','Email address','email'],['phone','Mobile number','tel'],['pincode','PIN code','text'],['address','Address','text'],['city','City','text']].map(([name,label,type])=><label key={name} className={name==='address'?'span-two':''}>{label}<input name={name} type={type} placeholder={placeholders[name]} title={name==='phone'?'10-digit mobile number':name==='pincode'?'6-digit PIN code':undefined} defaultValue={name==='name'?customer?.name:name==='email'?customer?.email:undefined} autoComplete={{name:'name',email:'email',phone:'tel',pincode:'postal-code',address:'street-address',city:'address-level2'}[name]} required maxLength={name==='phone'?10:name==='pincode'?6:200} pattern={name==='phone'?'[0-9]{10}':name==='pincode'?'[0-9]{6}':undefined}/></label>)}
        </div>
        <label>Offer code <span className="muted">(optional)</span>
          <span style={{display:'flex',gap:'8px'}}><input value={offerCode} onChange={e=>setOfferCode(e.target.value.toUpperCase())} maxLength={50} autoComplete="off" placeholder="Leave blank if the offer applies automatically"/><button type="button" className="button" onClick={()=>{setAppliedOffer(offerCode.trim());setAccepted(false);}}>Apply</button></span>
        </label>
        {config.otp?.requireCheckout&&<div className="span-two"><label>Mobile verification code<input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required/></label><button type="button" className="text-button" disabled={busy} onClick={async()=>{const phone=new FormData(formRef.current).get('phone');const channel=config.otp.channels.includes('sms')?'sms':'whatsapp';setBusy(true);setError('');try{const result=await api('/otp/send',{purpose:'checkout',channel,destination:phone});setCodeNote(result.message);}catch(err){setError(err.message)}finally{setBusy(false)}}}>Send code</button>{codeNote&&<p role="status">{codeNote}</p>}</div>}
        <div className="payment-method-box" style={{background:'var(--paper)',border:'1px solid var(--line)',padding:'16px 18px',borderRadius:'4px',margin:'22px 0 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
            <span style={{fontSize:'16px'}}>💵</span>
            <strong style={{fontSize:'12px',letterSpacing:'0.8px',textTransform:'uppercase'}}>Cash on Delivery (COD)</strong>
            <span className="status-badge" style={{background:'#e8f5e9',color:'#1b5e20',borderColor:'#a5d6a7',fontSize:'9px',marginLeft:'auto'}}>AVAILABLE</span>
          </div>
          <p style={{margin:0,fontSize:'11px',color:'var(--muted)',lineHeight:1.6}}>
            Pay cash upon delivery. No advance online payment is collected by this website.
          </p>
        </div>
        {config.checkoutEnabled===false&&<p className="notice" role="status">Checkout is awaiting merchant configuration.</p>}{config.preview&&<p className="notice">Preview order only. No payment or delivery will be arranged.</p>}{changed&&<div className="notice">The price changed. Review the updated order summary before accepting.</div>}
        <label className="checkbox consent"><input type="checkbox" disabled={!quote} checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/>{quote?`I confirm this order with Cash on Delivery and agree to pay ${money(quote.total)} upon arrival.`:'Waiting for a current order total…'}</label>
        {error&&<p className="error" role="alert">{error}</p>}
        <button className="button dark full" disabled={busy||!quote||config.checkoutEnabled===false} title={!accepted?'Please check the confirmation box above':undefined}>{busy?'Placing order…':quote?`Place Order with Cash on Delivery · ${money(quote.total)}`:'Checking prices and availability…'}<ArrowRight size={17}/></button>
      </form>
      <aside className="order-summary">
        <h3>Your chosen pieces</h3>
        {!quote&&<p role="status">{error?'The total is unavailable. Update your bag and try again.':'Checking prices and availability…'}</p>}
        {quote?.lines.map(p=><div className="summary-product" key={p.sku}><img src={coinImage(p.image,true)} alt={p.name}/><div><h4>{p.name}</h4><p>{p.size} · Qty {p.quantity}</p><span>{money(p.unit_price*p.quantity)}</span></div></div>)}
        <div className="summary-line"><span>Subtotal</span>{money(quote?.subtotal)}</div>
        <div className="summary-line"><span>Delivery</span>{quote?.shipping===0?'Complimentary':money(quote?.shipping)}</div>
        <div className="summary-line total"><span>Total payable upon arrival</span>{money(quote?.total)}</div>
        <p className="small">Displayed total includes taxes & doorstep delivery charges. Payable upon arrival.</p>
      </aside>
    </div>}
  </section></Layout>;
}
function Order(){
  const {id}=useParams();
  const [o,setO]=useState(null),[error,setError]=useState('');
  useEffect(()=>{setO(null);setError('');api('/orders/'+id).then(setO).catch(e=>setError(e.message))},[id]);
  return <Layout><section className="order-confirm section">
    {o&&<CheckCircle2 size={42}/>}
    <span className="eyebrow">ORDER CONFIRMED</span>
    <h1>{error?'Order unavailable':o?'A little wonder is on its way.':'Opening your order…'}</h1>
    {error?<p className="error">{error}</p>:o?<><p>Your order is confirmed with <strong>Cash on Delivery (COD)</strong>. Please have <strong>{money(o.total)}</strong> ready in cash upon delivery.</p><div className="confirmation-card"><div className="summary-line"><span>Order reference</span><strong>{o.id}</strong></div><div className="summary-line"><span>Placed</span>{date(o.created_at)}</div><div className="summary-line"><span>Payment method</span><span>Cash on Delivery (COD)</span></div><div className="summary-line"><span>Status</span><span className="status-badge" style={{background:'#e8f5e9',color:'#1b5e20',borderColor:'#a5d6a7'}}>Confirmed · Pay on delivery</span></div><div className="summary-line total"><span>Total payable upon arrival</span><strong>{money(o.total)}</strong></div>{o.items.map(i=><p key={i.sku}>{i.name} · {i.size} × {i.quantity}</p>)}</div></>:<p>Loading your confirmation…</p>}
    <Link className="button dark" to="/collections/all">Keep discovering <ArrowRight size={17}/></Link>
  </section></Layout>;
}
function Information(){
  const {page}=useParams();
  const {config}=useStore();
  const pages=[
    {id:'shipping',label:'Delivery & returns'},
    {id:'care',label:'Jewellery care'},
    {id:'contact',label:'Contact us'}
  ];
  return <Layout><section className="section info-page">
    <div className="collection-tabs" style={{justifyContent:'flex-start',marginBottom:'30px',marginTop:0}}>
      {pages.map(p=><Link key={p.id} to={'/information/'+p.id} className={page===p.id?'active':''}>{p.label}</Link>)}
    </div>
    <span className="eyebrow">AT YOUR SERVICE</span>
    <h1>{page==='shipping'?'Delivery & returns':page==='care'?'Care for your jewellery':'Get in touch'}</h1>
    {page==='shipping'?<>
      <h3>Delivery</h3>
      <p>{config.shippingPolicy||'The merchant’s delivery areas and timeframes are awaiting confirmation. Preview shipping is ₹250, with complimentary delivery from ₹25,000. The final charge is shown before a test order is placed.'}</p>
      <h3>Returns</h3>
      <p>{config.returnsPolicy||'The merchant’s actual returns, exchange and cancellation policy has not yet been supplied. This preview does not accept live orders.'}</p>
    </>:page==='care'?<>
      <p>Store pieces separately in a soft pouch. Avoid perfume, harsh cleaning products and prolonged water exposure. Ask the merchant for material-specific care instructions for your chosen piece.</p>
      <h3>General Care Guidelines</h3>
      <p>Keep your pieces dry and clean them gently with a microfibre cloth. For gold and silver coins, retain the supplied packaging and follow the manufacturer’s handling instructions.</p>
    </>:<>
      <p>{config.contact&&!/\.(local|invalid)$/i.test(config.contact)?<a href={'mailto:'+config.contact}>{config.contact}</a>:'The merchant’s contact details will appear here once supplied. This store is currently a design and checkout preview.'}</p>
      <h3>Concierge Assistance</h3>
      <p>Our concierge team is available to assist you with inquiries regarding sizing, precious metals, or custom orders.</p>
    </>}
    <div style={{marginTop:'40px',paddingTop:'25px',borderTop:'1px solid var(--line)'}}>
      <Link to="/collections/all" className="underlink">Explore all jewellery <ArrowRight size={15}/></Link>
    </div>
  </section></Layout>;
}
const adminTabs=[['Dashboard',LayoutDashboard],['Products',Gem],['Coins',CoinsIcon],['Offers',Tag],['Reviews',Star],['Gold Rates',ChartNoAxesCombined],['Pricing Rules',SlidersHorizontal],['Imports',Upload],['Orders',Package],['Catalogue copy',Sparkles],['Settings',Settings]];
function adminStartTab(){const value=new URLSearchParams(window.location.search).get('tab')||'';const match=adminTabs.find(([name])=>name.toLowerCase()===value.toLowerCase()||name.toLowerCase().replace(/\s+/g,'-')===value.toLowerCase());return match?match[0]:'Dashboard'}
function orderCustomer(order){const raw=order?.customer;const customer=typeof raw==='string'?(()=>{try{return JSON.parse(raw)}catch{return {}}})():(raw||{});return {name:customer.name||'',email:customer.email||''}}
const previewStaffAccounts=[{label:'Owner',email:'preview@veyora.local',password:'preview-veyora-2026'},{label:'Catalogue copy',email:'catalogue@veyora.local',password:'preview-veyora-2026'}];
function Admin(){const [staff,setStaff]=useState(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[tab,setTab]=useState(adminStartTab),[data,setData]=useState(null),[products,setProducts]=useState([]),[busy,setBusy]=useState(false),[orderQuery,setOrderQuery]=useState(''),[orderStatusFilter,setOrderStatusFilter]=useState('all'),[orderPayFilter,setOrderPayFilter]=useState('all');const {config}=useStore();const [loginEmail,setLoginEmail]=useState(config.preview?previewStaffAccounts[0].email:''),[loginPassword,setLoginPassword]=useState(config.preview?previewStaffAccounts[0].password:'');async function setOrderStatus(id,status){setBusy(true);setError('');try{await api('/admin/orders/'+encodeURIComponent(id)+'/status',{status});await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}async function refresh(){const [d,p]=await Promise.all([api('/admin/dashboard'),api('/admin/products')]);setData(d);setProducts(p)}useEffect(()=>{api('/admin/session').then(s=>{sessionStorage.setItem('csrf',s.csrf);setStaff(s.staff);return refresh()}).catch(()=>{}).finally(()=>setLoaded(true))},[]);async function login(e){e.preventDefault();setError('');try{const s=await api('/admin/login',Object.fromEntries(new FormData(e.target)));sessionStorage.setItem('csrf',s.csrf);setStaff(s.staff);await refresh()}catch(e){setError(e.message)}}async function run(kind){setBusy(true);setError('');try{const r=await api('/admin/run',{kind});await refresh();if(Object.values(r.result).some(v=>!v.ok))setError(Object.entries(r.result).filter(([,v])=>!v.ok).map(([k,v])=>`${k}: ${v.message}`).join(' · '))}catch(e){setError(e.message)}finally{setBusy(false)}}if(!loaded)return <div className="empty">Opening merchant studio…</div>;if(!staff)return <div className="admin-login"><Link className="underlink" to="/"><ArrowLeft size={16}/>Back to storefront</Link><div className="login-card"><Brand/><span className="eyebrow">THE MERCHANT STUDIO</span><h1>Welcome back.</h1><p>Your collections, thoughtfully managed.</p><form onSubmit={login}>{config.preview&&<label>Sign in as<select aria-label="Preview staff account" value={loginEmail} onChange={e=>{const account=previewStaffAccounts.find(a=>a.email===e.target.value);if(!account)return;setLoginEmail(account.email);setLoginPassword(account.password)}}>{previewStaffAccounts.map(account=><option key={account.email} value={account.email}>{account.label}</option>)}</select></label>}<label>Email<input name="email" type="email" autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required/></label><label>Password<input name="password" type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required/></label>{error&&<p className="error">{error}</p>}<button className="button dark full">Sign in <ArrowRight size={17}/></button></form>{config.preview&&<p className="small muted">Choose Owner or Catalogue copy. Production requires your own staff account.</p>}</div></div>;return <div className="admin-shell"><aside className="admin-sidebar"><Brand/><span className="studio-label">MERCHANT STUDIO</span><nav>{adminTabs.map(([label,Icon])=><button key={label} className={tab===label?'active':''} onClick={()=>{setTab(label);setError('')}}><Icon size={18}/>{label}</button>)}</nav><div className="admin-sidebar-bottom"><Link to="/">View storefront <ArrowUpRight size={15}/></Link><small>{staff.email}<br/>{staff.role}</small><button className="text-button" onClick={async()=>{await api('/admin/logout',{});setStaff(null);sessionStorage.removeItem('csrf')}}><LogOut size={15}/>Sign out</button></div></aside><main className="admin-main"><header className="admin-header"><span>VEYORA / STUDIO / {tab.toUpperCase()}</span><span className="test-badge">{data?.preview?'PREVIEW ENVIRONMENT':'MERCHANT ENVIRONMENT'}</span></header><div className="admin-content"><div className="section-heading"><div><span className="eyebrow">YOUR MAISON, AT A GLANCE</span><h1>{tab==='Dashboard'?'A considered overview.':tab}</h1></div><button className="text-button" onClick={()=>refresh().catch(e=>setError(e.message))}><RefreshCw size={15}/>Refresh</button></div>{error&&<div className="error" role="alert">{error}</div>}{!data?<p>Loading studio…</p>:<>{tab==='Dashboard'&&<><div className="admin-stats"><Stat title="ACTIVE GOLD RATES" value={data.rates.length} detail={`${data.rates.filter(r=>r.fresh).length} within freshness limit`}/><Stat title="CATALOGUE VARIANTS" value={products.length} detail={`${products.filter(p=>p.stock===0).length} out of stock`}/><Stat title="TODAY’S IMPORTS" value={data.todayImports?.failed?'Needs review':'All clear'} detail={`${data.todayImports?.published||0} published · ${data.todayImports?.failed||0} failed`}/><Stat title="ORDERS" value={data.orders.length} detail={`${money(data.orders.reduce((s,o)=>s+Number(o.total),0))} total order value`}/></div><div className="admin-two"><div className="admin-panel"><div className="panel-title"><h3>Active gold rates</h3><button className="underlink" onClick={()=>setTab('Gold Rates')}>View rates ↗</button></div><RateTable rates={data.rates}/></div><div className="admin-panel"><h3>Needs your attention</h3>{data.feedSettings?.feedStatus==='stopped'&&<div className="attention" style={{borderLeft:'3px solid #c62828',paddingLeft:'12px'}}><AlertCircle size={19} color="#c62828"/><div><strong style={{color:'#c62828'}}>Feed Automation is STOPPED</strong><p>Background syncs and live rates are paused. <button className="underlink" onClick={()=>setTab('Settings')}>Open Settings to start ↗</button></p></div></div>}<div className="attention"><AlertCircle size={19}/><div><strong>{data.rates.some(r=>!r.fresh)?'Gold rates are stale':'Storefront active with Cash on Delivery'}</strong><p>Cash on Delivery is active. Store policies and catalogue photography can be reviewed anytime.</p></div></div><p className="small">Maximum rate age: {data.maxAgeHours} hours. Stale gold-linked items pause at checkout.</p></div></div><div className="admin-panel"><h3>Supplier freshness</h3><div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Feed</th><th>Last published source</th></tr></thead><tbody>{data.suppliers.map(s=><tr key={s.supplier+s.kind}><td>{s.supplier}</td><td>{s.kind}</td><td>{date(s.last_update)}</td></tr>)}</tbody></table></div></div><BatchTable batches={data.batches.slice(0,6)}/><div className="admin-panel"><h3>Recent staff activity</h3>{data.audits.slice(0,8).map(a=><p className="audit-line" key={a.id}><span>{a.action} · Staff {a.staff_id||'system'}</span><span>{date(a.created_at)}</span></p>)}</div></>}{tab==='Gold Rates'&&<><div className="notice">Rates are explicitly purity-specific. No automatic purity conversion is enabled. Original values and corrections remain in rate history. Maximum age: {data.maxAgeHours} hours.</div><div className="admin-panel"><div className="panel-title"><h3>Approved rates</h3><button disabled={busy||staff.role==='viewer'} className="button dark small-button" onClick={()=>run('gold')}><RefreshCw size={15}/>Run rate feed</button></div><RateTable rates={data.rates}/></div><ImportPanel kind="gold" refresh={refresh} readonly={staff.role==='viewer'}/><div className="admin-panel"><h3>Rate history & corrections</h3><RateTable rates={(data.rateHistory||[]).map(r=>({...r,fresh:data.rates.some(a=>a.id===r.id&&a.fresh)}))}/></div></>}{tab==='Products'&&<><div className="notice">Supplier imports preserve merchant names, descriptions and publication status by default. Stock is an absolute snapshot, adjusted for paid orders after its source timestamp.</div><details className="advanced-media"><summary>Manage multiple photos (optional)</summary><ImageUploader products={products} refreshParent={refresh}/></details><AdminProductList products={products} readonly={staff.role==='viewer'} refresh={refresh} onOpenImports={()=>setTab('Imports')}/></>}{tab==='Coins'&&<CoinsAdmin readonly={staff.role==='viewer'} refreshParent={refresh}/>}{tab==='Offers'&&<OffersAdmin readonly={staff.role==='viewer'} refreshParent={refresh}/>}{tab==='Reviews'&&<ReviewsAdmin readonly={staff.role==='viewer'} refreshParent={refresh}/>}{tab==='Pricing Rules'&&<Rules rule={data.rule} readonly={staff.role!=='owner'} refresh={refresh}/ >}{tab==='Imports'&&<><div className="admin-two"><div className="admin-panel"><span className="eyebrow">FEED SYNCHRONIZATION</span><h3>Rates first. Catalogue second.</h3><p className="small muted">Feed sources are configured on the server. Current inventory mode: {data.feedSettings.inventoryMode}. Synchronize feeds on demand below.</p><button className="button dark" disabled={busy||staff.role==='viewer'} onClick={()=>run(null)}>{busy?'Running…':'Run both feeds now'}<RefreshCw size={16}/></button></div><div className="admin-panel"><h3>Source connections</h3><p>Gold feed: <Status text={data.feedSettings.goldConfigured?'Configured':'Not configured'}/></p><p>Product feed: <Status text={data.feedSettings.productsConfigured?'Configured':'Not configured'}/></p><p className="small muted">Private feed URLs and credentials never appear in this screen. Failed rate feeds retain the last verified rate.</p><button className="underlink" disabled={busy||staff.role==='viewer'} onClick={()=>run('products')}>Run product feed only ↗</button></div></div><div className="admin-two"><ImportPanel kind="gold" refresh={refresh} readonly={staff.role==='viewer'}/><ImportPanel kind="products" refresh={refresh} readonly={staff.role==='viewer'}/><ImportPanel kind="coins" refresh={refresh} readonly={staff.role==='viewer'}/></div><details className="advanced-media"><summary>Manage multiple photos (optional)</summary><ImageUploader products={products} refreshParent={refresh}/></details><FeedSettings data={data} refresh={refresh} readonly={staff.role!=='owner'}/><BatchTable batches={data.batches} retry={async b=>{try{await api(`/admin/import/${b.id}/publish`,{});await refresh()}catch(e){setError(e.message)}}} readonly={staff.role==='viewer'}/><div className="admin-panel"><h3>Workflow history</h3>{data.runs.length?data.runs.map(r=><div key={r.id} className="run-record"><strong>Run #{r.id} · {r.trigger} · {date(r.started_at)}</strong>{Object.entries(r.result).map(([k,v])=><p key={k}>{k}: {v.ok?`Succeeded · Source ${v.source_date} · Created ${v.created} / Updated ${v.updated} / Unchanged ${v.unchanged} / Rejected ${v.rejected}`:v.message}</p>)}</div>):<p className="small muted">No feed sync has been recorded yet.</p>}</div></>}{tab==='Orders'&&(()=>{const q=orderQuery.trim().toLowerCase();const orders=data.orders.filter(o=>{if(orderStatusFilter!=='all'&&o.status!==orderStatusFilter)return false;if(orderPayFilter!=='all'&&o.payment_mode!==orderPayFilter)return false;if(!q)return true;const customer=orderCustomer(o);return [o.id,o.status,o.payment_mode,customer.name,customer.email].join(' ').toLowerCase().includes(q)});const filtering=orderQuery.trim()||orderStatusFilter!=='all'||orderPayFilter!=='all';return <div className="admin-panel"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'16px'}}><div><h3 style={{margin:0}}>All Orders ({orders.length}{filtering?` of ${data.orders.length}`:''})</h3><span className="small muted">{filtering?`${orders.length} matching`:`${data.orders.length} total orders recorded`}</span></div>{staff.role!=='viewer'&&<a className="underlink" href="/api/admin/export/orders" download style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>Export orders CSV ({data.orders.length}) ↓</a>}</div><div className="admin-filter-bar"><div className="search-box"><Search size={14}/><input type="search" placeholder="Search order, customer, or email" value={orderQuery} onChange={e=>setOrderQuery(e.target.value)} aria-label="Search orders"/></div><select className="filter-select" value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)} aria-label="Filter orders by status"><option value="all">All statuses</option>{['confirmed','packed','shipped','delivered','cancelled'].map(status=><option key={status} value={status}>{status}</option>)}</select><select className="filter-select" value={orderPayFilter} onChange={e=>setOrderPayFilter(e.target.value)} aria-label="Filter orders by payment"><option value="all">All payments</option><option value="cod">Cash on delivery</option></select>{filtering&&<button type="button" className="reset-filter-btn" onClick={()=>{setOrderQuery('');setOrderStatusFilter('all');setOrderPayFilter('all')}}><RotateCcw size={13}/> Reset</button>}</div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Placed (India)</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o=>{const customer=orderCustomer(o);return <tr key={o.id}><td><Link to={'/order/'+o.id}>{o.id} ↗</Link></td><td>{customer.email?<>{customer.name}<small>{customer.email}</small></>:customer.name||'Customer'}</td><td>{date(o.created_at)}</td><td>{o.payment_mode}</td><td>{money(o.total)}</td><td>{staff.role==='viewer'?<Status text={o.status}/>:<select aria-label={`Status for ${o.id}`} value={o.status} disabled={busy} onChange={e=>setOrderStatus(o.id,e.target.value)}>{['confirmed','packed','shipped','delivered','cancelled'].map(status=><option key={status} value={status}>{status}</option>)}</select>}</td></tr>})}</tbody></table>{!data.orders.length&&<p className="empty">Orders will appear here after checkout.</p>}{!!data.orders.length&&!orders.length&&<p className="empty">No orders match these filters.</p>}</div></div>})()}{tab==='Catalogue copy'&&<AiCopy products={products} readonly={staff.role==='viewer'} onPublished={refresh}/>}{tab==='Settings'&&<SettingsAdmin data={data} refresh={refresh} readonly={staff.role!=='owner'} owner={staff.role==='owner'}/>}</>}</div></main></div>}
function Stat({title,value,detail}){return <div className="stat"><span className="eyebrow">{title}</span><strong>{value}</strong><small>{detail}</small></div>}
function Status({text}){return <span className={'status-badge '+(/failed|stale|Not configured/.test(text)?'warning':'')}>{text}</span>}
function RateTable({rates}){return <div className="table-wrap"><table><thead><tr><th>Purity</th><th>INR / gram</th><th>Source / original</th><th>Effective date</th><th>Status</th></tr></thead><tbody>{rates.map(r=><tr key={r.id}><td><strong>{r.purity}</strong></td><td>{money(r.inr_per_gram)}</td><td>{r.supplier}<small>{money(r.original_rate)} / {r.original_unit}</small></td><td>{r.effective_date}<small>{date(r.source_timestamp)}</small></td><td><Status text={r.fresh?'Verified':'stale — checkout paused'}/></td></tr>)}</tbody></table>{!rates.length&&<p>No approved rates. Import a rate file to begin.</p>}</div>}
function BatchTable({batches,retry,readonly}){return <div className="admin-panel"><h3>Import history</h3><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Supplier / source</th><th>Status</th><th>Created / Updated / Rejected</th><th>Actions</th></tr></thead><tbody>{batches.map(b=><tr key={b.id}><td>#{b.id} · {b.kind}</td><td>{b.supplier}<small>{date(b.source_timestamp)}</small></td><td><Status text={b.status}/></td><td>{b.summary.created} / {b.summary.updated} / {b.summary.rejected}</td><td>{b.status==='failed'?<a className="underlink" href={`/api/admin/import/${b.id}/errors`}>Errors CSV ↓</a>:b.status==='staged'&&retry&&!readonly?<button className="underlink" onClick={()=>retry(b)}>Publish / retry ↗</button>:'—'}</td></tr>)}</tbody></table></div></div>}
function ImportPanel({kind,refresh,readonly}){const [batch,setBatch]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState('');const prefix=kind==='gold'?'gold-rates':kind;async function upload(e){const file=e.target.files[0];if(!file)return;setError('');setSuccess('');setBatch(null);setBusy(true);try{if(file.size>5*1024*1024)throw Error('Maximum CSV size is 5 MB');const b=await api('/admin/import/preview',{kind,csv:await file.text()});setBatch(b);await refresh()}catch(e){setError(e.message)}finally{setBusy(false);e.target.value=''}}async function publish(){setBusy(true);try{await api(`/admin/import/${batch.id}/publish`,{});setBatch(null);setSuccess('Import published. Catalogue updated.');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}return <div className="admin-panel import-panel"><Upload size={23}/><h3>{kind==='gold'?'Gold rates':kind==='coins'?'Import coins':'Products & stock'}</h3><p className="small muted">Upload a private UTF-8 CSV. Validate first, then review and confirm.</p><div className="download-links"><a href={`/api/admin/samples/${prefix}-template.csv`}><Download size={14}/>Blank template</a><a href={`/api/admin/samples/${prefix}-example.csv`}><Download size={14}/>Fictional example</a><a href={`/api/admin/export/${kind}`} download><Download size={14}/>Export current {kind==='gold'?'rates':'catalogue'} CSV</a></div><label className="upload-zone"><Upload size={22}/><strong>{busy?'Validating…':'Choose a CSV to preview'}</strong><span>Private upload · 5 MB maximum</span><input disabled={busy||readonly} type="file" accept=".csv,text/csv" onChange={upload}/></label>{error&&<p className="error" role="alert">{error}</p>}{success&&<p role="status" className="notice">{success}</p>}{batch&&<div className="import-preview"><Status text={`Batch #${batch.id} · ${batch.status}${batch.duplicate?' · duplicate':''}`}/><p>{batch.summary.created} new · {batch.summary.updated} updates · {batch.summary.rejected} errors</p>{batch.errors?.length>0?<><p className="error">No changes published. Correct the file and upload it again.</p>{batch.errors.slice(0,5).map((e,i)=><p className="small" key={i}>Row {e.row} · {e.field}: {e.value} → {e.correction}</p>)}<a className="underlink" href={`/api/admin/import/${batch.id}/errors`}>Download error report ↓</a></>:<>{<div className="table-wrap"><table><thead><tr><th>SKU</th><th>Old</th><th>New</th><th>Stock</th></tr></thead><tbody>{batch.summary.changes?.map(c=><tr key={c.sku}><td>{c.sku}</td><td>{c.before===null?'New':money(c.before)}</td><td>{c.after===null?'Awaiting rate':money(c.after)}</td><td>{c.stock}</td></tr>)}</tbody></table></div>}{batch.status==='staged'&&<button disabled={busy||readonly} className="button dark full" onClick={publish}>Confirm & publish <Check size={16}/></button>}</>}</div>}</div>}
function ProductAngleManager({product,readonly,refreshParent}){
  const [busyRole,setBusyRole]=useState(null);
  const [error,setError]=useState('');
  const [urlInputs,setUrlInputs]=useState({});
  const [copiedId,setCopiedId]=useState(null);
  const [dragRole,setDragRole]=useState(null);

  const targetCode=product.product_code||product.sku;
  const isCoin=!!product.metal||!product.product_code;

  const roles=[
    {key:'hero',label:isCoin?'Hero Image (Obverse)':'Hero Image',desc:isCoin?'Primary display / obverse mint face':'Primary display / catalog shot',icon:'🌟'},
    {key:'front',label:'Front Angle',desc:isCoin?'Straight direct view of the coin face':'Straight direct view',icon:'📷'},
    {key:'left',label:'Left View',desc:isCoin?'Left side profile / edge angle':'Left side profile angle',icon:'👈'},
    {key:'right',label:'Right View',desc:isCoin?'Right side profile / edge angle':'Right side profile angle',icon:'👉'},
    {key:'model',label:isCoin?'Model / In-Hand View':'Model Shot',desc:isCoin?'Hand-held view for scale and thickness':'On-model wearing view',icon:isCoin?'🪙':'💃'},
    {key:'detail',label:'Detail Image',desc:isCoin?'Assay seal, mint mark, or edge milling detail':'Close-up of the product and its finish',icon:'🔍'}
  ];

  const rawImages=product.images||[];
  const images=[...rawImages];
  if(product.image&&!images.some(i=>i.role==='hero'||i.role==='front'||i.url===product.image)){
    images.unshift({id:'default-hero',role:'hero',url:product.image,alt_text:product.name});
  }

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
            name:`${targetCode}-${role}-${file.name}`,
            data:ev.target.result,
            role,
            product_code:targetCode,
            sku:product.sku||targetCode
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
      await api('/admin/product-images',{product_code:targetCode,sku:product.sku||targetCode,role,url:inputUrl});
      setUrlInputs(prev=>({...prev,[role]:''}));
      if(refreshParent)await refreshParent();
    }catch(err){setError(err.message);}finally{setBusyRole(null);}
  }

  async function handleDelete(imgId,role){
    if(readonly)return;
    setError('');setBusyRole(role);
    try{
      if(String(imgId).startsWith('default-')){
        if(isCoin){
          await api('/admin/coins/'+encodeURIComponent(targetCode),{image:''},'PATCH');
        }else{
          await api('/admin/products/'+encodeURIComponent(targetCode),{image:''},'PATCH');
        }
      }else{
        await api(`/admin/product-images/${imgId}`,{},'DELETE');
      }
      if(refreshParent)await refreshParent();
    }catch(err){setError(err.message);}finally{setBusyRole(null);}
  }

  function copy(url,id){
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(()=>setCopiedId(null),2000);
  }

  const configuredCount=roles.filter(r=>images.some(i=>i.role===r.key)).length;

  return <div className="product-angles-editor">
    <div className="angles-editor-header">
      <div>
        <h4>Multi-Angle Photography ({product.name})</h4>
        <p className="small muted" style={{margin:'2px 0 0'}}>
          Upload specific angles for <strong>{targetCode}</strong>. Customers can interactively switch between {isCoin?'Hero, Front, Left, Right, In-Hand, and Detail':'Hero, Front, Left, Right, Model, and Detail'} images on the storefront.
        </p>
      </div>
      <span className={'status-badge '+(configuredCount===roles.length?'active':'')} style={{fontSize:'9px',padding:'4px 10px'}}>
        {configuredCount}/{roles.length} Images Configured
      </span>
    </div>

    {error&&<p className="error" style={{margin:'10px 0'}}>{error}</p>}

    <div className="angle-slots-grid">
      {roles.map(r=>{
        const img=images.find(i=>i.role===r.key);
        const isBusy=busyRole===r.key;
        return <div key={r.key} className={'angle-slot-card '+(img?'has-image':'')}>
          <div className="angle-slot-header">
            <span className={'role-badge role-badge--'+r.key}>{r.icon} {r.label}</span>
            {img?<button
              type="button"
              className="angle-slot-delete-btn"
              title="Remove angle"
              disabled={readonly||isBusy}
              onClick={()=>handleDelete(img.id,r.key)}
            >
              <Trash2 size={13}/>
            </button>:<span className="angle-slot-status-dot" title="Not configured"></span>}
          </div>

          {img?(
            <div className="angle-slot-preview-wrap">
              <img
                src={coinImage(img.url,true)}
                alt={`${product.name} ${r.label}`}
                className="angle-slot-preview"
                onError={e=>{if(e.currentTarget.getAttribute('src')!=='/assets/product-placeholder.svg')e.currentTarget.src='/assets/product-placeholder.svg'}}
              />
              <div className="angle-slot-overlay">
                <a href={img.url} target="_blank" rel="noopener noreferrer" className="angle-slot-zoom-btn" title="View full photo">
                  <Maximize2 size={12}/> View
                </a>
              </div>
            </div>
          ):(
            <div
              className={'angle-slot-placeholder '+(dragRole===r.key?'dragging':'')}
              onDragOver={e=>{e.preventDefault();setDragRole(r.key);}}
              onDragLeave={()=>setDragRole(null)}
              onDrop={e=>{
                e.preventDefault();
                setDragRole(null);
                const file=e.dataTransfer?.files?.[0];
                if(file)handleSlotUpload({target:{files:[file],value:''}},r.key);
              }}
            >
              <span className="angle-slot-placeholder-icon">{r.icon}</span>
              <strong>{r.label}</strong>
              <span className="angle-slot-placeholder-desc">{r.desc}</span>
              <span className="angle-slot-drop-hint">Drop photo here</span>
            </div>
          )}

          <div className="angle-slot-actions">
            <label className="button dark small-button angle-slot-btn" style={{cursor:readonly||isBusy?'not-allowed':'pointer'}}>
              {isBusy?'Saving…':img?'Change':'+ Upload'}
              <input type="file" accept="image/*" style={{display:'none'}} disabled={readonly||isBusy} onChange={e=>handleSlotUpload(e,r.key)}/>
            </label>
            {img&&<button
              type="button"
              className="button secondary small-button angle-slot-btn"
              onClick={()=>copy(img.url,img.id)}
              title="Copy URL"
            >
              {copiedId===img.id?<><Check size={11}/> Copied</>:<><Copy size={11}/> URL</>}
            </button>}
          </div>

          {!img&&<div className="angle-slot-url-row">
            <input
              type="text"
              placeholder="or paste URL"
              value={urlInputs[r.key]||''}
              disabled={readonly||isBusy}
              onChange={e=>setUrlInputs({...urlInputs,[r.key]:e.target.value})}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleSetUrl(r.key);}}}
            />
            <button
              type="button"
              className="button dark small-button"
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
              {item.role&&<span className={'role-badge role-badge--'+item.role}>{item.role}</span>}
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

function AdminProductList({products,readonly,refresh,onOpenImports}){
  const {refreshCatalogue}=useStore();
  const [addingProduct,setAddingProduct]=useState(false);
  const [error,setError]=useState('');
  const [categoryTab,setCategoryTab]=useState('all');
  const [search,setSearch]=useState('');
  const [stockFilter,setStockFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [pricingFilter,setPricingFilter]=useState('all');

  async function saveProduct(e){
    e.preventDefault();
    const form=new FormData(e.target);
    const body=Object.fromEntries(form);
    setError('');
    try{
      await api('/admin/products',body,'POST');
      setAddingProduct(false);
      await refresh();
      await refreshCatalogue({notify:true});
    }catch(err){
      setError(err.message);
    }
  }

  async function deleteProduct(sku){
    if(!window.confirm(`Are you sure you want to delete product SKU ${sku}?`))return;
    try{
      await api('/admin/products/'+encodeURIComponent(sku),{},'DELETE');
      await refresh();
      await refreshCatalogue({notify:true});
    }catch(err){
      setError(err.message);
    }
  }

  const categories=useMemo(()=>{
    const map=new Map();
    for(const p of products){
      const cat=p.category||'Other';
      map.set(cat,(map.get(cat)||0)+1);
    }
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  },[products]);

  const filteredProducts=useMemo(()=>{
    return products.filter(p=>{
      if(categoryTab!=='all'&&(p.category||'').toLowerCase()!==categoryTab.toLowerCase())return false;
      if(search.trim()){
        const q=search.toLowerCase().trim();
        const match=(p.name||'').toLowerCase().includes(q)||
                    (p.sku||'').toLowerCase().includes(q)||
                    (p.product_code||'').toLowerCase().includes(q)||
                    (p.category||'').toLowerCase().includes(q)||
                    (p.metal||'').toLowerCase().includes(q)||
                    (p.purity||'').toLowerCase().includes(q)||
                    (p.description||'').toLowerCase().includes(q);
        if(!match)return false;
      }
      if(stockFilter==='instock'&&p.stock<=0)return false;
      if(stockFilter==='outofstock'&&p.stock>0)return false;
      if(statusFilter!=='all'&&p.status!==statusFilter)return false;
      if(pricingFilter!=='all'&&p.pricing_mode!==pricingFilter)return false;
      return true;
    });
  },[products,categoryTab,search,stockFilter,statusFilter,pricingFilter]);

  const hasActiveFilters=search.trim()||stockFilter!=='all'||statusFilter!=='all'||pricingFilter!=='all'||categoryTab!=='all';

  function resetFilters(){
    setSearch('');
    setStockFilter('all');
    setStatusFilter('all');
    setPricingFilter('all');
    setCategoryTab('all');
  }

  return <div className="products-admin">
    {/* Submenu Tabs & Actions */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'18px'}}>
      <div className="coins-subtabs" style={{margin:0,border:0,padding:0}}>
        <button className={'coins-subtab-btn '+(categoryTab==='all'?'active':'')} onClick={()=>setCategoryTab('all')}>All Pieces ({products.length})</button>
        {categories.map(([cat,count])=><button key={cat} className={'coins-subtab-btn '+(categoryTab.toLowerCase()===cat.toLowerCase()?'active':'')} onClick={()=>setCategoryTab(cat)}>{cat} ({count})</button>)}
      </div>
      <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
        <button className="button dark small-button" disabled={readonly} onClick={()=>{setError('');setAddingProduct(true)}}><Plus size={14}/> Add Product</button>
        {onOpenImports&&<button type="button" className="button secondary small-button" onClick={onOpenImports}><Upload size={14}/> Import CSV</button>}
        <a className="underlink" href="/api/admin/export/products" download style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><Download size={14}/>Export Products CSV</a>
      </div>
    </div>

    {/* Filter and Search Bar */}
    <div className="admin-filter-bar">
      <div className="search-box">
        <Search size={14}/>
        <input type="text" placeholder="Search products by name, SKU, category, purity…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter products by status">
        <option value="all">All Statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <select className="filter-select" value={stockFilter} onChange={e=>setStockFilter(e.target.value)} aria-label="Filter products by stock">
        <option value="all">All Stock</option>
        <option value="instock">In Stock ({products.filter(p=>p.stock>0).length})</option>
        <option value="outofstock">Out of Stock ({products.filter(p=>p.stock===0).length})</option>
      </select>

      <select className="filter-select" value={pricingFilter} onChange={e=>setPricingFilter(e.target.value)} aria-label="Filter products by pricing mode">
        <option value="all">All Pricing</option>
        <option value="GOLD_LINKED">Gold Linked</option>
        <option value="FIXED">Fixed Price</option>
      </select>

      {hasActiveFilters&&<button type="button" className="reset-filter-btn" onClick={resetFilters}><RotateCcw size={13}/> Reset</button>}
    </div>

    {error&&<p className="error" role="alert">{error}</p>}

    <AdminCatalogueList
      items={filteredProducts}
      label="Products"
      resetKey={`${categoryTab}-${search}-${stockFilter}-${statusFilter}-${pricingFilter}`}
      renderRow={p=><ProductRow key={p.id} p={p} readonly={readonly} refresh={refresh} onDelete={()=>deleteProduct(p.sku)}/>}
    />

    {addingProduct&&<ProductForm modal error={error} onClose={()=>setAddingProduct(false)} onSave={saveProduct}/>}
  </div>;
}

function ProductForm({product,onClose,onSave,error,modal=false}){
  const [metal,setMetal]=useState(product?.metal||'Gold');
  const [pricingMode,setPricingMode]=useState(product?.pricing_mode||'GOLD_LINKED');
  const form=<CatalogueEditForm item={product} onSave={onSave} onClose={onClose} error={error} creating={!product}>
    <label>SKU (Unique identifier)*
      <input name="sku" defaultValue={product?.sku||''} placeholder="e.g. VEY-RG-01" required disabled={!!product}/>
    </label>
    <label>Category*
      <select name="category" defaultValue={product?.category||'Rings'}>
        <option value="Rings">Rings</option>
        <option value="Necklaces">Necklaces</option>
        <option value="Earrings">Earrings</option>
        <option value="Bracelets">Bracelets</option>
        <option value="Pendants">Pendants</option>
        <option value="Jewellery">Jewellery</option>
      </select>
    </label>
    <label>Product Code / Group Slug
      <input name="product_code" defaultValue={product?.product_code||''} placeholder="e.g. royal-garnet-ring (defaults to SKU)"/>
    </label>
    <label>Metal*
      <select name="metal" value={metal} onChange={e=>setMetal(e.target.value)}>
        <option value="Gold">Gold</option>
        <option value="Silver">Silver</option>
        <option value="Platinum">Platinum</option>
      </select>
    </label>
    <label>Purity*
      <select name="purity" defaultValue={product?.purity||(metal==='Silver'?'925':'18K')}>
        <option value="18K">18K</option>
        <option value="22K">22K</option>
        <option value="24K">24K</option>
        <option value="14K">14K</option>
      </select>
    </label>
    <label>Pricing Mode*
      <select name="pricing_mode" value={pricingMode} onChange={e=>setPricingMode(e.target.value)}>
        <option value="GOLD_LINKED">GOLD_LINKED (Live metal rates)</option>
        <option value="FIXED">FIXED (Static selling price)</option>
      </select>
    </label>
    {pricingMode==='FIXED'?(
      <label>Fixed Selling Price (₹)*
        <input name="fixed_price" type="number" step="0.01" min="1" defaultValue={product?.fixed_price||''} placeholder="e.g. 24500" required/>
      </label>
    ):(
      <>
        <label>Making Charge (₹ flat)
          <input name="making_flat" type="number" step="0.01" min="0" defaultValue={product?.making_flat||0}/>
        </label>
        <label>Making Charge (%)
          <input name="making_percent" type="number" step="0.01" min="0" defaultValue={product?.making_percent||0}/>
        </label>
        <label>Stone Charge (₹)
          <input name="stone_charge" type="number" step="0.01" min="0" defaultValue={product?.stone_charge||0}/>
        </label>
        <label>Other Charge (₹)
          <input name="other_charge" type="number" step="0.01" min="0" defaultValue={product?.other_charge||0}/>
        </label>
      </>
    )}
    <label>Net Metal Weight (grams)*
      <input name="net_weight_g" type="number" step="0.001" min="0.001" defaultValue={product?.net_weight_g||''} placeholder="e.g. 3.500" required={pricingMode==='GOLD_LINKED'}/>
    </label>
    <label>Size / Dimensions
      <input name="size" defaultValue={product?.size||''} placeholder="e.g. 14, Medium, 42 cm"/>
    </label>
    <label>Finish
      <input name="finish" defaultValue={product?.finish||'Gold'} placeholder="e.g. Gold, High Polish, Matte"/>
    </label>
    <label>Stock snapshot*
      <input name="stock" type="number" min="0" defaultValue={product?.stock??10} required/>
    </label>
  </CatalogueEditForm>;
  return modal?<Modal title="Add New Product" onClose={onClose}>{form}</Modal>:form;
}

function AdminCatalogueList({items,label,resetKey,renderRow}){
  const pagination=usePagination(items,resetKey);
  return <div className="admin-panel"><div className="panel-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'16px'}}><div><h3 style={{margin:0}}>All {label} ({items.length})</h3><span className="small muted">Total {label==='Products'?'variants':'coins'}: {items.length} · In stock: {items.filter(p=>p.stock>0).length} · Out of stock: {items.filter(p=>p.stock===0).length}</span></div><div style={{display:'flex',gap:'10px',alignItems:'center'}}><span className="status-badge">{items.length} Items Listed</span></div></div><div className="table-wrap"><table><thead><tr><th>Piece / SKU</th><th>Pricing</th><th>Weight</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>{pagination.items.map(renderRow)}{!items.length&&<tr><td colSpan="6" className="empty" style={{textAlign:'center',padding:'30px'}}><p style={{margin:0}}>No {label.toLowerCase()} matched the current filters.</p></td></tr>}</tbody></table></div><Pagination pagination={pagination} label={label}/></div>;
}

function AdminCatalogueRow({item,details,pricing,weight,actions,children}){
  return <><tr>
    <td><div style={{display:'flex',alignItems:'center',gap:'10px'}}>
      {item.image?<img src={coinImage(item.image,true)} alt={item.name} style={{width:'36px',height:'36px',objectFit:'cover',borderRadius:'3px',flexShrink:0}}/>:<div style={{width:'36px',height:'36px',background:'var(--paper)',display:'grid',placeItems:'center',borderRadius:'3px',flexShrink:0}}><ImageIcon size={16}/></div>}
      <div><strong>{item.name}</strong><small>{details}</small></div>
    </div></td>
    <td>{pricing}</td><td>{weight}</td><td>{item.stock}</td><td><Status text={item.status}/></td><td>{actions}</td>
  </tr>{children&&<tr><td colSpan="6"><div style={{background:'var(--ivory)',border:'1px solid var(--line)',padding:'20px',borderRadius:'4px',margin:'10px 0'}}>{children}</div></td></tr>}</>;
}

// Shared merchant editor for jewellery and coins. Domain fields are supplied as children.
function CatalogueEditForm({item,onSave,onClose,error,readonly=false,children,creating=false}){
  const [photo,setPhoto]=useState(item?.image||''),[kind,setKind]=useState(item?.image_kind||'photo');
  const [photoBusy,setPhotoBusy]=useState(false),[saving,setSaving]=useState(false);
  async function submit(e){
    e.preventDefault();
    if(saving||photoBusy||readonly)return;
    setSaving(true);
    try{await onSave(e)}finally{setSaving(false)}
  }
  return <form className="catalogue-edit-form" onSubmit={submit}>
    <fieldset disabled={readonly||saving}>
      <div className="form-grid">
        <label>Name<input name="name" defaultValue={item?.name||''} required maxLength={200}/></label>
        <label>Status<select name="status" defaultValue={item?.status||'published'}><option>published</option><option>draft</option></select></label>
        {children}
        <PhotoPicker value={photo} onChange={setPhoto} kind={kind} onKindChange={setKind} disabled={readonly||saving} onBusyChange={setPhotoBusy}/>
        <label className="span-two">Description<textarea name="description" defaultValue={item?.description||''} rows="3" maxLength={5000}/></label>
      </div>
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="catalogue-edit-actions">
        <button type="submit" className="button dark small-button" disabled={photoBusy||saving}>{saving?'Saving…':creating?'Create item':'Save changes'}</button>
        <button type="button" className="text-button" onClick={onClose}>Cancel</button>
      </div>
    </fieldset>
  </form>;
}

function ProductRow({p,readonly,refresh,onDelete}){
  const {refreshCatalogue}=useStore();
  const [editing,setEditing]=useState(false),[error,setError]=useState('');
  async function save(e){
    const body=Object.fromEntries(new FormData(e.target));
    try{
      await api('/admin/products/'+encodeURIComponent(p.sku),body,'PATCH');
      setEditing(false);
      await refresh();
      await refreshCatalogue({notify:true});
    }catch(e){setError(e.message)}
  }
  return <AdminCatalogueRow item={p} details={`${p.sku} · ${p.product_code}`}
    pricing={<>{p.pricing_mode==='GOLD_LINKED'?<span className="coin-badge gold">GOLD_LINKED</span>:<span className="status-badge">FIXED</span>}<small>{p.pricing_mode==='FIXED'?money(p.fixed_price):`${p.purity} · Live Rate`}</small></>}
    weight={<>{p.net_weight_g} g</>}
    actions={<div style={{display:'flex',gap:'10px',alignItems:'center'}}>
      <button className="underlink" disabled={readonly} onClick={()=>{setError('');setEditing(!editing)}}>{editing?'Close':'Edit'}</button>
      {onDelete&&<button className="text-button" disabled={readonly} style={{color:'#a83232',padding:0}} onClick={onDelete} title="Delete product"><Trash2 size={14}/></button>}
    </div>}
  >{editing&&<>
    <CatalogueEditForm item={p} onSave={save} onClose={()=>setEditing(false)} error={error} readonly={readonly}/>
    <ProductAngleManager product={p} readonly={readonly} refreshParent={refresh}/>
  </>}</AdminCatalogueRow>;
}
function SettingsAdmin({data,refresh,readonly,owner=false}){
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
              ? 'Feed synchronization and live rate fetches are halted. No external requests or market rate updates will be made until started.'
              : 'Feed synchronization and live gold spot rate updates are active.'}
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
    {owner&&<StaffAccess/>}
  </div>;
}
const FeedSettings=SettingsAdmin;
function Rules({rule,readonly,refresh}){
 const {refreshCatalogue}=useStore();
 const [value,setValue]=useState({...rule,margin_type:rule.margin_type||'PERCENT',margin_value:rule.margin_value??0});
 const [changes,setChanges]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const set=(key,v)=>{setValue(s=>({...s,[key]:v}));setChanges(null);setMessage('');};
 async function preview(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{setChanges(await api('/admin/rules/preview',value));}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function publish(){setBusy(true);setError('');try{await api('/admin/rules',value);await refresh();await refreshCatalogue({notify:true});setChanges(null);setMessage('Pricing rule saved. Storefront prices have been refreshed.');}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="admin-panel rules">
  <h3>Margin, tax & rounding</h3>
  <p className="formula">Base subtotal + margin − applicable offers → tax treatment → rounding</p>
  <p>Choose a fixed rupee amount per piece or a percentage of the base subtotal. Margin applies to jewellery and coins, including fixed-price pieces. Gold-linked base subtotal includes metal, making, stones and other charges. Making-charge offers discount only making charges.</p>
  <form onSubmit={preview}><div className="form-grid">
   <label>Margin type<select value={value.margin_type} onChange={e=>set('margin_type',e.target.value)} disabled={readonly||busy}><option value="FIXED">Fixed amount (₹ per piece)</option><option value="PERCENT">Percentage of base subtotal (%)</option></select></label>
   <label>{value.margin_type==='FIXED'?'Fixed margin (₹ per piece)':'Margin percentage (%)'}<input type="number" step="0.01" min="0" max={value.margin_type==='PERCENT'?1000:999999999.99} value={value.margin_value} onChange={e=>set('margin_value',e.target.value)} disabled={readonly||busy} required/></label>
   <label>Tax percentage<input type="number" step="0.01" min="0" max="100" value={value.tax_percent} onChange={e=>set('tax_percent',e.target.value)} disabled={readonly||busy} required/></label>
   <label>Tax treatment<select value={value.tax_treatment} onChange={e=>set('tax_treatment',e.target.value)} disabled={readonly||busy}><option value="exclusive">Add tax to subtotal</option><option value="inclusive">Subtotal includes tax</option></select></label>
   <label>Round final linked price to<select value={value.rounding} onChange={e=>set('rounding',e.target.value)} disabled={readonly||busy}><option value="0.01">₹0.01</option><option value="1">₹1</option><option value="10">₹10</option><option value="100">₹100</option></select></label>
  </div><p className="small muted">A ₹10,000 base plus ₹500 fixed margin becomes ₹10,500; a 10% margin becomes ₹11,000 before other applicable adjustments. Fixed-price pieces already have a merchant selling price: margin is added to it without applying tax a second time. Zero margin keeps existing prices unchanged.</p>
  {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
  <button className="button dark" disabled={readonly||busy}>{busy?'Please wait…':'Preview price changes'}<Eye size={16}/></button></form>
  {changes&&<><div className="table-wrap"><table><thead><tr><th>Piece / SKU</th><th>Old price</th><th>Margin</th><th>New price</th></tr></thead><tbody>{changes.map(c=><tr key={c.sku}><td>{c.name}<small>{c.sku} · {c.kind}</small></td><td>{c.before===null?'Awaiting rate':money(c.before)}</td><td>{c.margin===null?'—':money(c.margin)}</td><td>{c.after===null?'Awaiting rate':money(c.after)}</td></tr>)}</tbody></table></div><button className="button dark" disabled={readonly||busy} onClick={publish}>Confirm pricing rule <Check size={16}/></button></>}
 </div>;
}

function CoinsAdmin({readonly,refreshParent}){
  const {refreshCatalogue}=useStore();
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[subTab,setSubTab]=useState('all');
  const [editingCoin,setEditingCoin]=useState(null),[addingCoin,setAddingCoin]=useState(false);
  const [silverInput,setSilverInput]=useState(''),[editingSilver,setEditingSilver]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [search,setSearch]=useState('');
  const [stockFilter,setStockFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [pricingFilter,setPricingFilter]=useState('all');

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
      await refreshCatalogue({notify:true});
    }catch(e){setError(e.message)}
  }

  async function deleteCoin(sku){
    if(!window.confirm(`Are you sure you want to delete coin SKU ${sku}?`))return;
    try{
      await api('/admin/coins/'+sku,{},'DELETE');
      await load();
      if(refreshParent)await refreshParent();
      await refreshCatalogue({notify:true});
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
    if(subTab==='gold'&&(c.metal||'').toLowerCase()!=='gold'&&!(c.coin_type||'').toLowerCase().includes('gold'))return false;
    if(subTab==='silver'&&(c.metal||'').toLowerCase()!=='silver'&&!(c.coin_type||'').toLowerCase().includes('silver'))return false;
    if(search.trim()){
      const q=search.toLowerCase().trim();
      const match=(c.name||'').toLowerCase().includes(q)||
                  (c.sku||'').toLowerCase().includes(q)||
                  (c.coin_type||'').toLowerCase().includes(q)||
                  (c.purity||'').toLowerCase().includes(q)||
                  (c.metal||'').toLowerCase().includes(q)||
                  String(c.weight_g||'').includes(q)||
                  (c.description||'').toLowerCase().includes(q);
      if(!match)return false;
    }
    if(stockFilter==='instock'&&c.stock<=0)return false;
    if(stockFilter==='outofstock'&&c.stock>0)return false;
    if(statusFilter!=='all'&&c.status!==statusFilter)return false;
    if(pricingFilter!=='all'&&c.pricing_mode!==pricingFilter)return false;
    return true;
  });

  const hasActiveFilters=search.trim()||stockFilter!=='all'||statusFilter!=='all'||pricingFilter!=='all'||subTab!=='all';

  function resetFilters(){
    setSearch('');
    setStockFilter('all');
    setStatusFilter('all');
    setPricingFilter('all');
    setSubTab('all');
  }

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
        <button className="button dark small-button" disabled={readonly} onClick={()=>{setEditingCoin(null);setError('');setAddingCoin(true)}}><Plus size={14}/> Add Coin</button>
        <a className="underlink" href="/api/admin/export/coins" download style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><Download size={14}/>Export Coins CSV</a>
      </div>
    </div>

    {/* Filter and Search Bar */}
    <div className="admin-filter-bar">
      <div className="search-box">
        <Search size={14}/>
        <input type="text" placeholder="Search coins by name, SKU, metal, weight…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter coins by status">
        <option value="all">All Statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <select className="filter-select" value={stockFilter} onChange={e=>setStockFilter(e.target.value)} aria-label="Filter coins by stock">
        <option value="all">All Stock</option>
        <option value="instock">In Stock ({coins.filter(c=>c.stock>0).length})</option>
        <option value="outofstock">Out of Stock ({coins.filter(c=>c.stock===0).length})</option>
      </select>

      <select className="filter-select" value={pricingFilter} onChange={e=>setPricingFilter(e.target.value)} aria-label="Filter coins by pricing mode">
        <option value="all">All Pricing</option>
        <option value="METAL_LINKED">Metal Linked</option>
        <option value="FIXED">Fixed Price</option>
      </select>

      {hasActiveFilters&&<button type="button" className="reset-filter-btn" onClick={resetFilters}><RotateCcw size={13}/> Reset</button>}
    </div>

    {error&&<p className="error">{error}</p>}

    <details className="advanced-media" style={{marginBottom:'16px'}}>
      <summary>Manage multiple coin photos (optional)</summary>
      <ImageUploader products={coins.map(c=>({...c,product_code:c.sku}))} refreshParent={async()=>{await load();if(refreshParent)await refreshParent();}}/>
    </details>

    <AdminCatalogueList items={filteredCoins} label="Coins" resetKey={`${subTab}-${search}-${stockFilter}-${statusFilter}-${pricingFilter}`} renderRow={c=><AdminCatalogueRow key={c.sku} item={c}
      details={<>{c.sku} · {c.coin_type}</>}
      pricing={<><span className={'coin-badge '+(c.metal==='Silver'?'silver':'gold')}>{c.metal}</span><small>{c.purity} · Live Rate</small><strong>{c.calculated_price!=null?money(c.calculated_price):'Awaiting rate'}</strong>{c.breakdown&&<small>Metal {money(c.breakdown.metal)} + Making {money(c.breakdown.making)}</small>}<small>Making charge: {money(c.making_charge)}</small></>}
      weight={<>{Number(c.weight_g).toFixed(3)} g<small>{c.dimension||'Standard round'}</small></>}
      actions={<div style={{display:'flex',gap:'10px',alignItems:'center'}}><button className="underlink" disabled={readonly} onClick={()=>{setError('');setEditingCoin(editingCoin?.sku===c.sku?null:c)}}>{editingCoin?.sku===c.sku?'Close':'Edit'}</button><button className="text-button" disabled={readonly} style={{color:'#a83232',padding:0}} onClick={()=>deleteCoin(c.sku)} title="Delete coin"><Trash2 size={14}/></button></div>}
    >{editingCoin?.sku===c.sku&&<>
      <CoinForm key={c.sku} coin={editingCoin} error={error} onClose={()=>setEditingCoin(null)} onSave={saveCoin}/>
      <ProductAngleManager
        product={editingCoin}
        readonly={readonly}
        refreshParent={async()=>{
          try{
            const res=await api('/admin/coins');
            setData(res);
            const fresh=(res.coins||[]).find(x=>x.sku===editingCoin.sku);
            if(fresh)setEditingCoin(fresh);
            if(refreshParent)await refreshParent();
          }catch(err){setError(err.message);}
        }}
      />
    </>}</AdminCatalogueRow>}/>

    <ImportPanel kind="coins" readonly={readonly} refresh={async()=>{await load();await refreshParent?.();await refreshCatalogue({notify:true})}}/>
    {/* New coins use a dialog; existing coins edit beneath their row. */}
    {addingCoin&&<CoinForm
      modal
      error={error}
      onClose={()=>{setAddingCoin(false);setEditingCoin(null);}}
      onSave={saveCoin}
      handleImageUpload={handleImageUpload}
      uploading={uploading}
    />}
  </div>;
}

function CoinForm({coin,onClose,onSave,error,modal=false}){
  const [metal,setMetal]=useState(coin?.metal||'Gold');
  const [pricingMode,setPricingMode]=useState(coin?.pricing_mode||'METAL_LINKED');
  const form=<CatalogueEditForm item={coin} onSave={onSave} onClose={onClose} error={error} creating={!coin}>
        <label>SKU (Unique identifier)*
          <input name="sku" defaultValue={coin?.sku||''} placeholder="e.g. COIN-AU-2G" required disabled={!!coin}/>
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
    </CatalogueEditForm>;
  return modal?<Modal title="Add New Coin" onClose={onClose}>{form}</Modal>:form;
}

function OffersAdmin({readonly,refreshParent}){
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
          Configure Mia-by-Tanishq styled festive offer badges, making charge discounts (% OFF ON MC), announcement bars, and in-grid promo cards. Applies across Jewellery Products & Bullion Coins.
        </p>
      </div>
      <button
        className="button dark"
        disabled={readonly}
        onClick={()=>setIsCreating(true)}
      >
        <Plus size={16}/> Create Promotional Offer
      </button>
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
        <small>{bannerOffer?bannerOffer.name:'No banner selected'}</small>
      </div>
      <div className="stat">
        <span className="eyebrow">APPLIES ACROSS</span>
        <strong>All & Coins</strong>
        <small>Products, Bullion & Categories</small>
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
        <button className="button dark" disabled={readonly} onClick={()=>setIsCreating(true)}>+ Create Offer</button>
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
                <small style={{color:'var(--muted)'}}>{o.code?`Code: ${o.code}`:'Auto-applied (No code)'} · Priority: {o.priority}</small>
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
                  {o.applies_to==='all'&&'All (Products & Coins)'}
                  {o.applies_to==='products'&&'Jewellery Only'}
                  {o.applies_to==='coins'&&'Coins Only'}
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
      if(offer){
        await api(`/admin/offers/${offer.id}`,payload,'PATCH');
      }else{
        await api('/admin/offers',payload,'POST');
      }
      onSaved();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }

  return <Modal title={offer?`Edit Offer: ${offer.name}`:'Create Promotional Offer'} onClose={onClose}>
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

        <label>Promo Code (Optional)
          <input name="code" defaultValue={offer?.code||''} placeholder="e.g. FESTIVE50 (Leave blank for auto-applied)"/>
        </label>
        <label>Starts
          <input name="starts_at" type="datetime-local" defaultValue={offer?.starts_at?offer.starts_at.slice(0,16):''}/>
        </label>
        <label>Ends
          <input name="ends_at" type="datetime-local" defaultValue={offer?.ends_at?offer.ends_at.slice(0,16):''}/>
        </label>
        <label className="span-two">Checkout code
          <input type="hidden" name="code_required" value="0"/>
          <span className="small"><input type="checkbox" name="code_required" value="1" defaultChecked={Boolean(offer?.code_required)}/> Require the promo code before this discount applies. Leave unchecked to keep showing it automatically.</span>
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
            <option value="all">All (Jewellery Products + Coins)</option>
            <option value="products">Jewellery Products Only</option>
            <option value="coins">Bullion Coins Only</option>
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
            Display in top announcement bar
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
          {busy?'Saving…':offer?'Save Changes':'Publish Offer'} <Check size={16}/>
        </button>
      </div>
    </form>
  </Modal>;
}

function CoinsPage(){
  const [coins,setCoins]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const {category='all'}=useParams();
  const [params,setParams]=useSearchParams();
  const {add,catalogueRevision,offers=[]}=useStore();
  const gridOffer=offers.find(o=>o.show_in_grid)||offers[0];

  useEffect(()=>{
    document.title='Gold & Silver Coins | Veyora Jewels';
    setError('');api('/coins').then(rows=>{setCoins(rows)}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[catalogueRevision]);

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
      <p>Explore the gold and silver coin catalogue. Confirm the manufacturer, listed purity, packaging and supporting documentation with the merchant before ordering.</p>
      
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
            <strong>Listed metal & purity</strong>
            <p className="muted" style={{margin:0,fontSize:'10px'}}>24K 999 Pure Gold & 999 Fine Silver</p>
          </div>
        </div>
        <div className="coin-trust-item">
          <Package size={24}/>
          <div>
            <strong>Packaging details</strong>
            <p className="muted" style={{margin:0,fontSize:'10px'}}>Confirm supplied packaging with the merchant</p>
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
        {items.map((c,idx)=><React.Fragment key={c.sku}>
          {idx===2&&gridOffer&&<FestiveGridBanner offer={gridOffer}/>}
          <article className="product-card">
            <Link to={'/coins/product/'+encodeURIComponent(c.sku)} className="product-photo coin-photo-button" aria-label={`View ${c.name}`} style={{cursor:'pointer',position:'relative'}}>
              {c.offer?.badge_text&&<span className="offer-ribbon-badge">{c.offer.badge_text}</span>}
              {c.image?<ListingImage product={c}/>:<div style={{height:'100%',display:'grid',placeItems:'center',background:'var(--paper)'}}><CoinsIcon size={48} color="var(--gold)"/></div>}
              <span className={'product-label '+(c.metal==='Silver'?'':'gold')}>{`${c.purity} ${c.metal.toUpperCase()}`}</span>
            </Link>
            <CardInfo product={c} href={'/coins/product/'+encodeURIComponent(c.sku)}
              specifications={`${c.weight_g}g · ${c.purity} ${c.metal}${c.dimension?` · ${c.dimension}`:''}`}
              price={c.price!==null?money(c.price):'Price awaiting rate'}
              note={c.breakdown&&<span className="price-suffix">Metal {money(c.breakdown.metal)} + Making {money(c.breakdown.making)}</span>}
              action={<button type="button" className="button dark product-card-cart" disabled={!c.checkout_available}
                onClick={()=>add({sku:c.sku,name:c.name,image:c.image,price:c.price,stock:c.stock,size:`${c.weight_g}g (${c.purity})`,slug:'coins'})}>
                {c.stock===0?'Out of stock':!c.checkout_available?'Awaiting live rate':'Add to bag'}<ShoppingBag size={14}/>
              </button>}/>

          </article>
        </React.Fragment>)}
      </div>:<div className="empty">
        <CoinsIcon size={36}/>
        <h2>No coins found</h2>
        <p>Try clearing filters or view all coins.</p>
        <Link className="button dark" to="/coins">View all coins</Link>
      </div>}
    </section>

  </Layout>;
}

function CoinProduct(){
  const {sku}=useParams();
  const navigate=useNavigate();
  const {add,catalogueRevision}=useStore();
  const [coins,setCoins]=useState([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    setError('');
    api('/coins').then(rows=>{if(active)setCoins(rows)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[catalogueRevision,retry]);
  const p=coins.find(c=>c.sku===sku)||null;
  const weights=p?coins.filter(c=>c.metal===p.metal&&c.purity===p.purity&&c.coin_type===p.coin_type).sort((a,b)=>Number(a.weight_g)-Number(b.weight_g)):[];
  useEffect(()=>{document.title=(p?.name||(loading?'Loading coin':error?'Could not load coin':'Coin not found'))+' | Veyora Jewels'},[p,loading,error]);
  if(loading||error||!p)return <Layout><section className="empty"><h1>{loading?'Finding your coin…':error?'Could not load this coin':'Coin not found'}</h1>{error&&<><p className="error" role="alert">{error}</p><button className="button dark" onClick={()=>setRetry(n=>n+1)}>Try again</button></>}<Link className="underlink" to="/coins">Back to coins</Link></section></Layout>;
  const photos=galleryPhotos(p.images);
  const angleImages=(photos.length?photos:galleryPhotos([{id:'default',role:'hero',url:p.image,alt_text:p.name}])).map(img=>({...img,url:coinImage(img.url)||img.url})).filter(img=>img.url);
  const caption=angleImages.length>1?'MULTI-ANGLE PHOTOGRAPHY · PREVIEW CATALOGUE':p.image_kind==='illustration'?'ILLUSTRATIVE IMAGE · PREVIEW CATALOGUE':'PRODUCT IMAGE · PREVIEW CATALOGUE';
  return <Layout><StructuredProduct p={p}/><div className="breadcrumbs section"><Link to="/coins">Coins</Link><span>/</span><Link to={'/coins/'+p.metal.toLowerCase()}>{p.metal} coins</Link><span>/</span><span>{p.name}</span></div>
    <section className="product-detail section">
      {angleImages.length?<ProductMagicZoom images={angleImages} title={`${p.name}, ${p.weight_g}g, ${p.purity} ${p.metal}`}><p className="caption">{caption}</p></ProductMagicZoom>:<div className="detail-gallery"><div className="detail-image" style={{minHeight:300,display:'grid',placeItems:'center'}}><CoinsIcon size={64}/></div><p className="caption">{caption}</p></div>}
      <div className="detail-copy">
        <span className="eyebrow">THE COIN COLLECTION</span>
        <h1>{p.name}</h1>
        <p className="material-line">{p.purity} {p.metal} · {p.weight_g} g</p>
        <div className="pdp-rating-row" style={{marginBottom:'10px'}}><RatingBadge rating={p.rating_average} count={p.rating_count} showEmpty={true} size="md" onClick={()=>{const el=document.getElementById('reviews');if(el)el.scrollIntoView({behavior:'smooth'});}}/></div>
        <div className="detail-price">{p.original_price&&p.original_price>p.price?<div className="price-row" style={{alignItems:'baseline',gap:'10px',margin:0}}><span className="discounted-price" style={{fontSize:'26px'}}>{money(p.price)}</span><del className="original-price-del" style={{fontSize:'16px'}}>{money(p.original_price)}</del>{p.discount_amount>0&&<span className="offer-save-tag">SAVE {money(p.discount_amount)}</span>}</div>:p.price===null?'Awaiting approved rate':money(p.price)}</div>
        {p.offer&&<div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}><span className="offer-ribbon-badge" style={{position:'static',clipPath:'none',borderRadius:'2px',padding:'4px 10px',fontSize:'10px',boxShadow:'none'}}>✦ {p.offer.name}: {p.offer.badge_text}</span>{p.offer.code&&<span className="status-badge" style={{fontSize:'9px'}}>CODE: {p.offer.code}</span>}</div>}
        <div style={{marginTop:'6px'}}><span className="gold-linked-pill"><Sparkles size={12}/> Live Metal-Linked Rate</span></div>
        <p className="small muted">Preview price · Shipping calculated before payment</p>
        <p className="detail-description">{p.description}</p>
        <div className="size-label"><label htmlFor="coin-weight">Weight</label></div>
        <select id="coin-weight" value={p.sku} onChange={e=>navigate('/coins/product/'+encodeURIComponent(e.target.value))}>{weights.map(c=><option key={c.sku} value={c.sku}>{c.weight_g} g{c.stock===0?' — Out of stock':''}</option>)}</select>
        <p className={'stock '+(!p.checkout_available?'unavailable':'')}><span/>{p.stock===0?'Currently out of stock':!p.checkout_available?'Awaiting a fresh verified metal rate':`${p.stock} available · Ready for your next chapter`}</p>
        <div className="add-row"><button className="button dark" disabled={!p.checkout_available} onClick={()=>add({...p,size:`${p.weight_g}g (${p.purity})`,slug:'coins'})}>{p.checkout_available?'Add to cart':p.stock===0?'Out of stock':'Currently unavailable'}<ShoppingBag size={18}/></button></div>
        <dl className="specs"><div><dt>Metal & purity</dt><dd>{p.metal}, {p.purity}</dd></div><div><dt>Net metal weight</dt><dd>{Number(p.weight_g).toFixed(3)} g</dd></div>{p.dimension&&<div><dt>Dimensions</dt><dd>{p.dimension}</dd></div>}<div><dt>SKU</dt><dd>{p.sku}</dd></div></dl>
        <details><summary>Price details <Plus size={15}/></summary>{p.breakdown?<div className="breakdown">{[
          ['Metal value',p.breakdown.metal],
          p.breakdown.original_making!==undefined&&p.breakdown.original_making!==p.breakdown.making?['Original minting & packaging',p.breakdown.original_making]:null,
          p.breakdown.discount_amount>0?['Festive offer savings',-p.breakdown.discount_amount]:null,
          ['Minting & packaging',p.breakdown.making],['Margin',p.breakdown.margin||0],['Tax',p.breakdown.tax||0],['Total',p.price]
        ].filter(Boolean).map(([label,value])=><p key={label} style={value<0?{color:'#2e7d32',fontWeight:600}:{}}><span>{label}</span>{value<0?`-${money(Math.abs(value))}`:money(value)}</p>)}</div>:<p>Pricing is awaiting an approved metal rate.</p>}</details>
        <details><summary>Delivery & returns <Plus size={15}/></summary><p>Delivery and return policies are awaiting merchant details. <Link to="/information/shipping">View current information</Link>.</p></details>
      </div>
    </section>
    <ProductReviewsSection product={{...p,product_code:p.sku}}/>
  </Layout>;
}

function NotFound(){return <Layout><section className="empty"><span className="eyebrow">A SMALL DETOUR</span><h1>This page is yet to be discovered.</h1><p>The link you followed may have changed, or the piece may have moved.</p><div style={{display:'flex',gap:'14px',justifyContent:'center',flexWrap:'wrap',marginTop:'20px'}}><Link className="button dark" to="/collections/all">Explore all jewellery</Link><Link className="underlink" to="/">Return to home</Link></div></section></Layout>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Provider><Scroll/><Routes><Route path="/" element={<Home/>}/><Route path="/collections/:category" element={<Collection/>}/><Route path="/products/:slug" element={<Product/>}/><Route path="/coins/product/:sku" element={<CoinProduct/>}/><Route path="/coins" element={<CoinsPage/>}/> <Route path="/coins/:category" element={<CoinsPage/>}/><Route path="/account" element={<Account Layout={Layout} BagLines={BagLines} ProductCard={ProductCard} grouped={grouped}/>}/><Route path="/bag" element={<Bag/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/order/:id" element={<Order/>}/><Route path="/information/:page" element={<Information/>}/><Route path="/admin/*" element={<Admin/>}/><Route path="*" element={<NotFound/>}/></Routes></Provider></BrowserRouter>);
