// Safety advice that matches what is being sold or offered (keys live in i18n/messages.js).
export const GEAR_TYPES = ['spare_part', 'product', 'service'];

export function safetyKey(kind, gearType) {
  if (kind === 'gear') return `safety.gear_${GEAR_TYPES.includes(gearType) ? gearType : 'product'}`;
  if (['boat', 'engine', 'equipment', 'job_offer', 'job_request'].includes(kind)) return `safety.${kind}`;
  return 'safety.generic';
}

// Short label of a listing's kind for cards and specs
export function kindKey(item) {
  if (item.kind === 'gear') return `gear.${GEAR_TYPES.includes(item.gear_type) ? item.gear_type : 'generic'}`;
  return `kind.${item.kind}`;
}
