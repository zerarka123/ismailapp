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

  const raw = error.message || '';

  if (raw.includes('bump_too_soon')) {
    const left = remainingText(raw);
    return {
      ok: false,
      message: left ? `يمكنك رفع هذا الإعلان بعد ${left}.` : 'لا يمكنك رفع هذا الإعلان الآن، حاول لاحقاً.',
    };
  }
  if (raw.includes('not_found')) {
    return { ok: false, message: 'لم يُعثر على هذا الإعلان ضمن إعلاناتك.' };
  }

  const known = arabicError(error, '');
  if (known) return { ok: false, message: known };

  // Unknown error: show the technical reason so it can be fixed
  return { ok: false, message: `تعذّر رفع الإعلان. (السبب التقني: ${error.code || ''} ${raw})` };
}
