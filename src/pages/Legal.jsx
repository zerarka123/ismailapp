import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useI18n } from '../i18n/index.jsx';
import { LEGAL_I18N, LEGAL_UPDATED_I18N } from '../legalContent.js';

export default function Legal({ kind }) {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const doc = (LEGAL_I18N[lang] || LEGAL_I18N.ar)[kind];
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{doc.title}</h2>
      </div>
      <div className="legal">
        <p className="muted small">{t('legal.updated', { date: LEGAL_UPDATED_I18N[lang] || LEGAL_UPDATED_I18N.ar })}</p>
        {doc.sections.map(([title, lines]) => (
          <section key={title}>
            <h2>{title}</h2>
            {lines.length === 1 ? <p>{lines[0]}</p> : <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>}
          </section>
        ))}
        {kind === 'delete' && <Link to="/account" className="btn" style={{ marginTop: 18 }}>{t('legal.go_account')}</Link>}
      </div>
    </>
  );
}
