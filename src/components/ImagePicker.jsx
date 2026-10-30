import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { errorText } from '../errors';
import { useI18n } from '../i18n/index.jsx';
import { cssUrl, prepareImage } from '../lib/images';

// images: [{ id, blob, url }]
export default function ImagePicker({ images, setImages, max }) {
  const { t } = useI18n();
  const input = useRef(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function onPick(e) {
    const files = [...e.target.files];
    e.target.value = '';
    setErr('');
    setBusy(true);
    const added = [];
    for (const f of files.slice(0, max - images.length)) {
      try {
        const blob = await prepareImage(f);
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        added.push({ id: crypto.randomUUID(), blob, url });
      } catch (x) {
        setErr(errorText(x));
      }
    }
    setBusy(false);
    setImages([...images, ...added]);
  }
  const remove = (id) => setImages(images.filter((i) => i.id !== id));
  const makeCover = (id) => setImages([images.find((i) => i.id === id), ...images.filter((i) => i.id !== id)]);

  return (
    <div>
      <div className="thumbs">
        {images.map((im, n) => (
          <div key={im.id} className="thumb" style={{ backgroundImage: cssUrl(im.url) }}>
            {n === 0 ? <span className="cover-badge">{t('img.cover')}</span> : <button type="button" className="thumb-act" onClick={() => makeCover(im.id)}>{t('img.make_cover')}</button>}
            <button type="button" className="thumb-x" onClick={() => remove(im.id)} aria-label={t('img.remove')}><Icon name="x" size={14} /></button>
          </div>
        ))}
        {images.length < max && (
          <button type="button" className="thumb add" onClick={() => input.current.click()} disabled={busy}>
            <Icon name="camera" size={26} />
            <small>{busy ? t('common.wait') : t('img.add')}</small>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPick} />
      {err && <p className="msg err">{err}</p>}
      <p className="muted small">{t('img.count', { n: images.length, max })}</p>
    </div>
  );
}
