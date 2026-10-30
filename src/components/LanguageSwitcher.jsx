import { LANGS, useI18n } from '../i18n/index.jsx';

// Segmented AR / FR / EN switch. variant="full" shows the language names (settings), "compact" the short codes (headers).
export default function LanguageSwitcher({ variant = 'compact' }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`langsw ${variant}`} role="radiogroup" aria-label={t('lang.choose')}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={lang === l.code}
          lang={l.code}
          className={lang === l.code ? 'on' : ''}
          onClick={() => setLang(l.code)}
        >
          {variant === 'full' ? l.label : l.short}
        </button>
      ))}
    </div>
  );
}
