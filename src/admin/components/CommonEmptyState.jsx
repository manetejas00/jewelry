import React from 'react';
import { Package } from 'lucide-react';

export function CommonEmptyState({
  icon: Icon = Package,
  title = 'No items found',
  description = 'Try clearing active filters or searching for something else.',
  action = null
}) {
  return (
    <div className="empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'var(--paper)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 14px',
          color: 'var(--muted)'
        }}
      >
        <Icon size={20} />
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 500 }}>{title}</h3>
      {description && (
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: '13px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          className="button dark small-button"
          onClick={action.onClick}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default CommonEmptyState;
