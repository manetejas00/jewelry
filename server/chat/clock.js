export function usageDate(date, timeZone) {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formatted)) throw new Error('Invalid timezone');
  return formatted;
}

export function assertTimeZone(timeZone) {
  usageDate(new Date(), timeZone);
  return timeZone;
}

export function nextReset(date, timeZone) {
  const current = usageDate(date, timeZone);
  let lo = date.getTime();
  let hi = lo + 36 * 60 * 60 * 1000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (usageDate(new Date(mid), timeZone) === current) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}
