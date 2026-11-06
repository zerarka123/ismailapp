import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import FishList from '../components/FishList.jsx';
import { useI18n } from '../i18n/index.jsx';
import { goBack } from '../lib/goBack.js';

function Top({ title }) {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <div className="topbar">
      <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
      <h2>{title}</h2>
    </div>
  );
}

export default function FishMarket() {
  const { t } = useI18n();
  return (
    <>
      <Top title={t('fish.title')} />
      <div className="fish-hero">
        <Link to="/fish/today" className="fish-big"><Icon name="fish" size={34} /><b>{t('fish.today')}</b><small>{t('fish.today_sub')}</small></Link>
        <Link to="/fish/requests" className="fish-big sand"><Icon name="list" size={34} /><b>{t('fish.need')}</b><small>{t('fish.need_sub')}</small></Link>
      </div>
      <div className="section-title">{t('fish.all_ads')}</div>
      <FishList />
    </>
  );
}

export function FishToday() {
  const { t } = useI18n();
  return (
    <>
      <Top title={t('fish.today')} />
      <FishList postButton />
    </>
  );
}
