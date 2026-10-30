import { useState } from 'react';
import { bumpListing } from '../lib/bump';
import { useI18n } from '../i18n/index.jsx';

// "Raise listing to the top" button.
// Usage: <BumpButton listingId={item.id} onDone={reload} />
export default function BumpButton({ listingId, onDone }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function onClick() {
    setBusy(true);
    setResult(null);
    const r = await bumpListing(listingId);
    setResult(r);
    setBusy(false);
    if (r.ok && onDone) onDone();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 999,
          border: 'none',
          background: busy ? '#f1dca0' : '#f4c95d',
          color: '#3a2a00',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 15,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? t('bump.busy') : `↑ ${t('bump.button')}`}
      </button>
      {result && (
        <p
          role="status"
          style={{ margin: '6px 4px 0', fontSize: 13, color: result.ok ? '#1b7a3d' : '#b3261e' }}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
