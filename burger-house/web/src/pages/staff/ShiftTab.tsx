import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, Receipt, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime, money } from '../../lib/format';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Pill, Spinner, Stat, btn, btnGhost } from '../../staff/ui';

type Shift = {
  id: number;
  started_at: string;
  ended_at: string | null;
  note: string;
};

type Payload = {
  openShift: Shift | null;
  stats: { orders: number; revenue: number };
  history: (Shift & { orders: number; revenue: number })[];
};

export function ShiftTab() {
  const t = useAdminT();
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Payload>('/api/pos/shift')
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);
  useRealtime(['orders'], load);

  const act = async (action: 'start' | 'end') => {
    setBusy(true);
    try {
      await api(`/api/pos/shift/${action}`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!data) return <Spinner label={t('Loading…')} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label={data.openShift ? t('Shift open since') : t('No open shift')}
          value={data.openShift ? formatDateTime(data.openShift.started_at) : '—'}
          icon={<LogIn className="size-4" />}
          accent={data.openShift ? 'green' : 'amber'}
        />
        <Stat label={t('Shift orders')} value={String(data.stats.orders)} icon={<ShoppingBag className="size-4" />} />
        <Stat label={t('Shift revenue')} value={money(data.stats.revenue)} icon={<Receipt className="size-4" />} accent="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        {data.openShift ? (
          <button type="button" className={btn} disabled={busy} onClick={() => void act('end')}>
            <LogOut className="size-4" /> {t('End shift')}
          </button>
        ) : (
          <button type="button" className={btn} disabled={busy} onClick={() => void act('start')}>
            <LogIn className="size-4" /> {t('Start shift')}
          </button>
        )}
        <button type="button" className={btnGhost} onClick={load}>
          {t('View')}
        </button>
      </div>

      <Card title={t('Shift history')}>
        {data.history.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data.history.map((shift) => (
              <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-[#e7e7ec]">
                    {formatDateTime(shift.started_at)}
                    {shift.ended_at ? ` → ${formatDateTime(shift.ended_at)}` : ''}
                  </p>
                  <p className="text-xs text-[#7c7c87]">
                    {shift.orders} · {money(shift.revenue)}
                  </p>
                </div>
                <Pill status={shift.ended_at ? 'completed' : 'active'} label={t(shift.ended_at ? 'Completed' : 'Open')} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
