// One place for app-wide settings.
export const SUPPORT_EMAIL = 'marsadz@gmail.com'; // same address as the website footer
// Optional: an Algerian or international number for WhatsApp support (digits only, e.g. 213550000000). Empty = hidden.
export const SUPPORT_WHATSAPP = import.meta.env?.VITE_SUPPORT_WHATSAPP || '';
export const SITE_URL = 'https://marsadz.app';
// Public address of the app, used for share links (inside the Android app the page origin is not a real URL)
export const APP_URL = 'https://app.marsadz.app';
export const SUPPORT_PAGE = `${SITE_URL}/support`;
// Public files (photos, videos) are served through Cloudflare's cache (functions/m) instead of straight from Supabase,
// which removes almost all "Cached Egress". Empty = off (files come from Supabase). Example: https://app.marsadz.app/m
export const MEDIA_BASE = (import.meta.env?.VITE_MEDIA_BASE || '').replace(/\/+$/, '');
export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Admin announcements: biggest video file that can be uploaded (the storage bucket enforces the same limit)
export const MAX_ANNOUNCEMENT_VIDEO_BYTES = 20 * 1024 * 1024;
export const PAGE_SIZE = 12;
// Listing kinds shown in the open market (home + search). "gear" = pro products, shown in their branch only.
export const MARKET_KINDS = ['boat', 'engine', 'equipment'];
export const JOB_KINDS = ['job_offer', 'job_request'];
// Native push needs Firebase (android/app/google-services.json). Turn on with VITE_PUSH_ENABLED=1 once it is in place.
export const PUSH_ENABLED = import.meta.env?.VITE_PUSH_ENABLED === '1';

// ---- Fish market ----
// Official bulletin linked under the sea-state strip (the strip itself uses Open-Meteo, see components/SeaStrip.jsx)
export const WEATHER_URL = 'https://www.meteo.dz/';
// Max number of "I need" requests one user can publish per day (the database enforces the same number in migration 011)
export const FISH_REQUESTS_PER_DAY = 5;
export const FISH_ARRIVAL_HOURS = 24;
export const FISH_REQUEST_HOURS = 48;
