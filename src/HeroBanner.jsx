import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
const asset=name=>'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/'+encodeURIComponent(name)+'.png';
const banners=[
 {image:'Pearls Collection',video:true,eyebrow:'THE PEARL EDIT · CHAPTER 01',title:'Quiet beauty.',lead:'Lasting ',emphasis:'impressions.',copy:<>A little light. A quiet statement.<br/>Jewellery that feels unmistakably you.</>,to:'/collections/pearls',cta:'Shop the collection',alt:'Pearl jewellery campaign'},
 {image:'Fine Jewelry Collection',eyebrow:'THE EVERYDAY EDIT · CHAPTER 02',title:'Little details.',lead:'Extraordinary ',emphasis:'days.',copy:<>Find a piece that becomes part of your story.<br/>Considered jewellery for every chapter.</>,to:'/collections/all',cta:'Explore all jewellery',alt:'Fine jewellery collection'},
 {image:'Pearls Collection',eyebrow:'SOMETHING TO TREASURE · CHAPTER 03',title:'A little light.',lead:'A lasting ',emphasis:'connection.',copy:<>For someone you love. Including yourself.<br/>Discover your next favourite piece.</>,to:'/collections/pearls',cta:'Discover the Pearl Edit',alt:'The Pearl Edit collection'}
];
let lastBanner=-1;
export default function HeroBanner({heroRef}){
 const [index]=useState(()=>{let previous=lastBanner;try{const saved=sessionStorage.getItem('veyora-hero-banner');if(saved!==null&&Number.isInteger(Number(saved)))previous=Number(saved)}catch{}return (previous+1)%banners.length});
 useEffect(()=>{lastBanner=index;try{sessionStorage.setItem('veyora-hero-banner',String(index))}catch{}},[index]);
 const banner=banners[index];
 return <section className="hero" ref={heroRef}><div className="hero-photo">{banner.video?<video autoPlay={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} muted loop playsInline poster={asset(banner.image)} aria-label={banner.alt}><source src="https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4" type="video/mp4"/></video>:<img src={asset(banner.image)} alt={banner.alt} fetchPriority="high"/>}<div className="image-grain"/></div><div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/>{banner.eyebrow}</div><h1>{banner.title}<br/>{banner.lead}<em>{banner.emphasis}</em></h1><p>{banner.copy}</p><Link className="button light" to={banner.to}>{banner.cta} <ArrowUpRight size={18}/></Link><span className="hero-bottom">THE EXTRAORDINARY, IN THE EVERYDAY</span></div><span className="hero-index">{String(index+1).padStart(2,'0')} <span>/ 03</span></span><a className="hero-scroll" href="#collections">EXPLORE <span>↓</span></a></section>;
}
