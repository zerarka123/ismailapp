import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { fmtDate, isMissingSchema } from '../lib/format';
import { goBack } from '../lib/goBack.js';
import { cssUrl } from '../lib/images';
import { getAnnouncement, listAnnouncements, markAnnouncementRead, readIds } from '../lib/announcements';
import AnnouncementModal from '../components/AnnouncementView.jsx';
import Icon from '../components/Icon.jsx';

// "الجديد": admin announcements for this user's account type (filtered by the database, RLS).
// /news?a=<id> (opened from the push notification) shows that announcement directly.
export default function News() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [seen, setSeen] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await listAnnouncements(30);
    if (error) {
      setMissing(isMissingSchema(error));
      return setRows([]);
    }
    setRows(data || []);
    if (user) setSeen(await readIds(user.id, (data || []).map((a) => a.id)));
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // opened from a notification
  const target = params.get('a');
  useEffect(() => {
    if (!target || rows === null) return;
    const found = rows.find((a) => a.id === target);
    if (found) return setOpen(found);
    getAnnouncement(target).then(({ data }) => data && setOpen(data));
  }, [target, rows]);

  function show(a) {
    setOpen(a);
  }
  function close() {
    if (open && user) {
      markAnnouncementRead(open.id);
      setSeen((s) => new Set(s).add(open.id));
    }
    setOpen(null);
    if (target) setParams({}, { replace: true });
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('ann.news_title')}</h2>
      </div>

      {missing && <p className="msg info">{t('ann.needs_migration')}</p>}
      {rows === null && <p className="muted center">{t('common.loading')}</p>}
      {rows?.length === 0 && !missing && <p className="empty">{t('ann.news_empty')}</p>}

      <div className="ann-list">
        {rows?.map((a) => {
          const isNew = user && !seen.has(a.id);
          return (
            <button key={a.id} className="ann-item" onClick={() => show(a)}>
              {a.media_type === 'image' ? (
                <span className="ann-thumb" style={{ backgroundImage: cssUrl(a.media_url) }} />
              ) : (
                <span className="ann-thumb ann-thumb-icon"><Icon name={a.media_type === 'video' ? 'video' : 'megaphone'} size={26} /></span>
              )}
              <span className="ann-item-text">
                <b dir="auto">{a.title}</b>
                {a.body && <span dir="auto">{a.body}</span>}
                <small>{fmtDate(a.created_at)} {isNew && <span className="pill warn">{t('ann.new')}</span>}</small>
              </span>
            </button>
          );
        })}
      </div>

      {open && <AnnouncementModal a={open} onClose={close} />}
    </>
  );
}
