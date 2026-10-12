import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

export default function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(<dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} aria-labelledby="modal-heading" onCancel={(e) => { e.preventDefault(); closeRef.current(); }} onClick={(e) => { if (e.target === ref.current) closeRef.current(); }}>
    <div className="modal-inner">
      <header className="modal-header"><h2 id="modal-heading">{title}</h2><button className="icon-button" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></header>
      {children}
    </div>
  </dialog>, document.body);
}
