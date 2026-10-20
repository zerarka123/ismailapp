import { supabase } from '../supabase';
import { MAX_IMAGE_BYTES } from '../config';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
export const cssUrl = (u) => `url("${String(u).replace(/"/g, '%22')}")`;
export const publicUrl = (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

// Validate, downscale (max 1600px) and re-encode as JPEG: smaller files, no metadata (GPS) leaks.
export async function prepareImage(file) {
  if (!ALLOWED.includes(file.type)) throw new Error('bad_type');
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('bad_image');
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error('too_big');
  return blob;
}

// Uploads blobs; pushes each stored path into `uploaded` so callers can clean up on failure.
export async function uploadImages(bucket, folder, blobs, uploaded = []) {
  for (const blob of blobs) {
    const path = `${folder}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
    uploaded.push(path);
  }
  return uploaded;
}

export async function removeFiles(bucket, paths) {
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
}
