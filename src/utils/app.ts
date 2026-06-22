const CARD_COLORS = ['#C2705A', '#7E8B5B', '#5C8374', '#B07B4A', '#9B6A8D', '#6E7894', '#A65E4F', '#8A7A4D'];

export function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function colorForString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return CARD_COLORS[hash % CARD_COLORS.length];
}

export function initialOf(value: string): string {
  return (value.trim().charAt(0) || 'レ').toUpperCase();
}

export function imageDataUrl(label: string, color: string): string {
  const safeLabel = initialOf(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="${color}"/><circle cx="540" cy="70" r="110" fill="rgba(255,255,255,.13)"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="168" fill="rgba(46,38,32,.22)">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '未実行';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

export function reorderByTarget<T>(items: T[], moving: T, target: T): T[] {
  const from = items.indexOf(moving);
  const to = items.indexOf(target);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  next.splice(from, 1);
  next.splice(to, 0, moving);
  return next;
}

export function toHostLabel(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch {
    return url;
  }
}
