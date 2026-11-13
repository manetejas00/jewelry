import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScrollLockManager} from '../src/scroll-lock.js';
function fixture(){
 const listeners=new Map(),scrolls=[];
 function style(initial={}){const values=new Map(Object.entries(initial));return {getPropertyValue:k=>values.get(k)?.[0]||'',getPropertyPriority:k=>values.get(k)?.[1]||'',setProperty:(k,v,p='')=>values.set(k,[v,p]),removeProperty:k=>values.delete(k)}}
 const doc={activeElement:null,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 function node(parent=null,props={}){const n={nodeType:1,parentElement:parent,style:style(),scrollTop:0,scrollLeft:0,clientHeight:100,scrollHeight:100,clientWidth:100,scrollWidth:100,css:{overflowY:'visible',overflowX:'visible',paddingRight:'4px'},isConnected:true,attrs:{},contains(target){for(let p=target;p;p=p.parentElement)if(p===this)return true;return false},closest(selector){if(selector==='[data-scroll-lock-gesture]')return this.gesture?this:parent?.closest(selector);if(selector==='[inert]')return null;return this.interactive?this:null},querySelectorAll(){return this.focusables||[]},getClientRects:()=>[{}],hasAttribute(k){return k in this.attrs},setAttribute(k,v){this.attrs[k]=v},focus(){doc.activeElement=this},...props};return n;}
 doc.documentElement=node(null,{clientWidth:980});doc.body=node(doc.documentElement);doc.body.style=style({overflow:['auto','important'],position:['relative',''],width:['96%','']});doc.documentElement.style=style({overflow:['clip','']});
 const win={scrollX:7,scrollY:420,innerWidth:1000,innerHeight:800,getComputedStyle:n=>n.css,scrollTo:(x,y)=>scrolls.push([x,y])};
 const manager=createScrollLockManager(doc,win),root=node(doc.body),outside=node(doc.body);
 function fire(type,target,extra={}){const e={target,cancelable:true,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){this.stopped=true},...extra};listeners.get(type)?.(e);return e;}
 return {doc,win,manager,root,outside,node,fire,listeners,scrolls};
}
test('locks html and fixes body without moving the page; restores exact styles, priorities and coordinates',()=>{
 const f=fixture(),release=f.manager.acquire({getRoot:()=>f.root});assert.equal(f.doc.body.style.getPropertyValue('top'),'-420px');assert.equal(f.doc.body.style.getPropertyValue('padding-right'),'24px');assert.equal(f.doc.documentElement.style.getPropertyValue('overflow'),'hidden');release();assert.equal(f.doc.body.style.getPropertyValue('position'),'relative');assert.equal(f.doc.body.style.getPropertyValue('width'),'96%');assert.equal(f.doc.body.style.getPropertyValue('overflow'),'auto');assert.equal(f.doc.body.style.getPropertyPriority('overflow'),'important');assert.equal(f.doc.documentElement.style.getPropertyValue('overflow'),'clip');assert.deepEqual(f.scrolls,[[7,420]]);assert.equal(f.listeners.size,0);release();assert.equal(f.scrolls.length,1);
});
test('nested and concurrent owners never release another lock, including out-of-order unmount and strict effect remount',()=>{
 const f=fixture(),a=f.manager.acquire({getRoot:()=>f.root}),inner=f.node(f.root),b=f.manager.acquire({getRoot:()=>inner});assert.equal(f.manager.size,2);a();assert.equal(f.manager.size,1);assert.equal(f.doc.body.style.getPropertyValue('position'),'fixed');assert.equal(f.scrolls.length,0);b();assert.equal(f.manager.size,0);const c=f.manager.acquire({getRoot:()=>f.root});c();assert.equal(f.listeners.size,0);assert.equal(f.scrolls.length,2);
});
test('wheel and touch scroll only internal content with remaining room; stop boundary chaining and background gestures',()=>{
 const f=fixture(),scroller=f.node(f.root,{scrollHeight:400,scrollTop:50,css:{overflowY:'auto',overflowX:'visible'}});const done=f.manager.acquire({getRoot:()=>f.root});
 assert.equal(f.fire('wheel',f.outside,{deltaX:0,deltaY:30}).defaultPrevented,true);assert.equal(f.fire('wheel',scroller,{deltaX:0,deltaY:30}).defaultPrevented,false);scroller.scrollTop=300;assert.equal(f.fire('wheel',scroller,{deltaX:0,deltaY:30}).defaultPrevented,true);assert.equal(f.fire('wheel',scroller,{deltaX:0,deltaY:-30}).defaultPrevented,false);
 f.fire('touchstart',scroller,{touches:[{clientX:0,clientY:100}]});assert.equal(f.fire('touchmove',scroller,{touches:[{clientX:0,clientY:80}]}).defaultPrevented,true);
 f.fire('touchstart',scroller,{touches:[{clientX:0,clientY:80}]});assert.equal(f.fire('touchmove',scroller,{touches:[{clientX:0,clientY:100}]}).defaultPrevented,false);done();
});
test('top overlay owns Escape and keyboard focus; lower overlays cannot consume input',()=>{
 const f=fixture(),events=[];f.outside.focus();const a=f.manager.acquire({getRoot:()=>f.root,trapFocus:true,onEscape:()=>events.push('outer')});const inner=f.node(f.root),first=f.node(inner,{interactive:true}),last=f.node(inner,{interactive:true});inner.focusables=[first,last];const b=f.manager.acquire({getRoot:()=>inner,trapFocus:true,onEscape:()=>events.push('inner')});
 assert.equal(f.fire('keydown',inner,{key:'Escape'}).stopped,true);assert.deepEqual(events,['inner']);last.focus();f.fire('keydown',last,{key:'Tab'});assert.equal(f.doc.activeElement,first);assert.equal(f.fire('keydown',f.outside,{key:'PageDown'}).defaultPrevented,true);assert.equal(f.fire('keydown',first,{key:' '}).defaultPrevented,false);b();assert.equal(f.doc.activeElement,f.root);f.fire('keydown',f.root,{key:'Escape'});assert.deepEqual(events,['inner','outer']);a();assert.equal(f.doc.activeElement,f.outside);
});
test('horizontal thumbnail scrolling and explicit image zoom gestures remain usable',()=>{
 const f=fixture(),strip=f.node(f.root,{scrollWidth:400,scrollLeft:50,css:{overflowX:'auto',overflowY:'hidden'}}),stage=f.node(f.root,{gesture:true});const end=f.manager.acquire({getRoot:()=>f.root});assert.equal(f.fire('wheel',strip,{deltaX:20,deltaY:0}).defaultPrevented,false);assert.equal(f.fire('wheel',stage,{deltaX:0,deltaY:20}).defaultPrevented,false);f.fire('touchstart',stage,{touches:[{clientX:0,clientY:0}]});assert.equal(f.fire('touchmove',stage,{touches:[{clientX:10,clientY:10},{clientX:20,clientY:20}]}).defaultPrevented,false);end();
});
test('visual viewport changes constrain overlays above the keyboard and listeners/styles are cleaned up',()=>{
 const f=fixture(),events=new Map();f.win.visualViewport={height:500,offsetTop:20,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const end=f.manager.acquire({getRoot:()=>f.root});assert.equal(f.doc.documentElement.style.getPropertyValue('--overlay-viewport-height'),'500px');assert.equal(f.doc.documentElement.style.getPropertyValue('--overlay-viewport-bottom'),'280px');f.win.visualViewport.height=700;events.get('resize')();assert.equal(f.doc.documentElement.style.getPropertyValue('--overlay-viewport-height'),'700px');end();assert.equal(events.size,0);assert.equal(f.doc.documentElement.style.getPropertyValue('--overlay-viewport-height'),'');
});
test('normal pages are unchanged until an overlay acquires a lock',()=>{
 const f=fixture();assert.equal(f.manager.size,0);assert.equal(f.doc.body.style.getPropertyValue('position'),'relative');assert.equal(f.listeners.size,0);assert.equal(f.doc.documentElement.style.getPropertyValue('--overlay-viewport-height'),'');
});
