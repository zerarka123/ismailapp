import { hasActivePro } from './accountTypes';

// hasActivePro() plus the end date, like is_active_pro() in the database
export function isProActive(profile) {
  if (!hasActivePro(profile)) return false;
  const end = profile?.subscription_ends_at;
  return !end || new Date(end).getTime() > Date.now();
}

// Posting branch: which form a professional account sees (fish market / gear shop / workshop)
export const POST_BRANCHES = ['fish_market', 'gear_shop', 'workshop'];
export const defaultBranch = (profile) =>
  profile?.user_type === 'shop' ? 'gear_shop' : profile?.user_type === 'workshop' ? 'workshop' : 'fish_market';
export const BRANCH_PRODUCT_TYPE = { fish_market: 'fish', gear_shop: 'gear', workshop: 'workshop' };
export const FISH_UNITS = ['kg', 'box', 'piece', 'lot'];
export const OFFER_DAYS = [1, 2, 3, 7];
// Is a fish-market offer still valid today?
export const offerActive = (item) =>
  !item.offer_days || Date.now() < new Date(item.published_at).getTime() + item.offer_days * 86400000;
