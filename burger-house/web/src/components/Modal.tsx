import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
  labelledBy?: string;
};

export function Modal({ open, onClose, title, children, size = 'md', labelledBy }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
        style={{ animation: 'fade-in 0.2s ease-out' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-labelledby={labelledBy}
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-soft sm:rounded-4xl sm:p-8 ${
          size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
        style={{ animation: 'pop-in 0.28s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? <h2 className="text-xl font-bold sm:text-2xl">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-ink transition hover:bg-cream hover:text-brand"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
