import { useState } from 'react';
import { Check, Copy, ExternalLink, Mail } from 'lucide-react';
import { CONTACT } from '../config';

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(t);
      return ok;
    } catch {
      return false;
    }
  }
};

const btn = 'inline-flex items-center gap-1.5 border border-current rounded-full px-3 h-11 text-xs font-bold active:scale-95 transition-transform';

interface ActionsProps {
  subject?: string;
  body?: string;
}

// ثلاث طرق مضمونة لمراسلتنا: تطبيق البريد، Gmail على الويب، أو نسخ العنوان
export function ContactActions({ subject = '', body = '' }: ActionsProps) {
  const [copied, setCopied] = useState(false);
  const email = CONTACT.email;
  const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex flex-wrap gap-2" dir="rtl">
      <button type="button" className={btn} onClick={() => { window.location.href = `mailto:${email}?${q}`; }}>
        <Mail className="w-3.5 h-3.5" /> تطبيق البريد
      </button>
      <button
        type="button"
        className={btn}
        onClick={() =>
          window.open(
            `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            '_blank',
            'noopener,noreferrer',
          )
        }
      >
        <ExternalLink className="w-3.5 h-3.5" /> Gmail
      </button>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          const ok = await copyText(email);
          setCopied(ok);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'تم النسخ' : 'نسخ العنوان'}
      </button>
    </div>
  );
}

// عنوان البريد: عند الضغط تظهر خيارات الفتح/النسخ (يعمل حتى لو لا يوجد تطبيق بريد)
export default function EmailLink() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 font-bold underline underline-offset-4 min-h-11">
        <Mail className="w-4 h-4" />
        <span dir="ltr">{CONTACT.email}</span>
      </button>
      {open && <ContactActions subject="تواصل مع مرسى" />}
    </div>
  );
}
