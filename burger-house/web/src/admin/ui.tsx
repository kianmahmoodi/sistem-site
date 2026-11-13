import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'cream',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent?: 'cream' | 'brand' | 'ink';
}) {
  const accentClass =
    accent === 'brand'
      ? 'bg-brand text-white'
      : accent === 'ink'
        ? 'bg-ink text-white'
        : 'bg-cream text-brand';

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <span className={`grid size-10 place-items-center rounded-full ${accentClass}`}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
  className = '',
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}
