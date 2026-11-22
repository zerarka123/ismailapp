import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import Home, { HomeHeader } from './Home.jsx';
import GuideFeed from '../components/GuideFeed.jsx';

// The home screen in three panes: the maritime directory | the market | the fisherman's guide.
// Swipe right (finger to the right) shows the directory, swipe left shows the fisherman's guide, in every language,
// and the bar under the header does the same with a tap. The pane is kept in the address (/?g=marine, /?g=fisher)
// so "back" from an account page returns to the same guide. Each pane keeps its own state and scroll position,
// and a guide is loaded only the first time it is opened.
const PANES = ['marine', 'market', 'fisher']; // left to right on the screen
const MIN_DX = 60; // px the finger must travel sideways
const SWIPED_KEY = 'marsa.pager.swiped';

// true when the touch starts on something that scrolls sideways or takes text (chips, photo strips, fields):
// that gesture belongs to it, not to the pager
function ownsGesture(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.dataset && 'noswipe' in n.dataset) return true;
    if (n.getAttribute?.('role') === 'dialog' || n.getAttribute?.('aria-modal') === 'true') return true; // pop-ups over the home
    if (/^(INPUT|TEXTAREA|SELECT|VIDEO)$/.test(n.tagName) || n.isContentEditable) return true;
    const ox = getComputedStyle(n).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

function readSwiped() {
  try {
    return localStorage.getItem(SWIPED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function HomePager() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const g = params.get('g');
  const pane = g === 'marine' || g === 'fisher' ? g : 'market';
  const [visited, setVisited] = useState(() => new Set(['market', pane]));
  const [swiped, setSwiped] = useState(readSwiped);
  const scrollY = useRef({});
  const shown = useRef(pane);
  const touch = useRef(null);
  const refs = useRef({});
  const live = useRef({});

  // remember where each pane was scrolled
  useEffect(() => {
    const onScroll = () => {
      scrollY.current[shown.current] = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // a new pane: mount it the first time, slide it in, and put back its scroll position
  useLayoutEffect(() => {
    const before = shown.current;
    if (before === pane) return;
    shown.current = pane;
    setVisited((v) => (v.has(pane) ? v : new Set([...v, pane])));
    window.scrollTo(0, scrollY.current[pane] || 0);
    const el = refs.current[pane];
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el && el.animate && !still) {
      const from = PANES.indexOf(pane) > PANES.indexOf(before) ? 1 : -1; // comes from the right or from the left
      el.animate([{ transform: `translateX(${from * 28}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
  }, [pane]);

  function go(next) {
    if (!next || next === pane) return;
    setParams(next === 'market' ? {} : { g: next }, { replace: true });
  }

  // swipes are read on the whole screen (also the empty space under a short list), not only on the content
  live.current = { pane, swiped, go };
  useEffect(() => {
    const onStart = (e) => {
      touch.current = e.touches.length === 1 && !ownsGesture(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() } : null;
    };
    const onEnd = (e) => {
      const s = touch.current;
      touch.current = null;
      if (!s || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - s.x;
      const dy = e.changedTouches[0].clientY - s.y;
      if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.at > 800) return;
      const { pane: now, swiped: seen, go: goTo } = live.current;
      const i = PANES.indexOf(now);
      const next = dx > 0 ? PANES[i - 1] : PANES[i + 1]; // finger to the right: the pane on the left
      if (!next) return;
      if (!seen) {
        setSwiped(true);
        try {
          localStorage.setItem(SWIPED_KEY, '1');
        } catch {
          /* storage blocked */
        }
      }
      goTo(next);
    };
    const onCancel = () => (touch.current = null);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, []);

  // the pane on screen is mounted in this same render, so it can slide in at once
  const mounted = visited.has(pane) ? visited : new Set([...visited, pane]);
  const label = { marine: t('guide.marine'), market: t('pager.market'), fisher: t('guide.fisher') };

  return (
    <div className="pager-wrap">
      <HomeHeader />
      <nav className="pager" dir="ltr" aria-label={t('nav.home')}>
        {PANES.map((p) => (
          <button key={p} type="button" className={p === pane ? 'on' : ''} aria-current={p === pane ? 'page' : undefined} onClick={() => go(p)}>
            {label[p]}
          </button>
        ))}
      </nav>
      {pane === 'market' && !swiped && <p className="pager-hint">{t('pager.hint')}</p>}

      {PANES.map((p) =>
        mounted.has(p) ? (
          <div key={p} ref={(el) => (refs.current[p] = el)} hidden={p !== pane} className="pager-pane">
            {p === 'market' ? <Home /> : <GuideFeed section={p} />}
          </div>
        ) : null
      )}
    </div>
  );
}
