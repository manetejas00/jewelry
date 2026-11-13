import {useLayoutEffect,useRef} from 'react';
import {scrollLockManager} from './scroll-lock.js';
export default function useScrollLock(open, rootRef, {onEscape,trapFocus=false}={}) {
  const callback=useRef(onEscape);callback.current=onEscape;
  useLayoutEffect(()=>{
    if (!open) return undefined;
    return scrollLockManager()?.acquire({getRoot:()=>rootRef.current,trapFocus,onEscape:onEscape?()=>callback.current?.():undefined});
  },[Boolean(open),rootRef,trapFocus]);
}
