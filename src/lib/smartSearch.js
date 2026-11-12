// Smart search helpers: the same word written in Arabic, French or English (or with a small typo) finds the same ads.
// Pure functions, no imports, so they also run under plain Node (npm run test:scripts).

// Each row = one idea in every spelling people actually type. Add a row to teach the search a new word.
const GROUPS = [
  // brands
  ['yamaha', 'ياماها', 'يماها', 'يامها'],
  ['suzuki', 'سوزوكي', 'سوزوكى'],
  ['honda', 'هوندا'],
  ['mercury', 'ميركوري', 'ماركوري', 'مركوري'],
  ['tohatsu', 'توهاتسو'],
  ['evinrude', 'ايفنرود', 'إيفنرود'],
  ['johnson', 'جونسون'],
  ['mariner', 'مارينر'],
  ['selva', 'سيلفا'],
  ['volvo', 'فولفو'],
  ['yanmar', 'يانمار'],
  ['perkins', 'بيركنز'],
  ['hyundai', 'هيونداي', 'هونداي'],
  ['zodiac', 'زودياك', 'pneumatique', 'gonflable', 'inflatable', 'مطاطي'],
  ['garmin', 'غارمن', 'قارمن'],
  // engines & parts
  ['moteur', 'motor', 'engine', 'محرك', 'موتور', 'ماتور'],
  ['hors-bord', 'hors bord', 'outboard', 'خارجي'],
  ['helice', 'hélice', 'propeller', 'مروحة', 'رفاس'],
  ['piece', 'pièce', 'pieces', 'pièces', 'rechange', 'spare', 'parts', 'قطع', 'قطعة', 'غيار'],
  ['batterie', 'battery', 'بطارية'],
  ['pompe', 'pump', 'مضخة'],
  ['reservoir', 'réservoir', 'tank', 'خزان'],
  ['cv', 'ch', 'hp', 'حصان'],
  // boats
  ['bateau', 'bateaux', 'boat', 'barque', 'قارب', 'قوارب', 'فلوكة', 'بابور', 'زورق', 'سفينة'],
  ['peche', 'pêche', 'fishing', 'صيد'],
  ['plaisance', 'pleasure', 'نزهة'],
  ['voilier', 'sailboat', 'شراعي', 'شراعية'],
  ['yacht', 'يخت'],
  ['jet-ski', 'jet ski', 'jetski', 'جت سكي', 'جيت سكي'],
  ['chalutier', 'trawler', 'جياب'],
  ['sardinier', 'سرديني'],
  ['coque', 'hull', 'هيكل'],
  ['polyester', 'polyor', 'بوليستر', 'بوليستار'],
  ['remorque', 'trailer', 'عربة', 'ريمورك'],
  ['console', 'كونسول'],
  // fishing gear
  ['filet', 'filets', 'net', 'شبكة', 'شباك'],
  ['canne', 'rod', 'قصبة', 'صنارة'],
  ['moulinet', 'reel', 'بكرة', 'مولينات'],
  ['hamecon', 'hameçon', 'hook', 'صنارة', 'سنارة'],
  ['palangre', 'palong', 'longline', 'بالونغ'],
  ['ancre', 'anchor', 'مرساة', 'مخطاف'],
  ['bouee', 'bouée', 'buoy', 'عوامة'],
  ['gilet', 'life jacket', 'سترة'],
  ['corde', 'cordage', 'rope', 'حبل', 'حبال'],
  ['sondeur', 'sonar', 'fishfinder', 'سونار'],
  ['gps', 'جي بي اس'],
  ['materiel', 'matériel', 'equipment', 'gear', 'معدات', 'عتاد', 'تجهيزات'],
  ['inox', 'stainless', 'اينوكس', 'إينوكس'],
  // state
  ['neuf', 'new', 'جديد', 'جديدة'],
  ['occasion', 'used', 'مستعمل', 'مستعملة'],
];

const AR_MARKS = /[ً-ٰٟـ]/g; // tashkeel + tatweel

