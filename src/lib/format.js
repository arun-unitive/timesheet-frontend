/**
 * Date / number formatting helpers.
 * All calendar dates in the app are plain `YYYY-MM-DD` strings.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local (not UTC) ISO date for a Date object. */
export const toISODate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toISODate(new Date());

export const parseISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysISO = (iso, days) => {
  const dt = parseISO(iso);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
};

export const startOfWeekISO = (iso = todayISO()) => {
  const dt = parseISO(iso);
  const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  return toISODate(dt);
};

export const endOfWeekISO = (iso = todayISO()) => addDaysISO(startOfWeekISO(iso), 6);

export const startOfMonthISO = (iso = todayISO()) => `${iso.slice(0, 7)}-01`;

export const endOfMonthISO = (iso = todayISO()) => {
  const [y, m] = iso.split('-').map(Number);
  return `${iso.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

/** "31 Oct 2026" */
export const formatDate = (iso) => {
  if (!iso) return '—';
  const dt = parseISO(iso);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

/** "Sat, 31 Oct" */
export const formatDateShort = (iso) => {
  if (!iso) return '—';
  const dt = parseISO(iso);
  return `${WEEKDAYS[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
};

/** "31 Oct" - compact, used on chart axes */
export const formatDateCompact = (iso) => {
  if (!iso) return '';
  const dt = parseISO(iso);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
};

/** "1-Jun-26" - matches the reference image layout */
export const formatDateRef = (iso) => {
  if (!iso) return '—';
  const dt = parseISO(iso);
  return `${dt.getDate()}-${MONTHS[dt.getMonth()]}-${String(dt.getFullYear()).slice(-2)}`;
};

export const weekdayName = (iso) => (iso ? WEEKDAYS[parseISO(iso).getDay()] : '—');

/** "Today" / "Yesterday" / formatted date */
export const relativeDay = (iso) => {
  const t = todayISO();
  if (iso === t) return 'Today';
  if (iso === addDaysISO(t, -1)) return 'Yesterday';
  if (iso === addDaysISO(t, 1)) return 'Tomorrow';
  return formatDateShort(iso);
};

/** 3.5 -> "3h 30m" */
export const formatHours = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total);
  const minutes = Math.round((total - hours) * 60);
  if (minutes === 60) return `${hours + 1}h 00m`;
  if (hours === 0 && minutes === 0) return '0h 00m';
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

/** 3.5 -> "3.5 h" (compact, for tables/charts) */
export const formatHoursShort = (value) => `${(Math.round((Number(value) || 0) * 100) / 100).toFixed(2)} h`;

export const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

export const titleCase = (value = '') =>
  String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Human readable relative time for timestamps. */
export const timeAgo = (dateLike) => {
  if (!dateLike) return '—';
  const then = new Date(dateLike).getTime();
  const diff = Math.round((Date.now() - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(then).toLocaleDateString();
};

/** Inclusive list of ISO dates between two bounds. */
export const eachDayISO = (fromISO, toISO) => {
  const out = [];
  let cursor = fromISO;
  let guard = 0;
  while (cursor <= toISO && guard < 400) {
    out.push(cursor);
    cursor = addDaysISO(cursor, 1);
    guard += 1;
  }
  return out;
};
