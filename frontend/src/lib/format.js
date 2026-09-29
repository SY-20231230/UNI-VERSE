export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return m + '분 전';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '시간 전';
  const dd = Math.floor(h / 24);
  if (dd < 7) return dd + '일 전';
  const dt = new Date(ts);
  return dt.getMonth() + 1 + '.' + dt.getDate();
}

export function won(n) {
  return Number(n).toLocaleString('ko-KR') + '원';
}

export function formatDate(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

export function hm(ts) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

export function discountPct(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

export function hoursAgo(h) {
  return Date.now() - h * 3600 * 1000;
}

export function daysAgo(d) {
  return Date.now() - d * 86400000;
}
