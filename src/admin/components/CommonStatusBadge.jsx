import React from 'react';

export function CommonStatusBadge({ status = 'draft', label, size = 'normal', className = '' }) {
  const norm = String(status || '').toLowerCase().trim();
  const displayText = label || (norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : '—');

  let variant = '';
  if (/failed|stale|rejected|outofstock|stopped/.test(norm)) {
    variant = 'warning';
  } else if (/published|active|approved|verified|instock|running/.test(norm)) {
    variant = 'success';
  } else if (/pending|draft|staged/.test(norm)) {
    variant = 'neutral';
  }

  return (
    <span className={`status-badge ${variant} ${size === 'small' ? 'small-badge' : ''} ${className}`.trim()}>
      {displayText}
    </span>
  );
}

export default CommonStatusBadge;
