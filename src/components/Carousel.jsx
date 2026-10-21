import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

// Full-screen photo viewer: swipe between photos, zoom button / double-tap, Android back button closes it.
function Lightbox({ urls, start, onClose }) {
  const row = useRef(null);
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const sign = () => (getComputedStyle(row.current).direction === 'rtl' ? -1 : 1);

  const close = () => {
    if (window.history.state && window.history.state.lb) window.history.back();
    else onClose();
  };

  useEffect(() => {
    const el = row.current;
    el.scrollLeft = sign() * start * el.clientWidth;
    window.history.pushState({ ...(window.history.state || {}), lb: 1 }, '');
    const onPop = () => onClose();
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!zoom) return;
    const slide = row.current.children[i];
    if (!slide) return;
    slide.scrollLeft = sign() * (slide.scrollWidth - slide.clientWidth) / 2;
    slide.scrollTop = (slide.scrollHeight - slide.clientHeight) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const onScroll = (e) => {
    const n = Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth);
    if (n !== i) { setI(Math.min(n, urls.length - 1)); setZoom(false); }
  };

  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label="عرض الصور">
      <div className="lb-top">
        <button className="lb-btn" onClick={close} aria-label="إغلاق"><Icon name="x" /></button>
        <span className="lb-count" dir="ltr">{i + 1} / {urls.length}</span>
        <button className="lb-btn" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'تصغير' : 'تكبير'}><Icon name={zoom ? 'zoomout' : 'zoom'} /></button>
      </div>
      <div className={`lb-row${zoom ? ' locked' : ''}`} ref={row} onScroll={onScroll}>
        {urls.map((u, n) => (
          <div key={`${n}-${u}`} className={`lb-slide${zoom && n === i ? ' zoomed' : ''}`}>
            <img src={u} alt={`صورة ${n + 1}`} draggable={false} onDoubleClick={() => setZoom((z) => !z)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Carousel({ urls }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(null);
  if (!urls.length) return <div className="car-empty" />;
  return (
    <div className="car-wrap">
      <div
        className="car"
        onScroll={(e) => setI(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}
      >
        {urls.map((u, n) => (
          <img key={`${n}-${u}`} src={u} alt={`صورة ${n + 1}`} loading="lazy" onClick={() => setOpen(n)} />
        ))}
      </div>
      {urls.length > 1 && <span className="car-count" dir="ltr">{Math.min(i + 1, urls.length)} / {urls.length}</span>}
      {open !== null && createPortal(<Lightbox urls={urls} start={open} onClose={() => setOpen(null)} />, document.body)}
    </div>
  );
}
