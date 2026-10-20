export const PHONE_RE = /^\+?[0-9]{8,15}$/;
export const cleanPhone = (s) => String(s || '').trim().replace(/[\s-]/g, '');
export const digits = (s) => String(s || '').replace(/\D/g, '');

export const fmtPrice = (p) =>
  p == null ? 'السعر بالتفاهم' : `${Number(p).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} دج`;

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
export const CONDITIONS = { new: 'جديد', used: 'مستعمل' };
