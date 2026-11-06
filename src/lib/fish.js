import { getLang } from '../i18n/index.jsx';

// Fish and seafood types. The Arabic name is what is stored in listings.fish_species.
export const FISH_SPECIES = [
  { ar: 'جمبري', fr: 'Crevette', en: 'Shrimp' },
  { ar: 'سردين', fr: 'Sardine', en: 'Sardine' },
  { ar: 'سبيط', fr: 'Calmar', en: 'Squid' },
  { ar: 'دنيس', fr: 'Daurade', en: 'Sea bream' },
  { ar: 'لوبينا', fr: 'Loup de mer', en: 'Sea bass' },
  { ar: 'موسكاردة', fr: 'Moscardin', en: 'Octopus' },
  { ar: 'روجي', fr: 'Rouget', en: 'Red mullet' },
  { ar: 'ميرلو', fr: 'Merlan', en: 'Whiting' },
  { ar: 'تونة', fr: 'Thon', en: 'Tuna' },
  { ar: 'أنشوفة', fr: 'Anchois', en: 'Anchovy' },
  { ar: 'أخرى', fr: 'Autre', en: 'Other' },
];

export function speciesName(ar, lang = getLang()) {
  if (!ar) return '';
  const s = FISH_SPECIES.find((x) => x.ar === ar);
  return (s && s[lang]) || ar;
}

export const URGENCY = ['urgent', 'today', 'week'];
export const REQUEST_CATEGORIES = ['fish', 'seafood', 'other'];

export function timeAgo(iso, t) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return t('fish.just_now');
  if (m < 60) return t('fish.min_ago', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t('fish.hour_ago', { n: h });
  return t('fish.day_ago', { n: Math.round(h / 24) });
}

export const fishExpired = (iso) => !!iso && new Date(iso).getTime() <= Date.now();
