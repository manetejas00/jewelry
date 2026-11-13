import {brandedImageSource} from './brand-media.js';
import BrandedImage from './BrandedImage.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowLeft,ArrowRight} from 'lucide-react';
const asset=name=>'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/'+encodeURIComponent(name)+'.png';
const videoSrc='https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4';
const banners=[
 {image:'Pearls Collection',video:true,eyebrow:'THE PEARL EDIT · CHAPTER 01',title:'Quiet beauty.',lead:'Lasting ',emphasis:'impressions.',copy:<>A little light. A quiet statement.<br/>Jewellery that feels unmistakably you.</>,to:'/collections/pearls',cta:'Shop the collection',alt:'Pearl jewellery campaign'},
 {image:'Fine Jewelry Collection',eyebrow:'THE EVERYDAY EDIT · CHAPTER 02',title:'Little details.',lead:'Extraordinary ',emphasis:'days.',copy:<>Find a piece that becomes part of your story.<br/>Considered jewellery for every chapter.</>,to:'/collections/all',cta:'Explore all jewellery',alt:'Fine jewellery collection'},
 {image:'Lune Pearl Drop',eyebrow:'SOMETHING TO TREASURE · CHAPTER 03',title:'A little light.',lead:'A lasting ',emphasis:'connection.',copy:<>For someone you love. Including yourself.<br/>Discover your next favourite piece.</>,to:'/collections/pearls',cta:'Discover the Pearl Edit',alt:'Pearl drop earring'},
 {image:'Eclipse Ring',eyebrow:'YOUR EVERYDAY SIGNATURE · CHAPTER 04',title:'Worn close.',lead:'Kept ',emphasis:'simple.',copy:<>The ring you reach for without thinking.<br/>A signature for every day.</>,to:'/collections/rings',cta:'Shop rings',alt:'Eclipse pearl ring'}
];
export default function HeroBanner({heroRef}){
 const indexRef=useRef(0);
 const video=useRef(null);
 const [index,setIndex]=useState(0);
 const [previous,setPrevious]=useState(0);
 const [incoming,setIncoming]=useState(false);
 const [reduce]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const banner=banners[index];
 const film=index===0&&banner.video&&!reduce;
 const total=String(banners.length).padStart(2,'0');
 useEffect(()=>{
  const el=video.current;
  if(!el)return;
  el.muted=true;
  if(!film){el.pause();return;}
  let stop=false;
  const start=()=>{if(!stop)el.play().catch(()=>{})};
  if(el.readyState>=2)start();
  else el.addEventListener('loadeddata',start);
  return()=>{stop=true;el.removeEventListener('loadeddata',start)};
 },[film]);
 const go=step=>{
  const current=indexRef.current;
  const next=(current+step+banners.length)%banners.length;
  if(next===current)return;
  indexRef.current=next;
  setPrevious(current);
  setIncoming(true);
  setIndex(next);
 };
 return <section className="hero" ref={heroRef} aria-roledescription="carousel" aria-label="Homepage banners"><div className="hero-photo">{banners.map((slide,i)=>{const active=i===index;const classes=[active?'is-active':'',active&&incoming?'is-incoming':'',!active&&i===previous?'is-prev':''].filter(Boolean).join(' ');return <BrandedImage key={slide.image} className={classes} src={asset(slide.image)} alt={active&&!(slide.video&&film)?slide.alt:''} aria-hidden={active&&!(slide.video&&film)?undefined:true} fetchPriority={i===0?'high':'low'} decoding="async"/>;})}{!reduce&&<video ref={video} className={film?'is-active':''} src={videoSrc} poster={brandedImageSource(asset(banners[0].image))} autoPlay muted loop playsInline preload="auto" aria-label={banners[0].alt} aria-hidden={film?undefined:true}/>}<div className="image-grain"/></div><div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/>{banner.eyebrow}</div><h1>{banner.title}<br/>{banner.lead}<em>{banner.emphasis}</em></h1><p>{banner.copy}</p><Link className="button light" to={banner.to}>{banner.cta} <ArrowUpRight size={18}/></Link><span className="hero-bottom">THE EXTRAORDINARY, IN THE EVERYDAY</span></div><div className="hero-index"><div aria-live="polite" aria-atomic="true">{String(index+1).padStart(2,'0')} <span>/ {total}</span></div><div className="hero-arrows"><button type="button" aria-label="Previous banner" onClick={()=>go(-1)}><ArrowLeft size={18}/></button><button type="button" aria-label="Next banner" onClick={()=>go(1)}><ArrowRight size={18}/></button></div></div><a className="hero-scroll" href="#collections">EXPLORE <span>↓</span></a></section>;
}
