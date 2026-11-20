import { getLang, langInfo, t } from '../i18n/index.jsx';

export const PHONE_RE = /^\+?[0-9]{8,15}$/;
export const cleanPhone = (s) => String(s || '').trim().replace(/[\s-]/g, '');
export const digits = (s) => String(s || '').replace(/\D/g, '');

// Prices (currency + short units k / M / mi) live in lib/price.js; re-exported here for the existing imports.
export { fmtPrice, fmtPriceExact } from './price.js';

export const fmtDate = (iso) => new Date(iso).toLocaleDateString(langInfo(getLang()).locale);

export const isNew = (iso) => Date.now() - new Date(iso).getTime() < 3 * 86400000;
export const daysLeft = (iso) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

export const telLink = (p) => `tel:${String(p).replace(/[^\d+]/g, '')}`;
export function waLink(phone, text) {
  let d = digits(phone);
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '213' + d.slice(1);
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
// escape LIKE wildcards so users cannot inject % or _ into searches
export const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => '\\' + m);
// only allow in-app redirects after login
export const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');
export const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const mapsSearchLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const conditionLabel = (c) => (c === 'new' || c === 'used' ? t(`cond.${c}`) : null);

// A PostgREST error caused by a column/function that only exists after a migration has run.
export const isMissingSchema = (err) =>
  !!err && (['42703', 'PGRST204', 'PGRST202', '42883', '42P01', 'PGRST205'].includes(err.code) || /column .* does not exist|could not find/i.test(err.message || ''));
