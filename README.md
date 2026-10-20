# مرسى — Marsa (v1.0.0)

React + Vite (واجهة عربية RTL) + Supabase، ومغلَّف بـ Capacitor 8 لإنتاج تطبيق Android.

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
