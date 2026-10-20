// Turn technical errors into short Arabic messages.
export function arabicError(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || '';
  if (msg.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة السر غير صحيحة.';
  if (msg.includes('email not confirmed')) return 'لم تؤكد بريدك بعد. سجّل من جديد لتصلك رسالة بالرمز، أو استعمل «لم يصلني الرمز».';
  if (msg.includes('token has expired') || msg.includes('otp') || code === 'otp_expired') return 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.';
  if (msg.includes('already registered')) return 'هذا البريد مسجّل مسبقًا.';
  if (msg.includes('password should be') || code === 'weak_password') return 'كلمة السر ضعيفة. استعمل 8 أحرف على الأقل.';
  if (msg.includes('rate limit') || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit')
    return 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.';
  if (msg.includes('listing_limit_reached'))
    return 'وصلت إلى الحد الأقصى من الإعلانات النشطة. علّم إعلانًا «تم البيع» أو احذفه أو انتظر انتهاءه.';
  if (msg.includes('image_limit_reached')) return 'وصلت إلى الحد الأقصى من الصور.';
  if (msg.includes('too_early')) return 'يمكن التجديد خلال آخر 7 أيام من مدة الإعلان فقط.';
  if (code === '23505') return 'تم هذا الإجراء من قبل.';
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied'))
    return 'ليست لديك صلاحية لهذا الإجراء.';
  if (msg === 'location_denied') return 'تعذّر تحديد موقعك. اسمح للتطبيق بالوصول للموقع من إعدادات الجهاز.';
  if (msg === 'bad_type') return 'نوع الصورة غير مدعوم (JPG أو PNG أو WebP).';
  if (msg === 'too_big') return 'الصورة كبيرة جدًا.';
  if (msg === 'bad_image') return 'تعذّر قراءة الصورة.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'لا يوجد اتصال بالإنترنت.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}
