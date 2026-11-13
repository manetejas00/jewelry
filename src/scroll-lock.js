// One owner of page-level styles and input guards, regardless of overlay nesting.
// The factory also lets regression tests use an isolated DOM without a browser dependency.
export function createScrollLockManager(doc, win) {
  const locks = new Map();
  let restorePage, touch;
  const top = () => [...locks.values()].at(-1);
  const rootOf = entry => entry?.getRoot?.();
  const inside = (root, target) => Boolean(root && target && root.contains(target));
  const stop = event => {if (event.cancelable) event.preventDefault();};
  function canScroll(target, root, dx, dy) {
    if (!inside(root, target)) return false;
    for (let node = target.nodeType === 1 ? target : target.parentElement; node; node = node.parentElement) {
      const css = win.getComputedStyle(node);
      const y = /auto|scroll/.test(css.overflowY) && node.scrollHeight > node.clientHeight && ((dy < 0 && node.scrollTop > 0) || (dy > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1));
      const x = /auto|scroll/.test(css.overflowX) && node.scrollWidth > node.clientWidth && ((dx < 0 && node.scrollLeft > 0) || (dx > 0 && node.scrollLeft + node.clientWidth < node.scrollWidth - 1));
      if (Math.abs(dx) > Math.abs(dy) ? x : y) return true;
      if (node === root) break;
    }
    return false;
  }
  function gesture(target, root) {
    return inside(root, target) && Boolean(target.closest?.('[data-scroll-lock-gesture]'));
  }
  function wheel(event) {
    const root = rootOf(top());
    if (!gesture(event.target, root) && !canScroll(event.target, root, event.deltaX, event.deltaY)) stop(event);
  }
  function touchStart(event) {
    const point = event.touches[0];
    touch = point ? {x: point.clientX, y: point.clientY} : null;
  }
  function touchMove(event) {
    const root = rootOf(top()), point = event.touches[0];
    if (gesture(event.target, root)) return; // Image viewer owns pinch and pan.
    if (!touch || !point) {stop(event);return;}
    const dx = touch.x - point.clientX, dy = touch.y - point.clientY;
    touch = {x: point.clientX, y: point.clientY};
    if (event.touches.length > 1 ? !inside(root, event.target) : !canScroll(event.target, root, dx, dy)) stop(event);
  }
  const focusables = root => [...root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node => node.getClientRects().length && !node.closest('[inert]'));
  function keyDown(event) {
    const entry = top(), root = rootOf(entry);
    if (!root) return;
    if (event.key === 'Escape' && entry.onEscape) {
      event.preventDefault();event.stopImmediatePropagation();entry.onEscape();return;
    }
    if (event.key === 'Tab' && entry.trapFocus) {
      const nodes = focusables(root), first = nodes[0], last = nodes.at(-1);
      if (!nodes.length) {stop(event);root.focus({preventScroll:true});}
      else if (!inside(root, doc.activeElement) || (event.shiftKey ? doc.activeElement === first || doc.activeElement === root : doc.activeElement === last || doc.activeElement === root)) {
        stop(event);(event.shiftKey ? last : first).focus({preventScroll:true});
      }
      return;
    }
    const amount = {ArrowDown:40,ArrowUp:-40,PageDown:win.innerHeight,PageUp:-win.innerHeight,Home:-Infinity,End:Infinity,' ':event.shiftKey?-win.innerHeight:win.innerHeight}[event.key];
    if (amount == null) return;
    const target = event.target;
    if (inside(root,target) && target.closest?.('input,textarea,select,button,a,summary,[contenteditable="true"],[role="listbox"]')) return;
    if (!gesture(target,root) && !canScroll(target,root,0,amount)) stop(event);
  }
  function saveStyles(element, values) {
    const saved = Object.keys(values).map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
    for (const [name,value] of Object.entries(values)) element.style.setProperty(name,value);
    return () => {for (const [name,value,priority] of saved) value ? element.style.setProperty(name,value,priority) : element.style.removeProperty(name);};
  }
  function lockPage() {
    const x = win.scrollX, y = win.scrollY;
    const gap = Math.max(0, win.innerWidth - doc.documentElement.clientWidth);
    const padding = parseFloat(win.getComputedStyle(doc.body).paddingRight) || 0;
    const restoreHtml = saveStyles(doc.documentElement, {overflow:'hidden','overscroll-behavior':'none'});
    // Fixed body preserves the visual position and prevents iOS Safari background dragging.
    const restoreBody = saveStyles(doc.body, {overflow:'hidden',position:'fixed',top:`-${y}px`,left:`-${x}px`,width:'100%',...(gap ? {'padding-right':`${padding+gap}px`} : {})});
    for (const [type,handler] of [['wheel',wheel],['touchstart',touchStart],['touchmove',touchMove],['keydown',keyDown]]) doc.addEventListener(type,handler,{capture:true,passive:false});
    const viewportStyles = ['--overlay-viewport-height','--overlay-viewport-top','--overlay-viewport-bottom'].map(name=>[name,doc.documentElement.style.getPropertyValue(name),doc.documentElement.style.getPropertyPriority(name)]);
    const viewport = win.visualViewport;
    const updateViewport = () => {
      doc.documentElement.style.setProperty('--overlay-viewport-height',`${viewport?.height || win.innerHeight}px`);
      doc.documentElement.style.setProperty('--overlay-viewport-top',`${viewport?.offsetTop || 0}px`);
      doc.documentElement.style.setProperty('--overlay-viewport-bottom',`${Math.max(0,win.innerHeight-(viewport?.height || win.innerHeight)-(viewport?.offsetTop || 0))}px`);
    };
    updateViewport();
    viewport?.addEventListener('resize',updateViewport);
    viewport?.addEventListener('scroll',updateViewport);
    win.addEventListener?.('resize',updateViewport);
    restorePage = () => {
      viewport?.removeEventListener('resize',updateViewport);
      viewport?.removeEventListener('scroll',updateViewport);
      win.removeEventListener?.('resize',updateViewport);
      for(const [name,value,priority] of viewportStyles) value ? doc.documentElement.style.setProperty(name,value,priority) : doc.documentElement.style.removeProperty(name);
      restoreBody();restoreHtml();
      const restoreBehavior=saveStyles(doc.documentElement,{'scroll-behavior':'auto'});
      win.scrollTo(x,y);restoreBehavior();
      for (const [type,handler] of [['wheel',wheel],['touchstart',touchStart],['touchmove',touchMove],['keydown',keyDown]]) doc.removeEventListener(type,handler,true);
      touch=null;
    };
  }
  return {
    acquire(options) {
      const token = Symbol('overlay'), previous = doc.activeElement;
      if (!locks.size) lockPage();
      locks.set(token,options);
      const root = rootOf(options);
      if (options.trapFocus && root) {
        if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex','-1');
        root.focus({preventScroll:true});
      }
      let released=false;
      return () => {
        if (released) return;
        released=true;
        const wasTop=top()===options;
        locks.delete(token);
        if (!locks.size) {restorePage();restorePage=null;}
        if (wasTop && options.trapFocus && previous?.isConnected && (!locks.size || inside(rootOf(top()),previous))) previous.focus({preventScroll:true});
      };
    },
    isTop(root) {return rootOf(top()) === root;},
    get size() {return locks.size;}
  };
}
let manager;
export function scrollLockManager() {
  if (typeof document === 'undefined') return null;
  return manager ||= createScrollLockManager(document,window);
}
