import { getLang } from './index.jsx';

// Names stored in the database are Arabic (name_ar). Migration 003 adds optional name_fr / name_en
// columns; until they are filled we fall back to the tables below, then to the Arabic name.

// Wilaya codes 1–58 (ids in the wilayas table are the official codes).
const WILAYAS_LATIN = [
  null, 'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar', 'Blida', 'Bouira',
  'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda',
  'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem', "M'Sila", 'Mascara', 'Ouargla',
  'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela',
  'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar',
  'Ouled Djellal', 'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Meniaa',
];
const WILAYA_EN = { 16: 'Algiers' };

// Guide branches (guide_categories.slug)
const CATEGORIES = {
  shipyards: ['Chantiers navals', 'Shipyards'],
  parts_suppliers: ['Fournisseurs de pièces', 'Parts suppliers'],
  naval_mechanics: ['Mécanique et électricité navales', 'Marine mechanics & electrics'],
  naval_electrics: ['Électricité navale', 'Marine electrics'],
  gear_shops: ['Magasins de matériel de pêche', 'Fishing gear shops'],
  fishing_trips: ['Sorties de pêche', 'Fishing trips'],
  jobs: ['Emplois maritimes', 'Maritime jobs'],
  inox_workshops: ['Ateliers inox', 'Stainless steel workshops'],
  wood_workshops: ['Ateliers bois & charpente navale', 'Wood & boat carpentry workshops'],
  cold_rooms: ['Chambres froides / Poissonnerie', 'Cold rooms / Fish market'],
};

// Boat types (boat_types.slug); also matched by Arabic name for older rows
const BOAT_TYPES = {
  fishing: ['Bateau de pêche', 'Fishing boat'],
  fishing_boat: ['Bateau de pêche', 'Fishing boat'],
  sardine: ['Sardinier', 'Sardine boat'],
  trawler: ['Chalutier', 'Trawler'],
  pleasure: ['Bateau de plaisance', 'Pleasure boat'],
  yacht: ['Yacht', 'Yacht'],
  sailboat: ['Voilier', 'Sailboat'],
  inflatable: ['Bateau pneumatique', 'Inflatable boat'],
  zodiac: ['Bateau pneumatique', 'Inflatable boat'],
  jet_ski: ['Jet-ski', 'Jet ski'],
  motorboat: ['Bateau à moteur', 'Motorboat'],
  motor_boat: ['Bateau à moteur', 'Motorboat'],
  powerboat: ['Bateau à moteur', 'Motorboat'],
  cargo: ['Navire de commerce', 'Cargo ship'],
  cargo_ship: ['Navire de commerce', 'Cargo ship'],
  commercial: ['Navire de commerce', 'Cargo ship'],
  merchant: ['Navire de commerce', 'Cargo ship'],
  other: ['Autre', 'Other'],
};
const BOAT_TYPES_BY_AR = [
  ['مطاط', 'inflatable'],
  ['زودياك', 'inflatable'],
  ['جت', 'jet_ski'],
  ['شراع', 'sailboat'],
  ['نزهة', 'pleasure'],
  ['يخت', 'yacht'],
  ['سردين', 'sardine'],
  ['جياب', 'trawler'],
  ['صيد', 'fishing'],
  ['محرك', 'motorboat'], // قارب بمحرك
  ['تجار', 'cargo'], // سفينة تجارية
  ['شحن', 'cargo'],
  ['أخرى', 'other'],
];

const pick = (pair, lang) => (pair ? pair[lang === 'fr' ? 0 : 1] : null);

export function wilayaName(w, lang = getLang()) {
  if (!w) return '';
  if (lang === 'ar') return w.name_ar || '';
  return w[`name_${lang}`] || (lang === 'en' && WILAYA_EN[w.id]) || WILAYAS_LATIN[w.id] || w.name_ar || '';
}

// Arabic names that must win over the database value (so a rename ships with the app, without a SQL step)
const AR_OVERRIDE = { cold_rooms: 'غرف تبريد / مسمكة', naval_mechanics: 'ميكانيك وكهرباء السفن' };

export function categoryName(c, lang = getLang()) {
  if (!c) return '';
  if (lang === 'ar') return AR_OVERRIDE[c.slug] || c.name_ar || '';
  return c[`name_${lang}`] || pick(CATEGORIES[c.slug], lang) || c.name_ar || '';
}

export function boatTypeName(b, lang = getLang()) {
  if (!b) return '';
  if (lang === 'ar') return b.name_ar || '';
  if (b[`name_${lang}`]) return b[`name_${lang}`];
  let slug = b.slug;
  if (!BOAT_TYPES[slug] && b.name_ar) slug = BOAT_TYPES_BY_AR.find(([frag]) => b.name_ar.includes(frag))?.[1];
  return pick(BOAT_TYPES[slug], lang) || b.name_ar || '';
}

// Plans: name_ar only; shown to admins, keep Arabic when no translation column exists
export const planName = (p, lang = getLang()) => (p ? p[`name_${lang}`] || p.name_ar : '');
