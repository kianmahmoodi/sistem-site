import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  ShoppingBag,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime, money } from '../../lib/format';
import type { ActivityLog, Order } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Bars, Card, Empty, Pill, Spinner, Stat } from '../../staff/ui';
import { statusLabel } from '../../staff/OrdersBoard';

type Overview = {
  revenue: { today: number; week: number; month: number };
  orders: { total: number; active: number; completed: number; cancelled: number };
  customers: number;
  staff: { role: string; count: number }[];
  series: { day: string; revenue: number; orders: number }[];
  recentOrders: Order[];
  activity: ActivityLog[];
  lowStock: { id: number; name: string; quantity: number; threshold: number }[];
  timezone: string;
};

export function SuperOverview() {
  const t = useAdminT();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Overview>('/api/super/overview')
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);
  useRealtime(['orders', 'users', 'inventory', 'panel'], load);

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!data) return <Spinner label={t('Loading…')} />;

  const staffCount = data.staff.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('Revenue today')} value={money(data.revenue.today)} hint={data.timezone} icon={<Banknote className="size-4" />} accent="green" />
        <Stat label={t('Revenue (7 days)')} value={money(data.revenue.week)} icon={<Banknote className="size-4" />} />
        <Stat label={t('Revenue (30 days)')} value={money(data.revenue.month)} icon={<Banknote className="size-4" />} />
        <Stat label={t('Customers')} value={String(data.customers)} hint={`${staffCount} ${t('Employees')}`} icon={<Users className="size-4" />} accent="red" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('Total orders')} value={String(data.orders.total)} icon={<ShoppingBag className="size-4" />} />
        <Stat label={t('Active orders')} value={String(data.orders.active)} icon={<Clock3 className="size-4" />} accent="amber" />
        <Stat label={t('Completed orders')} value={String(data.orders.completed)} icon={<CheckCircle2 className="size-4" />} accent="green" />
        <Stat label={t('Cancelled orders')} value={String(data.orders.cancelled)} icon={<XCircle className="size-4" />} accent="red" />
      </div>

      <Card title={t('Sales by day')} description={`30 · ${data.timezone}`}>
        <Bars series={data.series} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t('Recent orders')}>
          {data.recentOrders.length === 0 ? (
            <Empty>{t('No records found.')}</Empty>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#e7e7ec]">{order.orderNumber}</p>
                    <p className="truncate text-xs text-[#7c7c87]">
                      {order.customer.name} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Pill status={order.status} label={t(statusLabel(order.status))} />
                    <span className="text-sm font-bold text-white">{money(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('Activity')}>
          {data.activity.length === 0 ? (
            <Empty>{t('No activity yet.')}</Empty>
          ) : (
            <ul className="space-y-2.5">
              {data.activity.map((log) => (
                <li key={log.id} className="flex items-start gap-2.5 text-sm">
                  <Activity className="mt-0.5 size-4 shrink-0 text-[#e8412f]" />
                  <div className="min-w-0">
                    <p className="truncate text-[#e7e7ec]">{log.detail}</p>
                    <p className="text-[11px] text-[#6d6d78]">
                      {log.actor_name} · {log.action} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.lowStock.length > 0 && (
        <Card title={t('Low stock warnings')}>
          <ul className="flex flex-wrap gap-2">
            {data.lowStock.map((item) => (
              <li
                key={item.id}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300"
              >
                <AlertTriangle className="size-3.5" /> {item.name}: {item.quantity} / {item.threshold}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
