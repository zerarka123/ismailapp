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
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الدعم الفني · Support — مرسى Marsa</title><meta name="robots" content="index,follow">
<style>body{font-family:system-ui,Segoe UI,Tahoma,sans-serif;max-width:720px;margin:0 auto;padding:24px 18px 60px;line-height:1.9;color:#0e2740;background:#f4faff}
h1{color:#0a6eb4}h2{margin-top:22px;font-size:18px}a{color:#0a6eb4}.m{color:#51708a;font-size:15px}section{border-bottom:1px solid #cfe6f5;padding-bottom:18px}
.b{display:inline-block;background:#0a6eb4;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px}details{background:#fff;border-radius:14px;padding:10px 14px;margin:8px 0}summary{font-weight:700;cursor:pointer}nav a{margin-inline-end:12px}</style></head>
<body><nav><a href="${SITE_URL}">مرسى · Marsa</a> <a href="#fr">Français</a> <a href="#en">English</a></nav>
${block(0, 'ar', 'rtl')}
<div id="fr">${block(1, 'fr', 'ltr')}</div>
<div id="en">${block(2, 'en', 'ltr')}</div>
<p class="m"><a href="/privacy">سياسة الخصوصية</a> · <a href="/terms">شروط الاستخدام</a> · <a href="/delete-account">حذف الحساب</a></p>
</body></html>`;
}

mkdirSync(join(root, 'public'), { recursive: true });
for (const [k, file] of Object.entries(FILES)) {
  writeFileSync(join(root, 'public', file), page(LEGAL[k]), 'utf8');
  console.log('wrote public/' + file);
}
writeFileSync(join(root, 'public', 'support.html'), supportPage(), 'utf8');
console.log('wrote public/support.html');
