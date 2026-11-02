// Guide branches (guide_categories.slug) that are TEMPORARILY hidden from the app.
// Nothing is deleted: the code, the database rows and the accounts stay as they are.
// To bring a branch back, just remove its slug from this list.
export const HIDDEN_BRANCHES = [
  'wood_workshops', // ورشات الخشب ونجارة السفن
  'parts_suppliers', // موردو قطع الغيار
  'naval_electrics', // merged into naval_mechanics (see MERGED_BRANCHES)
  'fishing_trips', // رحلات الصيد
  'jobs', // البحث عن عمل
];
export const isBranchVisible = (slug) => !HIDDEN_BRANCHES.includes(slug);

// A branch that also shows the accounts of other branches: "ميكانيك وكهرباء السفن"
export const MERGED_BRANCHES = { naval_mechanics: ['naval_mechanics', 'naval_electrics'] };
