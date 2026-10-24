import { supabase } from '../supabase';
import { arabicError } from './marsaErrors';

function remainingText(msg) {
  try {
    let raw = msg.split('bump_too_soon:')[1]?.trim();
    if (!raw) return null;
    raw = raw.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
    const ms = new Date(raw).getTime() - Date.now();
    if (Number.isNaN(ms) || ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.ceil((ms % 3600000) / 60000);
    return h > 0 ? `${h} ساعة و${m} دقيقة` : `${m} دقيقة`;
  } catch {
    return null;
  }
}

// Usage: const { ok, message } = await bumpListing(listing.id)
export async function bumpListing(listingId) {
  const { error } = await supabase.rpc('bump_listing', { p_listing_id: listingId });
  if (!error) return { ok: true, message: 'تم رفع إعلانك إلى الأعلى.' };

  if ((error.message || '').includes('bump_too_soon')) {
    const left = remainingText(error.message);
    return {
      ok: false,
      message: left ? `يمكنك رفع هذا الإعلان بعد ${left}.` : 'لا يمكنك رفع هذا الإعلان الآن، حاول لاحقاً.',
    };
  }
  return { ok: false, message: arabicError(error) };
}
