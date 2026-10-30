import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MESSAGES } from './messages.js';

// Three languages: Arabic (RTL, default), French and English (LTR).
export const LANGS = [
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', locale: 'ar-DZ' },
  { code: 'fr', label: 'Français', short: 'FR', dir: 'ltr', locale: 'fr-DZ' },
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr', locale: 'en-GB' },
];
const INDEX = { ar: 0, fr: 1, en: 2 };
const STORAGE_KEY = 'marsa.lang';

function detect() {
  try {
    // ?lang=fr from the marsadz.app landing page wins, and is remembered
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && q in INDEX) {
      localStorage.setItem(STORAGE_KEY, q);
      return q;
    }
  } catch {
    /* no window / storage blocked */
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in INDEX) return saved;
  } catch {
    /* storage blocked: fall through */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('en')) return 'en';
  return 'ar';
}

// Module-level copy so plain helpers (formatters, error mappers) can translate too.
let current = detect();
export const getLang = () => current;
export const langInfo = (code = current) => LANGS[INDEX[code]] || LANGS[0];

export function translate(lang, key, vars) {
  const row = MESSAGES[key];
  let s = row ? row[INDEX[lang]] ?? row[0] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
export const t = (key, vars) => translate(current, key, vars);

function applyDocument(lang) {
  const info = langInfo(lang);
  const html = document.documentElement;
  html.lang = info.code;
  html.dir = info.dir;
  document.title = translate(lang, 'app.name');
}

// Set lang/dir before the first paint so French/English users never see an RTL flash
if (typeof document !== 'undefined') applyDocument(current);

const Ctx = createContext(null);
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(current);

  useEffect(() => {
    applyDocument(lang);
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!(code in INDEX)) return;
    current = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* not persisted: fine */
    }
    setLangState(code);
  }, []);

  const value = useMemo(() => {
    const info = langInfo(lang);
    return {
      lang,
      dir: info.dir,
      locale: info.locale,
      isRTL: info.dir === 'rtl',
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
