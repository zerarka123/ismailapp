import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { SITE_URL } from '../config';

export type LegalDoc = 'privacy' | 'terms' | 'delete';

const DOCS: Record<LegalDoc, { title: string; file: string }> = {
  privacy: { title: 'سياسة الخصوصية', file: 'privacy.html' },
  terms: { title: 'شروط الاستخدام', file: 'terms.html' },
  delete: { title: 'حذف الحساب والبيانات', file: 'delete-account.html' },
};

interface Props {
  doc: LegalDoc | null;
  onClose: () => void;
}

export default function LegalDialog({ doc, onClose }: Props) {
  const info = doc ? DOCS[doc] : null;
  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[88vh] p-0 gap-0 overflow-hidden flex flex-col" dir="rtl" showCloseButton={false}>
        <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-border shrink-0">
          <DialogTitle className="font-display font-extrabold text-lg">{info?.title}</DialogTitle>
          <DialogDescription className="sr-only">نص قانوني للتطبيق</DialogDescription>
          <div className="flex items-center gap-2">
            {info && SITE_URL && (
              <a
                href={`${SITE_URL}/${info.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-primary h-11 px-2"
              >
                <ExternalLink className="w-4 h-4" /> فتح في المتصفح
              </a>
            )}
            <button type="button" onClick={onClose} className="h-11 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              إغلاق
            </button>
          </div>
        </div>
        {info && (
          <iframe
            title={info.title}
            src={`${import.meta.env.BASE_URL}${info.file}`}
            className="flex-1 w-full border-0 bg-white"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
