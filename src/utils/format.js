export const CURRENCY = 'R';

export function money(n) {
  const val = Number(n) || 0;
  return `${CURRENCY}${val.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
}

export function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

export function initialsOf(name = '') {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
