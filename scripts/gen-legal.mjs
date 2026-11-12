// Writes public/privacy.html, terms.html, delete-account.html from src/legalContent.js,
// and public/support.html (trilingual support page with working mailto links).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGAL, LEGAL_UPDATED } from '../src/legalContent.js';
import { SITE_URL, SUPPORT_EMAIL } from '../src/config.js';
import { MESSAGES } from '../src/i18n/messages.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FILES = { privacy: 'privacy.html', terms: 'terms.html', delete: 'delete-account.html' };

function page(doc) {
  const body = doc.sections
    .map(([t, lines]) => `<section><h2>${esc(t)}</h2>${lines.length === 1 ? `<p>${esc(lines[0])}</p>` : `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`}</section>`)
    .join('\n');
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(doc.title)} — مرسى</title><meta name="robots" content="index,follow">
<style>body{font-family:system-ui,Segoe UI,Tahoma,sans-serif;max-width:720px;margin:0 auto;padding:24px 18px 60px;line-height:1.9;color:#0e2740;background:#f4faff}
h1{color:#0a6eb4}h2{margin-top:28px;font-size:19px}li{margin:6px 0}a{color:#0a6eb4}.m{color:#51708a;font-size:14px}</style></head>
<body><p><a href="${SITE_URL}">← مرسى</a></p><h1>${esc(doc.title)}</h1><p class="m">آخر تحديث: ${esc(LEGAL_UPDATED)}</p>
${body}
<p class="m"><a href="/privacy">سياسة الخصوصية</a> · <a href="/terms">شروط الاستخدام</a> · <a href="/delete-account">حذف الحساب</a></p>
</body></html>`;
}

function supportPage() {
  const tr = (k, i) => MESSAGES[k][i];
  const topics = ['activation', 'subscription', 'listing', 'account', 'bug'];
  const block = (i, lang, dir) => {
    const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(tr('support.subject', i))}`;
    return `<section lang="${lang}" dir="${dir}"><h1>${esc(tr('support.title', i))}</h1><p class="m">${esc(tr('support.intro', i))}</p>
<p><a class="b" href="${mail}">✉ ${esc(tr('support.email_us', i))}</a></p><p dir="ltr"><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
<h2>${esc(tr('support.topics', i))}</h2>${topics.map((k) => `<details><summary>${esc(tr(`support.q_${k}`, i))}</summary><p>${esc(tr(`support.a_${k}`, i))}</p></details>`).join('')}</section>`;
  };
  // One language at a time: /support-lang.js (a file, because the site's CSP forbids inline scripts) reads the same
  // choice as the app and the landing page (?lang= → localStorage "marsa.lang" → browser) and marks <html>.
  // Without JavaScript the three languages stay visible, as before.
  const legal = ['legal.privacy', 'legal.terms', 'legal.delete'].every((k) => MESSAGES[k]);
  const foot = (i) =>
    legal
      ? `<a href="/privacy">${esc(tr('legal.privacy', i))}</a> · <a href="/terms">${esc(tr('legal.terms', i))}</a> · <a href="/delete-account">${esc(tr('legal.delete', i))}</a>`
      : '<a href="/privacy">سياسة الخصوصية</a> · <a href="/terms">شروط الاستخدام</a> · <a href="/delete-account">حذف الحساب</a>';
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الدعم الفني · Support — مرسى Marsa</title><meta name="robots" content="index,follow">
<style>body{font-family:system-ui,Segoe UI,Tahoma,sans-serif;max-width:720px;margin:0 auto;padding:24px 18px 60px;line-height:1.9;color:#0e2740;background:#f4faff}
h1{color:#0a6eb4}h2{margin-top:22px;font-size:18px}a{color:#0a6eb4}.m{color:#51708a;font-size:15px}section{border-bottom:1px solid #cfe6f5;padding-bottom:18px}
.b{display:inline-block;background:#0a6eb4;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px}details{background:#fff;border-radius:14px;padding:10px 14px;margin:8px 0}summary{font-weight:700;cursor:pointer}
nav{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.sw{display:flex;gap:4px}
.sw button{font:inherit;font-weight:700;font-size:14px;border:1px solid #cfe6f5;border-radius:999px;padding:4px 12px;background:#fff;color:#0e2740;cursor:pointer}
.js [data-l]{display:none}.js.l-ar [data-l=ar],.js.l-fr [data-l=fr],.js.l-en [data-l=en]{display:block}.js section{border-bottom:0}
.js.l-ar .sw [data-set=ar],.js.l-fr .sw [data-set=fr],.js.l-en .sw [data-set=en]{background:#0a6eb4;color:#fff;border-color:#0a6eb4}</style>
<script src="/support-lang.js"></script></head>
<body><nav><a href="${SITE_URL}">مرسى · Marsa</a><span class="sw" dir="ltr"><button type="button" data-set="ar" lang="ar">ع</button><button type="button" data-set="fr" lang="fr">FR</button><button type="button" data-set="en" lang="en">EN</button></span></nav>
<div data-l="ar">${block(0, 'ar', 'rtl')}<p class="m">${foot(0)}</p></div>
<div data-l="fr" dir="ltr">${block(1, 'fr', 'ltr')}<p class="m">${foot(1)}</p></div>
<div data-l="en" dir="ltr">${block(2, 'en', 'ltr')}<p class="m">${foot(2)}</p></div>
</body></html>`;
}

mkdirSync(join(root, 'public'), { recursive: true });
for (const [k, file] of Object.entries(FILES)) {
  writeFileSync(join(root, 'public', file), page(LEGAL[k]), 'utf8');
  console.log('wrote public/' + file);
}
writeFileSync(join(root, 'public', 'support.html'), supportPage(), 'utf8');
console.log('wrote public/support.html');
