import { supabase } from '../supabase';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 3;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Uploads documents to the private bucket, then marks the profile as "pending".
// Throws an Error with an Arabic message when something is wrong.
export async function submitVerification(userId, files) {
  const list = Array.from(files || []);
  if (list.length === 0) throw new Error('اختر وثيقة واحدة على الأقل.');
  if (list.length > MAX_FILES) throw new Error(`الحد الأقصى ${MAX_FILES} ملفات.`);

  for (const f of list) {
    if (!ALLOWED.includes(f.type)) throw new Error('الملفات المقبولة: صور (jpg, png, webp) أو PDF.');
    if (f.size > MAX_SIZE) throw new Error('حجم كل ملف يجب ألا يتجاوز 10 ميغا.');
  }

  const paths = [];
  for (const f of list) {
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${userId}/${Date.now()}-${paths.length}.${ext}`;
    const { error } = await supabase.storage
      .from('verification-docs')
      .upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw error;
    paths.push(path);
  }

  const { error } = await supabase
    .from('profiles')
    .update({ documents_url: paths, verification_status: 'pending' })
    .eq('id', userId);
  if (error) throw error;

  return paths;
}
