import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowLeft,ArrowRight} from 'lucide-react';
const asset=name=>'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/'+encodeURIComponent(name)+'.png';
const banners=[
 {image:'Pearls Collection',video:true,eyebrow:'THE PEARL EDIT · CHAPTER 01',title:'Quiet beauty.',lead:'Lasting ',emphasis:'impressions.',copy:<>A little light. A quiet statement.<br/>Jewellery that feels unmistakably you.</>,to:'/collections/pearls',cta:'Shop the collection',alt:'Pearl jewellery campaign'},
 {image:'Fine Jewelry Collection',eyebrow:'THE EVERYDAY EDIT · CHAPTER 02',title:'Little details.',lead:'Extraordinary ',emphasis:'days.',copy:<>Find a piece that becomes part of your story.<br/>Considered jewellery for every chapter.</>,to:'/collections/all',cta:'Explore all jewellery',alt:'Fine jewellery collection'},
 {image:'Lune Pearl Drop',eyebrow:'SOMETHING TO TREASURE · CHAPTER 03',title:'A little light.',lead:'A lasting ',emphasis:'connection.',copy:<>For someone you love. Including yourself.<br/>Discover your next favourite piece.</>,to:'/collections/pearls',cta:'Discover the Pearl Edit',alt:'Pearl drop earring'}
];
export default function HeroBanner({heroRef}){
 const [index,setIndex]=useState(0);
 const banner=banners[index];
 return <section className="hero" ref={heroRef}><div className="hero-photo">{banner.video?<video autoPlay={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} muted loop playsInline poster={asset(banner.image)} aria-label={banner.alt}><source src="https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4" type="video/mp4"/></video>:<img src={asset(banner.image)} alt={banner.alt} fetchPriority="high"/>}<div className="image-grain"/></div><div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/>{banner.eyebrow}</div><h1>{banner.title}<br/>{banner.lead}<em>{banner.emphasis}</em></h1><p>{banner.copy}</p><Link className="button light" to={banner.to}>{banner.cta} <ArrowUpRight size={18}/></Link><span className="hero-bottom">THE EXTRAORDINARY, IN THE EVERYDAY</span></div><div className="hero-index"><div aria-live="polite" aria-atomic="true">{String(index+1).padStart(2,'0')} <span>/ 03</span></div><div className="hero-arrows"><button type="button" aria-label="Previous banner" onClick={()=>setIndex(i=>(i+banners.length-1)%banners.length)}><ArrowLeft size={18}/></button><button type="button" aria-label="Next banner" onClick={()=>setIndex(i=>(i+1)%banners.length)}><ArrowRight size={18}/></button></div></div><a className="hero-scroll" href="#collections">EXPLORE <span>↓</span></a></section>;
}
