# مرسى — Marsa (v1.0.0)

React + Vite + Supabase، ومغلَّف بـ Capacitor 8 لإنتاج تطبيق Android.
ثلاث لغات: العربية (RTL) والفرنسية والإنجليزية (LTR) مع تبديل فوري للاتجاه.

## تشغيل الموقع محليًا
```
cp .env.example .env     # ثم ضع مفتاحي Supabase
npm install
npm run dev
```
`npm run build` يولّد `dist/` وكذلك صفحات `privacy.html` و`terms.html` و`delete-account.html` من `src/legalContent.js`.

## تطبيق Android وGoogle Play
اقرأ **docs/PLAY_STORE_GUIDE_AR.md** (خطوة بخطوة). الأوامر المختصرة:
```
npm run android:setup     # مرة واحدة: ينشئ android/ والأيقونات ويضبط الإعدادات
npm run keystore          # مرة واحدة: مفتاح التوقيع (احفظه في مكانين!)
npm run android:release   # ينتج release/marsa-<version>.aab موقَّعًا
```

## الملفات المهمة
- `capacitor.config.json` — معرّف التطبيق `app.marsadz.marsa` (لا يتغير بعد أول رفع)
- `android-version.json` — رقم الإصدار (يرتفع مع `-- --bump`)
- `assets/` — أيقونة Android (طبقتان) وشاشة البداية • `store/` — أيقونة 512 وصورة الميزة ونصوص المتجر
- `public/_headers` — ترويسات أمان الموقع • `migrations/` — تعديلات قاعدة البيانات (نفّذها بالترتيب)
- `npm run test:scripts` — اختبار منطق تعديل ملفات Android

## متطلبات الأدوات
Node 22+، JDK 21، Android Studio Otter (2025.2.1) أو أحدث مع Android SDK 36.

## تحديث الإصدار 1.1 (اللغات، معارض الحسابات، الإشعارات)
**الترتيب مهم — نفّذ قاعدة البيانات أولًا ثم ارفع الواجهة:**

1. في Supabase ← SQL Editor نفّذ `scripts/migrations/003_i18n_portfolio_notifications.sql` مرة واحدة.
   يضيف فقط (لا يحذف أي جدول أو عمود أو بيانات) ويمكن إعادة تنفيذه بأمان:
   أعمدة `name_fr/name_en` للولايات والأنواع والفروع، فروع جديدة (ورشات الإينوكس، الخشب، غرف التبريد)،
   نوع «قارب مطاطي»، نوع إعلان `equipment` (معدات الصيد للجميع)، `gear_type` و`sponsored_until` في الإعلانات،
   جدول `portfolio_photos`، جداول الإشعارات (`notification_prefs`, `notifications`, `push_tokens`)،
   ودوال الإدارة `admin_set_badge` و`admin_update_professional` و`admin_set_listing_sponsored`.
2. `npm install` ثم `npm run build` وارفع `dist/` كالمعتاد. الواجهة تعمل أيضًا على قاعدة لم تُحدَّث بعد (تتجاهل الميزات الجديدة).

### الإشعارات الذكية
- تُنشأ تلقائيًا في قاعدة البيانات عند نشر إعلان (حسب النوع والولاية) أو منتج/أعمال جديدة في فرع مهني يتابعه المستخدم.
  كل مستخدم حالي يتابع افتراضيًا: القوارب والمحركات ومعدات الصيد، والمحترف يتابع فرعه تلقائيًا. يغيّرها من «الإشعارات ← اهتماماتي».
- **داخل التطبيق والمتصفح:** تعمل مباشرة (Supabase Realtime + إشعار المتصفح بعد موافقة المستخدم).
- **إشعارات الهاتف (Android):**
  1. أنشئ مشروع Firebase، أضف تطبيق Android بالمعرّف `app.marsadz.marsa`، وضع `google-services.json` في `android/app/`.
  2. ضع `VITE_PUSH_ENABLED=1` في `.env` ثم `npm run android:release`.
  3. انشر الدالة: `supabase functions deploy send-push --no-verify-jwt`
     ثم `supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)" WEBHOOK_SECRET=<كلمة-عشوائية>`.
  4. Database ← Webhooks: جدول `notifications`، حدث INSERT، نوع Edge Function ← `send-push`، وترويسة `x-webhook-secret` بنفس القيمة.
  تُرسل الرسالة بلغة المستخدم (`profiles.preferred_lang` تُحفظ تلقائيًا عند تغيير اللغة).
- اختياري: جدولة `select marsa_prune_notifications();` يوميًا لحذف الإشعارات الأقدم من 90 يومًا.

### ملاحظات
- الدعم الفني: `/support` داخل التطبيق، و`public/support.html` للموقع (يولَّد مع صفحات الخصوصية عند `npm run build`).
  رقم واتساب الدعم اختياري: `VITE_SUPPORT_WHATSAPP`.
- الإعلانات المموّلة: من صفحة الإعلان (حساب مدير) ← «تمويل 7/30 يومًا»، وتظهر أعلى الرئيسية.
- النصوص كلها في `src/i18n/messages.js` (عربي، فرنسي، إنجليزي في سطر واحد لكل مفتاح).
