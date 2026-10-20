import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { LEGAL, LEGAL_UPDATED } from '../legalContent.js';

export default function Legal({ kind }) {
  const nav = useNavigate();
  const doc = LEGAL[kind];
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="رجوع"><Icon name="back" /></button>
        <h2>{doc.title}</h2>
      </div>
      <div className="legal">
        <p className="muted small">آخر تحديث: {LEGAL_UPDATED}</p>
        {doc.sections.map(([title, lines]) => (
          <section key={title}>
            <h2>{title}</h2>
            {lines.length === 1 ? <p>{lines[0]}</p> : <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>}
          </section>
        ))}
        {kind === 'delete' && <Link to="/account" className="btn" style={{ marginTop: 18 }}>الذهاب إلى حسابي</Link>}
      </div>
    </>
  );
}
