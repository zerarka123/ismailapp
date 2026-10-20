// Writes public/privacy.html, terms.html, delete-account.html from src/legalContent.js
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGAL, LEGAL_UPDATED } from '../src/legalContent.js';
import { SITE_URL } from '../src/config.js';

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

mkdirSync(join(root, 'public'), { recursive: true });
for (const [k, file] of Object.entries(FILES)) {
  writeFileSync(join(root, 'public', file), page(LEGAL[k]), 'utf8');
  console.log('wrote public/' + file);
}
