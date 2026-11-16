const KEY = 'veyora-coupon';

export function rememberCoupon(code) {
  const value = String(code || '').trim().toUpperCase();
  try {
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  } catch {}
  return value;
}

export function storedCoupon() {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}