// Lower-case, no accents, one Arabic spelling (أ/إ/آ → ا, ة → ه, ى → ي), single spaces.
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(AR_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const NORM_GROUPS = GROUPS.map((g) => g.map((w) => ({ raw: w, norm: normalize(w) })));
const MAX_WORDS = 5;
const MAX_VARIANTS = 10;

export function words(q) {
  return normalize(q).split(' ').filter(Boolean).slice(0, MAX_WORDS);
}

// Every spelling worth sending to the database for one typed word.
// "ياماها" → ["ياماها", "yamaha", ...]; "yam" → ["yam", "yamaha", "ياماها", ...] (prefix of a known word).
export function variants(word, raw = word) {
  const out = new Set([raw, word]);
  if (word.length >= 2) {
    for (const g of NORM_GROUPS) {
      const hit = g.some((m) => m.norm === word || (word.length >= 3 && m.norm.startsWith(word)) || (word.length >= 4 && editDistance(m.norm, word) <= 1));
      if (hit) for (const m of g) out.add(m.raw);
    }
  }
  return [...out].filter(Boolean).slice(0, MAX_VARIANTS);
}

// [[variants of word 1], [variants of word 2], ...] — a listing must match one variant of EVERY word.
export function expandQuery(q) {
  const rawWords = String(q ?? '').trim().split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
  return rawWords.map((raw) => variants(normalize(raw), raw)).filter((v) => v.length);
}

export function editDistance(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Consonant skeleton shared by both scripts, so a name missing from GROUPS still matches across languages:
// "tohatsu" and "توهاتسو" both become "thts".
const AR_TO_LATIN = {
  ب: 'b', ت: 't', ث: 't', ج: 'j', ح: 'h', خ: 'k', د: 'd', ذ: 'd', ر: 'r', ز: 'z', س: 's', ش: 's', ص: 's', ض: 'd',
  ط: 't', ظ: 'd', ع: '', غ: 'g', ف: 'f', ق: 'k', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ء: '', ڤ: 'v', پ: 'p', گ: 'g',
  ا: 'a', و: 'o', ي: 'y',
};
export function skeleton(word) {
  let s = '';
  for (const ch of word) s += AR_TO_LATIN[ch] ?? ch;
  s = s.replace(/ph/g, 'f').replace(/[cq]/g, 'k').replace(/x/g, 'ks').replace(/v/g, 'f').replace(/g/g, 'j');
  const body = s.slice(1).replace(/[aeiouyw]/g, '');
  return (s[0] || '') + body.replace(/(.)\1+/g, '$1');
}

function wordMatches(word, tokens, text) {
  const vs = variants(word).map(normalize);
  if (vs.some((v) => text.includes(v))) return true;
  const sk = skeleton(word);
  return tokens.some((tok) => {
    if (word.length >= 4 && editDistance(tok, word) <= (word.length >= 7 ? 2 : 1)) return true;
    if (word.length >= 3 && tok.startsWith(word)) return true;
    return sk.length >= 3 && skeleton(tok) === sk;
  });
}

// Tolerant match used when the exact database search finds nothing: typos and cross-script spellings.
export function fuzzyMatch(q, ...fields) {
  const text = normalize(fields.filter(Boolean).join(' '));
  const tokens = text.split(' ').filter(Boolean);
  const ws = words(q);
  return ws.length > 0 && ws.every((w) => wordMatches(w, tokens, text));
}

// PostgREST "or" filter for one word: any variant inside any of the columns.
// Values are LIKE-escaped (%, _ and \ typed by the user stay literal) and quoted (commas, dots, brackets are safe).
export function orFilter(vs, columns) {
  const quote = (v) => `"%${v.replace(/[\\%_]/g, (m) => '\\' + m).replace(/[\\"]/g, (m) => '\\' + m)}%"`;
  return vs.flatMap((v) => columns.map((c) => `${c}.ilike.${quote(v)}`)).join(',');
}
