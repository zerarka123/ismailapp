setMsg(arabicError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} dir="rtl" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{isRequest ? 'أضف طلب عمل' : 'أضف عرض عمل'}</h2>

      {full && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 12, marginBottom: 14 }}>
          إعلاناتك النشطة: {quota.used} من {quota.limit}. لا يمكنك نشر إعلان جديد قبل إنهاء أحدها.
        </div>
      )}

      <label style={label}>العنوان</label>
      <input style={input} value={f.title} onChange={set('title')}
        placeholder={isRequest ? 'مثال: ميكانيكي محركات بحرية يبحث عن عمل' : 'مثال: مطلوب بحارة لقارب صيد'} />

      {isRequest && (
        <>
          <label style={label}>المهنة</label>
          <input style={input} list="professions" value={f.profession}
            onChange={set('profession')} placeholder="اختر أو اكتب مهنتك" />
          <datalist id="professions">
            {PROFESSIONS.map((p) => <option key={p} value={p} />)}
          </datalist>
        </>
      )}

      <label style={label}>الوصف</label>
      <textarea style={{ ...input, minHeight: 110 }} value={f.description}
        onChange={set('description')}
        placeholder={isRequest ? 'الخبرة، الشهادات، الأعمال السابقة...' : 'المهام، الشروط، مدة العمل...'} />

      <label style={label}>الولاية</label>
      <select style={input} value={f.wilayaId} onChange={set('wilayaId')}>
        <option value="">اختر الولاية</option>
        {wilayas.map((w) => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
      </select>

      <label style={label}>المكان / الميناء (اختياري)</label>
      <input style={input} value={f.place} onChange={set('place')} />

      <label style={label}>{isRequest ? 'الأجر المتوقع (دج) - اختياري' : 'الأجر (دج) - اختياري'}</label>
      <input style={input} inputMode="numeric" value={f.salary} onChange={set('salary')} />

      <label style={label}>رقم الهاتف</label>
      <input style={input} inputMode="tel" value={f.phone} onChange={set('phone')} />

      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 12, marginBottom: 14 }}>
          {msg}
        </div>
      )}

      <button type="submit" disabled={busy || full}
        style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#0b4f7c',
          color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'inherit', opacity: busy || full ? 0.5 : 1 }}>
        {busy ? 'جارٍ النشر...' : 'انشر الإعلان'}
      </button>
    </form>
  );
}
