import { t } from './i18n/index.jsx';

// Turn technical errors into short messages in the current language.
export function errorText(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || '';
  if (msg.includes('invalid login credentials')) return t('err.bad_login');
  if (msg.includes('email not confirmed')) return t('err.email_not_confirmed');
  if (msg.includes('token has expired') || msg.includes('otp') || code === 'otp_expired') return t('err.bad_code');
  if (msg.includes('already registered')) return t('err.already_registered');
  if (msg.includes('password should be') || code === 'weak_password') return t('err.weak_password');
  if (msg.includes('rate limit') || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return t('err.rate_limit');
  if (msg.includes('listing_limit_reached')) return t('err.listing_limit');
  if (msg.includes('image_limit_reached')) return t('err.image_limit');
  if (msg.includes('too_early')) return t('err.too_early');
  if (msg.includes('not_admin')) return t('err.no_permission');
  if (code === '23505') return t('err.duplicate');
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) return t('err.no_permission');
  if (msg === 'location_denied') return t('err.location_denied');
  if (msg === 'bad_type') return t('err.bad_image_type');
  if (msg === 'too_big') return t('err.image_too_big');
  if (msg === 'bad_image') return t('err.bad_image');
  if (msg.includes('failed to fetch') || msg.includes('network')) return t('err.offline');
  return t('err.unexpected');
}

// Older name kept so existing imports keep working.
export const arabicError = errorText;
