import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export const cx = (...values: (string | false | null | undefined)[]) =>
  values.filter(Boolean).join(' ');

export const field =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-[#f4f4f6] placeholder:text-[#6d6d78] outline-none transition focus:border-[#e8412f] focus:ring-2 focus:ring-[#e8412f]/25';

export const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#e8412f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf3524] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-[#e7e7ec] transition hover:border-white/25 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20';

export function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-white/[0.07] bg-[#111114] p-5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.9)]',
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#a4a4ae]">{title}</h2>}
            {description && <p className="mt-1 text-xs text-[#7c7c87]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  accent = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent?: 'default' | 'red' | 'green' | 'amber';
}) {
  const tone =
    accent === 'red'
      ? 'bg-[#e8412f]/15 text-[#ff7a68]'
      : accent === 'green'
        ? 'bg-emerald-500/15 text-emerald-400'
        : accent === 'amber'
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-white/[0.06] text-[#c9c9d2]';

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111114] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">{label}</p>
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', tone)}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold leading-none text-white">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-[#7c7c87]">{hint}</p>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  confirmed: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  preparing: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  ready: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  disabled: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  locked: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
};

export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize',
        statusStyles[status] || 'bg-white/5 text-[#b9b9c3] border-white/10'
      )}
    >
      {label || status}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-[#7c7c87]">
      {children}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'w-full rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full border border-white/10 text-[#a4a4ae] transition hover:border-white/30 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bars({ series }: { series: { day: string; revenue: number }[] }) {
  const max = Math.max(1, ...series.map((row) => row.revenue));
  if (series.length === 0) {
    return <div className="py-10 text-center text-sm text-[#7c7c87]">—</div>;
  }
  return (
    <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Revenue by day">
      {series.map((row) => (
        <div key={row.day} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-white group-hover:block">
            {row.day} · {row.revenue.toFixed(2)}
          </span>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-[#e8412f] to-[#ff7a52] transition group-hover:opacity-90"
            style={{ height: `${Math.max(4, (row.revenue / max) * 100)}%` }}
          />
          <span className="text-[9px] text-[#61616b]">{row.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#111114] p-6 text-sm text-[#a4a4ae]">
      <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-[#e8412f]" />
      {label}
    </div>
  );
}
