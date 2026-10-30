import { useI18n } from '../../i18n/index.jsx';

// Two-tab switch for the jobs branch: offers (employers) / requests (sailors, craftsmen)
const JobBoardTabs = ({ value, onChange }) => {
  const { t } = useI18n();
  return (
    <div className="seg">
      <button type="button" className={`btn sm ${value === 'job_offer' ? '' : 'alt'}`} onClick={() => onChange('job_offer')}>💼 {t('job.offers')}</button>
      <button type="button" className={`btn sm ${value === 'job_request' ? '' : 'alt'}`} onClick={() => onChange('job_request')}>🎣 {t('job.requests')}</button>
    </div>
  );
};

export default JobBoardTabs;
