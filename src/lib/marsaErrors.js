// Turns database error codes (raised by our triggers) into Arabic messages
const MAP = [
  ['listing_limit_reached', 'وصلت إلى الحد الأقصى من الإعلانات النشطة. احذف إعلاناً أو انتقل إلى حساب محترف.'],
  ['rate_limit', 'نشرت إعلانات كثيرة في وقت قصير. حاول بعد قليل.'],
  ['duplicate_listing', 'هذا الإعلان منشور عندك بالفعل. استعمل زر «رفع الإعلان للأعلى» بدل إعادة النشر.'],
  ['portfolio_not_allowed', 'معرض الأعمال متاح للورشات والمحلات والموردين بحساب محترف فعّال.'],
  ['portfolio_limit_reached', 'وصلت إلى الحد الأقصى من فيديوهات المعرض (20 فيديو).'],
  ['not_active', 'لا يمكن رفع إعلان غير منشور.'],
  ['not_authenticated', 'سجّل الدخول أولاً.'],
];

export function arabicError(error, fallback = 'حدث خطأ، حاول مرة أخرى.') {
  const msg = error?.message || '';
  for (const [key, text] of MAP) {
    if (msg.includes(key)) return text;
  }
  // Messages we wrote ourselves in Arabic pass through unchanged
  if (/[\u0600-\u06FF]/.test(msg)) return msg;
  return fallback;
}
