import React, {useRef} from 'react';
import {X} from 'lucide-react';
import useScrollLock from '../useScrollLock.js';

export default function Modal({title,children,onClose}){const el=useRef();useScrollLock(true,el,{onEscape:onClose,trapFocus:true});return <div className="modal-backdrop" onClick={onClose}><section ref={el} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{title}</h2><button className="icon" aria-label="Close dialog" onClick={onClose}><X/></button></div>{children}</section></div>}
