export const fmt = (n: number) => Math.floor(n).toLocaleString('he-IL');

export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} שנ׳`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}:${String(s % 60).padStart(2, '0')} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}:${String(m % 60).padStart(2, '0')} שע׳`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'יום' : 'ימים'} ${h % 24} שע׳`;
}

/** Short duration for crop cards: "2 דק׳", "1 שעה", "8 שעות". */
export function fmtShort(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} דק׳`;
  const h = Math.round(m / 60);
  return h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
}

export function fmtAge(ms: number): string {
  const h = Math.floor(ms / 3600000);
  if (h < 24) return h <= 1 ? 'פחות מיום' : `${h} שעות`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'יום אחד' : d === 2 ? 'יומיים' : `${d} ימים`;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Circular progress ring (SVG) with inner HTML. pct 0..1 */
export function ring(pct: number, color: string, inner: string, track = '#EAD6B0', width = 4.5): string {
  const r = 18;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return `<div class="ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" fill="#fff" stroke="${track}" stroke-width="${width}"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(2)} ${c.toFixed(2)}"/></svg><div class="in">${inner}</div></div>`;
}
