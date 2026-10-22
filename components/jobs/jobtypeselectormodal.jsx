import React from 'react';

const JobTypeSelectorModal = ({ isOpen, onClose, isAuthenticated, onNavigate }) => {
  if (!isOpen) return null;

  const handleOptionClick = (route) => {
    onClose();
    if (!isAuthenticated) {
      // توجيه المستخدم لتسجيل الدخول أولاً قبل فتح النموذج
      onNavigate('/login');
    } else {
      onNavigate(route);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">ماذا تريد أن تنشر اليوم؟</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="space-y-3">
          {/* الخيار الأول: بيع قاربك */}
          <button
            onClick={() => handleOptionClick('/post/boat-sale')}
            className="w-full text-right p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-4 transition"
          >
            <span className="text-3xl">🚤</span>
            <div>
              <div className="font-bold text-amber-400">بيع قاربك</div>
              <div className="text-xs text-slate-300">سفن، قوارب صيد، ومعدات بحرية</div>
            </div>
          </button>

          {/* الخيار الثاني: عروض عمل (ملاك السفن والورش) */}
          <button
            onClick={() => handleOptionClick('/post/job-offer')}
            className="w-full text-right p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-4 transition"
          >
            <span className="text-3xl">💼</span>
            <div>
              <div className="font-bold text-amber-400">عرض عمل (أصحاب العمل)</div>
              <div className="text-xs text-slate-300">خاص بملاك السفن، الورش، ومحلات قطع الغيار</div>
            </div>
          </button>

          {/* الخيار الثالث: طلبات العمل (الصيادون والحرفيون) */}
          <button
            onClick={() => handleOptionClick('/post/job-request')}
            className="w-full text-right p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-4 transition"
          >
            <span className="text-3xl">🎣</span>
            <div>
              <div className="font-bold text-amber-400">طلب عمل (الباحثين عن عمل)</div>
              <div className="text-xs text-slate-300">خاص بالحرفيين والصيادين والميكانيكيين</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobTypeSelectorModal;