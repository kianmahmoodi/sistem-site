import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldAlert, Timer } from 'lucide-react';
import { useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';
import { useAdminT } from './labels';
import type { PanelState } from '../lib/types';
import { btn, btnGhost } from './ui';

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!target) return null;
  const diff = Math.max(0, new Date(target).getTime() - now);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds, done: diff === 0 };
}

export function PanelLocked({ panel }: { panel: PanelState }) {
  const { logout } = useAuth();
  const { lang } = usePrefs();
  const t = useAdminT();
  const navigate = useNavigate();
  const countdown = useCountdown(panel.opensAt);

  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <main className="grid min-h-screen place-items-center bg-[#08080a] px-4 py-14 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111114] p-8 text-center shadow-[0_40px_120px_-40px_rgba(0,0,0,1)]">
        <span className="mx-auto grid size-20 place-items-center rounded-2xl bg-[#e8412f]/15 text-[#ff7a68]">
          <LockKeyhole className="size-10" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold tracking-[0.14em]">{t('PANEL LOCKED')}</h1>
        <p className="mt-2 text-sm text-[#a4a4ae]">
          {lang === 'fa' ? panel.reason || t('This panel is locked. Please come back later.') : panel.reason || 'This panel is locked. Please come back later.'}
        </p>

        {panel.opensAt ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">
              <Timer className="size-4" /> {t('Reopens at')}
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {new Date(panel.opensAt).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: panel.timezone,
              })}
            </p>
            {countdown && (
              <div className="mt-4 flex justify-center gap-2 font-mono text-2xl font-bold">
                {[pad(countdown.hours), pad(countdown.minutes), pad(countdown.seconds)].map((part, index) => (
                  <span key={index} className="rounded-xl bg-white/[0.06] px-3 py-2 tabular-nums">
                    {part}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-[#a4a4ae]">
            {t('Contact management for the activation time.')}
          </p>
        )}

        {panel.hours && (
          <p className="mt-4 text-xs text-[#7c7c87]">
            {t('Panel hours')}: {panel.hours} · {panel.timezone}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            className={btnGhost}
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            {t('Logout')}
          </button>
          <Link to="/" className={btn}>
            {t('View site')}
          </Link>
        </div>
      </div>
    </main>
  );
}

export function AccessDenied({ message }: { message?: string }) {
  const t = useAdminT();
  return (
    <main className="grid min-h-screen place-items-center bg-[#08080a] px-4 py-14 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111114] p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-500/15 text-rose-400">
          <ShieldAlert className="size-8" />
        </span>
        <h1 className="mt-5 text-xl font-bold">{t('Access denied')}</h1>
        <p className="mt-2 text-sm text-[#a4a4ae]">{message || t('You do not have access to this panel.')}</p>
        <Link to="/login" className={`${btn} mt-6 w-full`}>
          {t('Continue to sign in')}
        </Link>
      </div>
    </main>
  );
}
