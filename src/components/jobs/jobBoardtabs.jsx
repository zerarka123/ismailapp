import React, { useState } from 'react';

const JobBoardTabs = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState('job_offers');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="w-full bg-slate-800 p-1.5 rounded-xl flex gap-2 border border-slate-700 mb-6" dir="rtl">
      <button
        onClick={() => handleTabClick('job_offers')}
        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition ${
          activeTab === 'job_offers'
            ? 'bg-amber-500 text-slate-950 shadow-md'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        💼 عروض العمل (المتاح)
      </button>
      <button
        onClick={() => handleTabClick('job_requests')}
        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition ${
          activeTab === 'job_requests'
            ? 'bg-amber-500 text-slate-950 shadow-md'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        🎣 طلبات العمل (البحارة)
      </button>
    </div>
  );
};

export default JobBoardTabs;
