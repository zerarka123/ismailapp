// One place for app-wide settings.
export const SUPPORT_EMAIL = 'support@marsadz.app'; // create this mailbox (Cloudflare Email Routing) before publishing
// Optional: an Algerian or international number for WhatsApp support (digits only, e.g. 213550000000). Empty = hidden.
export const SUPPORT_WHATSAPP = import.meta.env?.VITE_SUPPORT_WHATSAPP || '';
export const SITE_URL = 'https://marsadz.app';
// Public address of the app, used for share links (inside the Android app the page origin is not a real URL)
export const APP_URL = 'https://app.marsadz.app';
export const SUPPORT_PAGE = `${SITE_URL}/support`;
export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const PAGE_SIZE = 12;
// Listing kinds shown in the open market (home + search). "gear" = pro products, shown in their branch only.
export const MARKET_KINDS = ['boat', 'engine', 'equipment'];
export const JOB_KINDS = ['job_offer', 'job_request'];
// Native push needs Firebase (android/app/google-services.json). Turn on with VITE_PUSH_ENABLED=1 once it is in place.
export const PUSH_ENABLED = import.meta.env?.VITE_PUSH_ENABLED === '1';
