import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { ActivityLog } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Pill, Spinner, field } from '../../staff/ui';

export function ActivityTab() {
  const t = useAdminT();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ActivityLog[] }>(
        `/api/super/activity-logs${term ? `?q=${encodeURIComponent(term)}` : ''}`
      );
      setLogs(data.items);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [term]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(['orders', 'users', 'panel', 'inventory'], () => void load());

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6d6d78]" />
        <input
          className={`${field} ps-9`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && setTerm(search.trim())}
          placeholder={t('Search activity…')}
          aria-label={t('Search')}
        />
      </div>

      {loading ? (
        <Spinner label={t('Loading…')} />
      ) : (
        <Card>
          {logs.length === 0 ? (
            <Empty>{t('No activity yet.')}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-[#7c7c87]">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">{t('Actor')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Action')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Detail')}</th>
                    <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">{t('Created')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[#e7e7ec]">{log.actor_name}</p>
                        <p className="text-[11px] text-[#6d6d78]">{log.actor_role}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill status="active" label={log.action} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#a4a4ae]">{log.detail}</td>
                      <td className="hidden px-3 py-2.5 text-xs text-[#7c7c87] sm:table-cell">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
