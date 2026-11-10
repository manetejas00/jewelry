export function paginate(items, requestedPage = 1, pageSize = 25) {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 25;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const requested = Number.isSafeInteger(requestedPage) ? requestedPage : 1;
  const page = Math.min(pageCount, Math.max(1, requested));
  const offset = (page - 1) * size;
  return {items: items.slice(offset, offset + size), page, pageSize: size, pageCount, total, start: total ? offset + 1 : 0, end: Math.min(offset + size, total)};
}

export function pageNumbers(page, pageCount) {
  if (pageCount <= 7) return Array.from({length: pageCount}, (_, index) => index + 1);
  return Array.from(new Set([1, pageCount, page - 1, page, page + 1]))
    .filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);
}
