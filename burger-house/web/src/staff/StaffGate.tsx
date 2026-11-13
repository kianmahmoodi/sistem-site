import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useAdminT } from './labels';
import { AccessDenied, PanelLocked } from './PanelLocked';
import { Spinner, btn } from './ui';
import type { PanelState, User } from '../lib/types';
import { useRealtime } from './useRealtime';

type StaffSession = { user: User; panel: PanelState | null };

/**
 * Verifies the signed-in account against the server before rendering a panel.
 * The API is the real gate: this component only turns its answer into UI, so a
 * locked panel or a wrong role never relies on hidden buttons.
 */
export function StaffGate({ allow, children }: { allow: string[]; children: (session: StaffSession) => ReactNode }) {
  const { refresh } = useAuth();
  const t = useAdminT();
  const allowKey = allow.join(',');
  const [state, setState] = useState<'loading' | 'guest' | 'forbidden' | 'ready'>('loading');
  const [session, setSession] = useState<StaffSession | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<StaffSession>('/api/staff/me');
      setSession(data);
      if (!allowKey.split(',').includes(data.user.role)) setState('forbidden');
      else setState('ready');
      void refresh();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        if (error.status === 401) setState('guest');
        else setState('forbidden');
      } else {
        setState('guest');
      }
    }
  }, [allowKey, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useRealtime(['panel', 'users'], () => void load());

  if (state === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#08080a] px-4">
        <div className="w-full max-w-sm">
          <Spinner label={t('Loading…')} />
        </div>
      </main>
    );
  }

  if (state === 'guest') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#08080a] px-4 py-14 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111114] p-8 text-center">
          <h1 className="text-xl font-bold">{t('Sign in required')}</h1>
          <p className="mt-2 text-sm text-[#a4a4ae]">{t('Continue to sign in')}</p>
          <Link to="/login" className={`${btn} mt-6 w-full`}>
            {t('Continue to sign in')}
          </Link>
          <Link to="/" className="mt-3 block text-xs font-semibold text-[#7c7c87] hover:text-white">
            {t('View site')}
          </Link>
        </div>
      </main>
    );
  }

  if (state === 'forbidden' || !session) {
    return <AccessDenied />;
  }

  if (session.panel?.locked) {
    return <PanelLocked panel={session.panel} />;
  }

  return <>{children(session)}</>;
}
