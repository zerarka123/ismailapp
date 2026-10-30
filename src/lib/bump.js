import { supabase } from '../supabase';
import { t } from '../i18n/index.jsx';
import { marsaError } from './marsaErrors';

function remainingText(msg) {
  try {
    let raw = msg.split('bump_too_soon:')[1]?.trim();
    if (!raw) return null;
    raw = raw.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
    const ms = new Date(raw).getTime() - Date.now();
    if (Number.isNaN(ms) || ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.ceil((ms % 3600000) / 60000);
    return h > 0 ? t('bump.hours_minutes', { h, m }) : t('bump.minutes', { m });
  } catch {
    return null;
  }
}

// Usage: const { ok, message } = await bumpListing(listing.id)
export async function bumpListing(listingId) {
  const { error } = await supabase.rpc('bump_listing', { p_listing_id: listingId });
  if (!error) return { ok: true, message: t('bump.done') };

  const raw = error.message || '';

  if (raw.includes('bump_too_soon')) {
    const left = remainingText(raw);
    return { ok: false, message: left ? t('bump.wait', { left }) : t('bump.not_now') };
  }
  if (raw.includes('not_found')) {
    return { ok: false, message: t('bump.not_found') };
  }

  const known = marsaError(error, '');
  if (known) return { ok: false, message: known };

  // Unknown error: show the technical reason so it can be fixed
  return { ok: false, message: t('bump.failed', { reason: `${error.code || ''} ${raw}` }) };
}
