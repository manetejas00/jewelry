export const KURTA_SIZES = [
  { code: 'XS', label: 'XS (34)', chest: '36"', waist: '32"', hip: '38"', shoulder: '14.0"', length: '44"', sleeve: '18.5"' },
  { code: 'S',  label: 'S (36)',  chest: '38"', waist: '34"', hip: '40"', shoulder: '14.5"', length: '44"', sleeve: '19.0"' },
  { code: 'M',  label: 'M (38)',  chest: '40"', waist: '36"', hip: '42"', shoulder: '15.0"', length: '44"', sleeve: '19.0"' },
  { code: 'L',  label: 'L (40)',  chest: '42"', waist: '38"', hip: '44"', shoulder: '15.5"', length: '45"', sleeve: '19.5"' },
  { code: 'XL', label: 'XL (42)', chest: '44"', waist: '40"', hip: '46"', shoulder: '16.0"', length: '45"', sleeve: '19.5"' },
  { code: 'XXL', label: 'XXL (44)', chest: '46"', waist: '42"', hip: '48"', shoulder: '16.5"', length: '46"', sleeve: '20.0"' },
  { code: 'XXXL', label: 'XXXL (46)', chest: '48"', waist: '44"', hip: '50"', shoulder: '17.0"', length: '46"', sleeve: '20.0"' }
];

const SIZE_SUFFIX = new RegExp(`-(${KURTA_SIZES.map(size => size.code).sort((a, b) => b.length - a.length).join('|')})$`, 'i');

export function kurtaSizesInValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const tokens = raw.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const listed = KURTA_SIZES.filter(size => tokens.includes(size.code));
  if (listed.length > 1) return listed;
  const exact = KURTA_SIZES.find(size => size.code === raw.toUpperCase() || size.label.toUpperCase() === raw.toUpperCase());
  if (exact) return [exact];
  const head = KURTA_SIZES.find(size => size.code === tokens[0]);
  return head ? [head] : [];
}

export function kurtaSizeCode(value) {
  const sizes = kurtaSizesInValue(value);
  return sizes.length === 1 ? sizes[0].code : '';
}

export const KURTA_SIZE_CORRECTION = 'Use one size per row: XS (34), S (36), M (38), L (40), XL (42), XXL (44) or XXXL (46). Put each size on its own row.';

export function storedKurtaSize(value) {
  const sizes = kurtaSizesInValue(value);
  return sizes.length === 1 ? sizes[0].label : '';
}

export function catalogSizeForStorage(value, { kurta = false } = {}) {
  const raw = value == null ? '' : String(value).trim();
  if (!raw) return kurta ? { error: KURTA_SIZE_CORRECTION } : { size: '' };
  if (kurtaSizesInValue(raw).length > 1 || (kurta && !storedKurtaSize(raw))) return { error: KURTA_SIZE_CORRECTION };
  return { size: kurta ? storedKurtaSize(raw) : raw };
}

export function kurtaSizeStockError(body = {}) {
  if (!body || typeof body !== 'object') return '';
  if (body.size != null && String(body.size).trim() !== '' && !storedKurtaSize(body.size)) return KURTA_SIZE_CORRECTION;
  for (const key of ['sizes', 'stocks']) {
    const map = body[key];
    if (map == null || map === '') continue;
    if (typeof map !== 'object' || Array.isArray(map)) return 'Sizes must be stock counts for XS (34) through XXXL (46).';
    for (const [sizeKey, stock] of Object.entries(map)) {
      const label = storedKurtaSize(sizeKey);
      if (!label) return `"${sizeKey}" is not a kurta size. ${KURTA_SIZE_CORRECTION}`;
      if (stock === '' || stock == null) continue;
      const parsed = Number(stock);
      if (!Number.isInteger(parsed) || parsed < 0) return `Stock for ${label} must be a whole number of zero or more.`;
    }
  }
  return '';
}

export function variantMatchesKurtaSize(sizeValue, code) {
  return kurtaSizeCode(sizeValue) === code;
}

export function kurtaSkuSizeCode(sku) {
  const match = String(sku || '').trim().match(SIZE_SUFFIX);
  return match ? match[1].toUpperCase() : '';
}

export function sizedKurtaSku(sku, code) {
  const value = String(sku || '').trim();
  if (!value) return code;
  if (kurtaSkuSizeCode(value) === code) return value;
  return `${value}-${code}`;
}

export function parentKurtaSku(sku) {
  const code = kurtaSkuSizeCode(sku);
  if (!code) return '';
  return String(sku).trim().slice(0, -(code.length + 1));
}

export function expandCombinedKurtaVariant(variant, options = {}) {
  if (!variant) return [];
  const sizes = kurtaSizesInValue(variant.size);
  if (sizes.length < 2) return [variant];
  const slug = options.slug || variant.slug;
  return sizes.map((size, index) => ({
    ...variant,
    sku: index === 0 ? variant.sku : sizedKurtaSku(variant.sku, size.code),
    slug,
    size: size.label
  }));
}
