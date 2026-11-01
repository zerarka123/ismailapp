import { t } from '../i18n/index.jsx';
import { isBranchVisible } from './branches';

// Account types used across the app (match the user_type enum in Supabase)
export const INDIVIDUAL_TYPES = ['fisherman', 'artisan'];
export const PRO_TYPES = ['workshop', 'supplier', 'shop'];

export const userTypeLabel = (v) => ([...INDIVIDUAL_TYPES, ...PRO_TYPES].includes(v) ? t(`utype.${v}`) : t('utype.individual'));

export const isProType = (tp) => PRO_TYPES.includes(tp);

// Activity types of professional_profiles.pro_type, and the guide branches each may register in
export const PRO_KINDS = ['fisherman', 'craftsman', 'supplier', 'shop_owner', 'mechanic'];
export const proKindLabel = (k) => (PRO_KINDS.includes(k) ? t(`ptype.${k}`) : k || '');
const ALL_BRANCHES_BY_KIND = {
  fisherman: ['fishing_trips', 'jobs'],
  craftsman: ['shipyards', 'inox_workshops', 'wood_workshops'],
  supplier: ['parts_suppliers', 'cold_rooms'],
  shop_owner: ['gear_shops', 'parts_suppliers', 'cold_rooms'],
  mechanic: ['naval_mechanics', 'naval_electrics'],
};
// Only the branches that are currently visible can be chosen when registering (see lib/branches.js)
export const BRANCHES_BY_KIND = Object.fromEntries(Object.entries(ALL_BRANCHES_BY_KIND).map(([k, v]) => [k, v.filter(isBranchVisible)]));
// Activity types that still have at least one visible branch
export const REGISTERABLE_KINDS = PRO_KINDS.filter((k) => BRANCHES_BY_KIND[k].length > 0);

// Professional account with an active or trial subscription
export const hasActivePro = (profile) =>
  isProType(profile?.user_type) &&
  ['active', 'trial'].includes(profile?.subscription_status);

// Same rule as can_publish_portfolio() in the database
export const canUsePortfolio = (profile) =>
  profile?.user_type === 'workshop' &&
  ['active', 'trial'].includes(profile?.subscription_status);

// A professional_profiles row that currently shows in the guide
export const isLivePro = (pro) =>
  !!pro && pro.status === 'active' && (!pro.subscription_ends_at || new Date(pro.subscription_ends_at) > new Date());
