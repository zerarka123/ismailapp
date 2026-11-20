import { t } from '../i18n/index.jsx';

// Prices: the amount is stored in listings.price_dzd (in the currency of listings.price_currency, migration 017).
// Dinar amounts can be typed with a unit: 120 + M = 120 000 000 DA. Units are official: M = million dinars,
// mi = billion dinars (not centimes).
export const CURRENCIES = ['DZD', 'EUR', 'USD'];
export const DZD_UNITS = [
  { id: '1', mult: 1 },
  { id: 'k', mult: 1e3 },
  { id: 'M', mult: 1e6 },
  { id: 'mi', mult: 1e9 },
];
export const MAX_PRICE = 1e12; // same limit as the database (migration 017)

const unitMult = (unit) => (DZD_UNITS.find((u) => u.id === unit) || DZD_UNITS[0]).mult;
const cleanCurrency = (c) => (CURRENCIES.includes(c) ? c : 'DZD');

// "1,25" or "1.25" -> 1.25 ; anything else -> NaN
function readNumber(s) {
  const v = String(s ?? '').trim().replace(/\s/g, '').replace(',', '.');
  return /^\d{1,12}(\.\d{1,3})?$/.test(v) ? Number(v) : NaN;
}

// Typed text + unit + currency -> stored amount. '' -> null (negotiable). Invalid -> NaN.
export function parsePrice(text, unit = '1', currency = 'DZD') {
  if (!String(text ?? '').trim()) return null;
  const n = readNumber(text);
  if (!Number.isFinite(n)) return NaN;
  const amount = Math.round(n * (cleanCurrency(currency) === 'DZD' ? unitMult(unit) : 1));
  return amount > 0 && amount < MAX_PRICE ? amount : NaN;
}

// Stored amount -> { text, unit } for the edit form (largest unit that keeps at most 2 decimals)
export function splitPrice(amount, currency = 'DZD') {
  if (amount == null) return { text: '', unit: '1' };
  const n = Number(amount);
  if (cleanCurrency(currency) !== 'DZD') return { text: String(n), unit: '1' };
  for (const u of [...DZD_UNITS].reverse()) {
    if (u.mult === 1 || n < u.mult) continue;
    const v = n / u.mult;
    if (Math.abs(v * 100 - Math.round(v * 100)) < 1e-6) return { text: String(Number(v.toFixed(2))), unit: u.id };
  }
  return { text: String(n), unit: '1' };
}

const group = (n, max = 2) =>
  Number(n).toLocaleString('fr-FR', { maximumFractionDigits: max }).replace(/[  ]/g, ' ');

// The number sits in a left-to-right isolate (U+2066 ... U+2069) so Arabic text never reorders its digit groups.
const ltr = (s) => `⁦${s}⁩`;

// Stored amount -> readable price: "1,25 مليون دج", "850 ألف دج", "12 500 €", "Price negotiable"
export function fmtPrice(amount, currency = 'DZD') {
  if (amount == null) return t('price.negotiable');
  const n = Number(amount);
  const cur = cleanCurrency(currency);
  if (cur === 'EUR') return `${ltr(group(n))} €`;
  if (cur === 'USD') return `${ltr(group(n))} $`;
  const tag = t('price.currency');
  if (n >= 1e9) return `${ltr(group(n / 1e9))} ${t('price.u_mi')} ${tag}`;
  if (n >= 1e6) return `${ltr(group(n / 1e6))} ${t('price.u_M')} ${tag}`;
  if (n >= 1e4) return `${ltr(group(n / 1e3))} ${t('price.u_k')} ${tag}`;
  return `${ltr(group(n, 0))} ${tag}`;
}

// Exact amount, shown under the short price on the listing page ("1 250 000 دج")
export function fmtPriceExact(amount, currency = 'DZD') {
  if (amount == null) return '';
  const cur = cleanCurrency(currency);
  const sign = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : t('price.currency');
  return `${ltr(group(amount, 0))} ${sign}`;
}
