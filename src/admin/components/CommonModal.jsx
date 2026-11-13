import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function CommonModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '580px',
  ariaLabel
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="admin-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(26,24,20,0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 999,
        display: 'grid',
        placeItems: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div
        className="admin-modal-card"
        style={{
          background: 'var(--cream, #fdfbf7)',
          border: '1px solid var(--line, #e2dcd2)',
          borderRadius: '6px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100dvh - 40px)',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            {subtitle && (
              <span className="eyebrow" style={{ letterSpacing: '1.5px', marginBottom: '4px', display: 'block' }}>
                {subtitle}
              </span>
            )}
            <h3 style={{ margin: 0, fontSize: '20px', fontFamily: 'var(--font-serif)' }}>{title}</h3>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={onClose}
            style={{ padding: '4px', color: 'var(--muted)' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default CommonModal;
