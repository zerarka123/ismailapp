import { supabase } from '../supabase';
import { t } from '../i18n/index.jsx';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 3;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Uploads documents to the private bucket, then marks the profile as "pending".
// Throws an Error with a translated message when something is wrong.
export async function submitVerification(userId, files) {
  const list = Array.from(files || []);
  if (list.length === 0) throw new Error(t('verify.pick_one'));
  if (list.length > MAX_FILES) throw new Error(t('verify.max_files', { n: MAX_FILES }));

  for (const f of list) {
    if (!ALLOWED.includes(f.type)) throw new Error(t('verify.bad_type'));
    if (f.size > MAX_SIZE) throw new Error(t('verify.too_big'));
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
