import { t } from '../i18n/index.jsx';

// Turns database error codes (raised by our triggers) into messages in the current language
const MAP = [
  ['listing_limit_reached', 'err.listing_limit_pro'],
  ['rate_limit', 'err.post_rate_limit'],
  ['duplicate_listing', 'err.duplicate_listing'],
  ['portfolio_not_allowed', 'err.portfolio_not_allowed'],
  ['portfolio_limit_reached', 'err.portfolio_limit'],
  ['photo_limit_reached', 'err.photo_limit'],
  ['not_active', 'err.not_active'],
  ['not_authenticated', 'err.not_authenticated'],
  ['not_admin', 'err.no_permission'],
];

export function marsaError(error, fallback = t('err.generic')) {
  const msg = error?.message || '';
  for (const [key, text] of MAP) {
    if (msg.includes(key)) return t(text);
  }
  // Errors we throw ourselves carry a message key such as "err.video_too_long"
  if (/^err\.[a-z_]+$/.test(msg)) return t(msg);
  return fallback;
}

// Older name kept so existing imports keep working.
export const arabicError = marsaError;
