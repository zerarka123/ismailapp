import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { WEATHER_URL } from '../config';
import Icon from './Icon.jsx';

// Sea-state strip opened by the cloud button on the home screen: waves, temperature, wind and pressure for 7 days.
// Data: Open-Meteo (free, no key). Nothing goes through Supabase. Each port is cached on the phone for one hour,
// and refreshed when the app comes back to the foreground after that.

// One point at sea in front of each coastal wilaya (wilaya id = official code). Points on land return no wave data.
export const PORTS = [
  { id: 13, ar: 'الغزوات', fr: 'Ghazaouet', lat: 35.13, lon: -1.87 },
  { id: 46, ar: 'بني صاف', fr: 'Béni Saf', lat: 35.33, lon: -1.40 },
  { id: 31, ar: 'وهران', fr: 'Oran', lat: 35.76, lon: -0.62 },
  { id: 27, ar: 'مستغانم', fr: 'Mostaganem', lat: 35.97, lon: 0.06 },
  { id: 2, ar: 'تنس', fr: 'Ténès', lat: 36.56, lon: 1.31 },
  { id: 42, ar: 'تيبازة', fr: 'Tipaza', lat: 36.63, lon: 2.43 },
  { id: 16, ar: 'الجزائر', fr: 'Alger', lat: 36.81, lon: 3.07 },
  { id: 35, ar: 'بومرداس', fr: 'Boumerdès', lat: 36.80, lon: 3.53 },
  { id: 15, ar: 'أزفون', fr: 'Azeffoun', lat: 36.92, lon: 4.42 },
  { id: 6, ar: 'بجاية', fr: 'Béjaïa', lat: 36.78, lon: 5.12 },
  { id: 18, ar: 'جيجل', fr: 'Jijel', lat: 36.85, lon: 5.77 },
  { id: 21, ar: 'سكيكدة', fr: 'Skikda', lat: 36.93, lon: 6.92 },
  { id: 23, ar: 'عنابة', fr: 'Annaba', lat: 36.93, lon: 7.80 },
  { id: 36, ar: 'القالة', fr: 'El Kala', lat: 36.93, lon: 8.45 },
];
const DEFAULT_PORT = 16;
const PORT_KEY = 'marsa.sea.port';
const CACHE_PREFIX = 'marsa.sea.';
const TTL_MS = 60 * 60 * 1000;

const portName = (p, lang) => (lang === 'ar' ? p.ar : p.fr);

function initialPort(wilayaId) {
  try {
    const saved = Number(localStorage.getItem(PORT_KEY));
    if (PORTS.some((p) => p.id === saved)) return saved;
  } catch {
    /* storage blocked */
  }
  return PORTS.some((p) => p.id === wilayaId) ? wilayaId : DEFAULT_PORT;
}

function readCache(id) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_PREFIX + id));
    return c && Array.isArray(c.days) ? c : null;
  } catch {
    return null;
  }
}

