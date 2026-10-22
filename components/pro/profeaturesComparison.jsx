import React, { useState } from 'react';

const ProSubscriptionModal = ({ isOpen, onClose }) => {
  const [transactionId, setTransactionId] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const ripNumber = "00799999001892048353";

  const handleCopyRip = () => {
    navigator.clipboard.writeText(ripNumber);
    alert("تم نسخ رقم RIP بنجاح!");
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!transactionId || !receiptFile) {
      alert("الرجاء إدخال رقم المعاملة ورفع صورة وصل الدفع.");
      return;
    }

    setLoading(true);

    // محاكاة إرسال البيانات إلى Supabase أو الـ Backend الخاص بك
    try {
      // هنا يتم رفع الصورة إلى Supabase Storage وحفظ بيانات المعاملة في جدول الـ transactions
      setTimeout(() => {
        setLoading(false);
        setSuccessMessage("تم إرسال وصل الدفع بنجاح! سيتم مراجعته وتفعيل حسابك المحترف خلال ساعات.");
        setTransactionId('');
        setReceiptFile(null);
      }, 1500);
    } catch (error) {
      setLoading(false);
      alert("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-400">تفعيل حساب المحترف (Pro)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>

        <p className="text-sm text-slate-300 mb-6">
          للاشتراك الشهري، قم بتحويل المبلغ عبر تطبيق بريدي موب أو مباشرة إلى حسابنا البريدي باستخدام رقم الـ RIP أدناه:
        </p>

        {/* خانة عرض رقم RIP مع زر النسخ */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6">
          <span className="text-xs text-slate-400 block mb-1">رقم الـ RIP الخاص بالتحويل:</span>
          <div className="flex justify-between items-center">
            <span className="font-mono font-bold text-lg text-amber-300 tracking-wider">{ripNumber}</span>
            <button 
              onClick={handleCopyRip}
              className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded-lg text-slate-200 transition"
            >
              نسخ RIP
            </button>
          </div>
        </div>

        {/* نموذج رفع الوصل ورقم المعاملة */}
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">رقم المعاملة (Transaction ID / مرجع العملية):</label>
            <input 
              type="text" 
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="أدخل رقم العملية الموجود في الوصل"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">صورة وصل الدفع (Screenshot / باريدي موب):</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
              required
            />
          </div>

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs text-center font-bold">
                {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {loading ? "جاري إرسال الوصل..." : "إرسال وصل الدفع لتفعيل الحساب"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProSubscriptionModal;