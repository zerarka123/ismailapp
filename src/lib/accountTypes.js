// Account types used across the app (match the user_type enum in Supabase)
export const INDIVIDUAL_TYPES = [
  { value: 'fisherman', label: 'صياد / فردي' },
  { value: 'artisan', label: 'حرفي' },
];

export const PRO_TYPES = [
  { value: 'workshop', label: 'ورشة' },
  { value: 'supplier', label: 'مورد' },
  { value: 'shop', label: 'محل' },
];

export const TYPE_LABELS = Object.fromEntries(
  [...INDIVIDUAL_TYPES, ...PRO_TYPES].map((t) => [t.value, t.label])
);

export const isProType = (t) => PRO_TYPES.some((p) => p.value === t);

// Professional account with an active or trial subscription
export const hasActivePro = (profile) =>
  isProType(profile?.user_type) &&
  ['active', 'trial'].includes(profile?.subscription_status);

// Same rule as can_publish_portfolio() in the database
export const canUsePortfolio = hasActivePro;