async function fetchDays(p) {
  const tz = 'Africa/Algiers';
  const sea = `https://marine-api.open-meteo.com/v1/marine?latitude=${p.lat}&longitude=${p.lon}&daily=wave_height_max,wave_direction_dominant,wave_period_max&timezone=${tz}&forecast_days=7`;
  const wx = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&hourly=pressure_msl&timezone=${tz}&forecast_days=7`;
  const [s, w] = await Promise.all([sea, wx].map((u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))));
  return w.daily.time.map((day, i) => ({
    day,
    wave: s.daily?.wave_height_max?.[i] ?? null,
    waveDir: s.daily?.wave_direction_dominant?.[i] ?? null,
    period: s.daily?.wave_period_max?.[i] ?? null,
    tMax: w.daily.temperature_2m_max[i],
    tMin: w.daily.temperature_2m_min[i],
    wind: w.daily.wind_speed_10m_max[i],
    gust: w.daily.wind_gusts_10m_max[i],
    windDir: w.daily.wind_direction_10m_dominant[i],
    pressure: w.hourly?.pressure_msl?.[i * 24 + 12] ?? null, // midday value
  }));
}

// Sea state from wave height (m) and wind (km/h): calm / moderate / rough / danger
export function seaLevel(d) {
  const wave = d.wave ?? 0;
  const wind = Math.max(d.wind ?? 0, (d.gust ?? 0) * 0.8);
  if (wave >= 2.5 || wind >= 50) return 'danger';
  if (wave >= 1.25 || wind >= 35) return 'rough';
  if (wave >= 0.5 || wind >= 20) return 'moderate';
  return 'calm';
}

// Compass point the wind comes from (8 directions)
const DIRS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const dirKey = (deg) => (deg == null ? null : DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]);

export function useSea(portId) {
  const [state, setState] = useState(() => ({ days: readCache(portId)?.days || null, error: false, loading: false }));

  const load = useCallback(
    async (force = false) => {
      const cached = readCache(portId);
      if (cached) setState((s) => ({ ...s, days: cached.days }));
      if (!force && cached && Date.now() - cached.t < TTL_MS) return;
      const p = PORTS.find((x) => x.id === portId);
      setState((s) => ({ ...s, loading: true, error: false }));
      try {
        const days = await fetchDays(p);
        try {
          localStorage.setItem(CACHE_PREFIX + portId, JSON.stringify({ t: Date.now(), days }));
        } catch {
          /* storage full: keep the copy in memory */
        }
        setState({ days, error: false, loading: false });
      } catch {
        setState((s) => ({ ...s, loading: false, error: !s.days }));
      }
    },
    [portId]
  );

  useEffect(() => {
    setState({ days: readCache(portId)?.days || null, error: false, loading: false });
    load();
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    const timer = setInterval(() => load(), TTL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onShow);
      clearInterval(timer);
    };
  }, [load]);

  return { ...state, reload: () => load(true) };
}

const num = (v, digits = 0) => (v == null ? '–' : Number(v).toFixed(digits));

export default function SeaStrip({ wilayaId }) {
  const { t, lang, locale } = useI18n();
  const [portId, setPortId] = useState(() => initialPort(wilayaId));
  const { days, error, loading, reload } = useSea(portId);

  function choose(e) {
    const id = Number(e.target.value);
    setPortId(id);
    try {
      localStorage.setItem(PORT_KEY, String(id));
    } catch {
      /* storage blocked */
    }
  }

  return (
    <section className="sea">
      <div className="sea-head">
        <b><Icon name="cloud" size={18} /> {t('sea.title')}</b>
        <select className="sea-port" value={portId} onChange={choose} aria-label={t('sea.port')}>
          {PORTS.map((p) => <option key={p.id} value={p.id}>{portName(p, lang)}</option>)}
        </select>
      </div>
      {error && <p className="msg err">{t('common.load_failed')} <button className="linkbtn" onClick={reload}>{t('common.retry')}</button></p>}
      {!days && !error && <p className="muted center">{t('common.loading')}</p>}
      {days && (
        <div className="sea-days">
          {days.map((d, i) => {
            const lvl = seaLevel(d);
            const wd = dirKey(d.windDir);
            return (
              <div key={d.day} className={`sea-day ${lvl}`}>
                <span className="sea-date">{i === 0 ? t('sea.today') : new Date(`${d.day}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}</span>
                <span className={`sea-lvl ${lvl}`}>{t(`sea.${lvl}`)}</span>
                <span dir="ltr">🌊 {num(d.wave, 1)} {t('unit.m')}</span>
                <span dir="ltr">🌡️ {num(d.tMin)}°/{num(d.tMax)}°</span>
                <span>💨 <bdi dir="ltr">{num(d.wind)} {t('sea.kmh')}</bdi>{wd ? ` ${t(`sea.dir_${wd}`)}` : ''}</span>
                <span dir="ltr">⏱️ {num(d.pressure)} hPa</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="sea-foot">
        <span className="muted small">{loading ? t('common.loading') : t('sea.source')}</span>
        <a className="linkbtn small" href={WEATHER_URL} target="_blank" rel="noopener noreferrer">{t('sea.official')}</a>
      </div>
    </section>
  );
}
