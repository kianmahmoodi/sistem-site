import type { LucideIcon } from 'lucide-react';
import { LogOut, Sandwich, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';
import { useAdminT } from './labels';
import { cx } from './ui';
import type { User } from '../lib/types';

export type StaffNavItem = { key: string; label: string; icon: LucideIcon };

export function StaffShell({
  user,
  roleLabel,
  nav,
  active,
  onSelect,
  title,
  subtitle,
  actions,
  children,
}: {
  user: User;
  roleLabel: string;
  nav: StaffNavItem[];
  active: string;
  onSelect: (key: string) => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { logout } = useAuth();
  const { lang, setLang, dir } = usePrefs();
  const t = useAdminT();
  const navigate = useNavigate();

  return (
    <div dir={dir} className="min-h-screen bg-[#08080a] text-[#f4f4f6]">
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-[264px] lg:shrink-0 lg:border-e lg:border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 lg:border-b-0">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8412f] text-white shadow-[0_14px_30px_-14px_rgba(232,65,47,0.9)]">
                <Sandwich className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold leading-tight">Burger House</span>
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">
                  {roleLabel}
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#c9c9d2] transition hover:border-white/30 hover:text-white"
                aria-label="Switch language"
              >
                {lang === 'fa' ? 'EN' : 'FA'}
              </button>
            </div>
          </div>

          <nav aria-label={roleLabel} className="hidden px-3 py-4 lg:block">
            <ul className="space-y-1">
              {nav.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.key)}
                    aria-current={active === item.key ? 'page' : undefined}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                      active === item.key
                        ? 'bg-[#e8412f] text-white shadow-[0_16px_32px_-20px_rgba(232,65,47,1)]'
                        : 'text-[#a4a4ae] hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    <item.icon className="size-[18px]" />
                    {t(item.label)}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-1 border-t border-white/[0.06] pt-4">
              <Link
                to="/"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#a4a4ae] transition hover:bg-white/[0.06] hover:text-white"
              >
                <ShieldCheck className="size-[18px]" /> {t('View site')}
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#a4a4ae] transition hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="size-[18px]" /> {t('Sign out')}
              </button>
            </div>
          </nav>

          <div className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:hidden">
            {nav.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={cx(
                  'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  active === item.key ? 'bg-[#e8412f] text-white' : 'bg-white/[0.05] text-[#a4a4ae]'
                )}
              >
                <item.icon className="size-4" />
                {t(item.label)}
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-[#7c7c87]">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#c9c9d2] sm:inline">
                {user.name} · {t(roleLabel)}
              </span>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
