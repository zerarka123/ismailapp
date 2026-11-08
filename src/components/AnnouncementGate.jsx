import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { announcementShown, markAnnouncementRead, unseenAnnouncements } from '../lib/announcements';
import AnnouncementModal from './AnnouncementView.jsx';

// Shows new admin announcements once per user: when the app opens, and when it comes back to the foreground.
// (Tapping the push opens /news?a=<id>, which shows that announcement itself.)
export default function AnnouncementGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [queue, setQueue] = useState([]);
  const lastCheck = useRef(0);
  const hidden = pathname === '/login' || pathname.startsWith('/news') || pathname.startsWith('/admin');

  const check = useCallback(async () => {
    if (!user || Date.now() - lastCheck.current < 60000) return;
    lastCheck.current = Date.now();
    const list = await unseenAnnouncements(user.id).catch(() => []);
    if (list.length) setQueue(list.slice(0, 3));
  }, [user?.id]);

  useEffect(() => {
    lastCheck.current = 0;
    setQueue([]);
    check();
  }, [check]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  // skip anything already shown elsewhere in this session (e.g. opened from the push on /news)
  const current = !hidden ? queue.find((a) => !announcementShown(a.id)) : null;
  const rest = current ? queue.filter((a) => a.id !== current.id && !announcementShown(a.id)) : [];

  if (!current) return null;
  return (
    <AnnouncementModal
      key={current.id}
      a={current}
      onClose={() => {
        markAnnouncementRead(current.id);
        setQueue([]);
      }}
      onNext={rest.length ? () => {
        markAnnouncementRead(current.id);
        setQueue(rest);
      } : undefined}
    />
  );
}
