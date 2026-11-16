export const brandLogo = '/assets/brand/logo.webp';
export const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 800' width='100%25' height='100%25'%3E%3Crect width='600' height='800' fill='%23fbf9f5'/%3E%3Cg transform='translate(300, 380)' text-anchor='middle'%3E%3Cpath d='M0 -50 L35 0 L0 50 L-35 0 Z' fill='none' stroke='%23d4af37' stroke-width='1.5' opacity='0.7'/%3E%3Cpath d='M0 -30 L20 0 L0 30 L-20 0 Z' fill='none' stroke='%23c5a059' stroke-width='1' opacity='0.5'/%3E%3Ccircle cx='0' cy='0' r='3' fill='%23d4af37' opacity='0.8'/%3E%3Ctext y='90' font-family='Cormorant Garamond, Georgia, serif' font-size='20' font-style='italic' letter-spacing='4' fill='%238c827a'%3EVEYORA%3C/text%3E%3Ctext y='115' font-family='Manrope, sans-serif' font-size='9' font-weight='500' letter-spacing='3' fill='%23b5ada4'%3EATELIER EDIT%3C/text%3E%3C/g%3E%3C/svg%3E";

export function isBrandFallbackSource(source) {
  if (typeof source !== 'string' || !source.trim() || source === 'null' || source === 'undefined') return true;
  const value = source.trim();
  if (value === brandLogo || value === placeholderSvg || value === '/assets/product-placeholder.svg' || value.startsWith('/assets/brand/')) return true;
  if (value.startsWith('data:image/svg+xml')) return true;
  const queryAt = value.indexOf('?');
  if (queryAt === -1) return false;
  const path = value.slice(0, queryAt);
  if (path !== '/api/brand-image' && path !== '/api/thumbnail') return false;
  const inner = new URLSearchParams(value.slice(queryAt + 1)).get('source') || '';
  return !inner || inner === brandLogo || inner === '/assets/product-placeholder.svg' || inner.startsWith('/assets/brand/');
}

export function brandedImageSource(source) {
  if (typeof source !== 'string' || !source.trim()) return placeholderSvg;
  if (source === brandLogo || source === placeholderSvg || source.startsWith('data:') || source.startsWith('/assets/brand/') || source.startsWith('/api/brand-image?') || source === '/assets/product-placeholder.svg') return source;
  return '/api/brand-image?source=' + encodeURIComponent(source);
}
