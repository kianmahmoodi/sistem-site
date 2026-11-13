import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, ChefHat, Clock3, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime, money } from '../../lib/format';
import type { Order } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Bars, Card, Empty, Pill, Spinner, Stat } from '../../staff/ui';
import { statusLabel } from '../../staff/OrdersBoard';

type Overview = {
  today: {
    revenue: number;
    orders: number;
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    completed: number;
    cancelled: number;
  };
  series: { day: string; revenue: number }[];
  bestSellers: { name: string; quantity: number; revenue: number }[];
  cashiers: { name: string; orders: number; revenue: number }[];
  lowStock: { id: number; name: string; unit: string; quantity: number; threshold: number }[];
  recentOrders: Order[];
  timezone: string;
};

export function ManagerOverview() {
  const t = useAdminT();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Overview>('/api/staff/overview')
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);
  useRealtime(['orders', 'inventory'], load);

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!data) return <Spinner label={t('Loading…')} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Today's sales")} value={money(data.today.revenue)} hint={data.timezone} icon={<Banknote className="size-4" />} accent="green" />
        <Stat label={t('Orders today')} value={String(data.today.orders)} icon={<ShoppingBag className="size-4" />} />
        <Stat label={t('Active orders')} value={String(data.today.pending + data.today.confirmed + data.today.preparing + data.today.ready)} icon={<Clock3 className="size-4" />} accent="amber" />
        <Stat label={t('Completed orders')} value={String(data.today.completed)} icon={<CheckCircle2 className="size-4" />} accent="green" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('Pending')} value={String(data.today.pending)} icon={<Clock3 className="size-4" />} accent="amber" />
        <Stat label={t('Preparing')} value={String(data.today.preparing)} icon={<ChefHat className="size-4" />} />
        <Stat label={t('Ready')} value={String(data.today.ready)} icon={<CheckCircle2 className="size-4" />} />
        <Stat label={t('Cancelled orders')} value={String(data.today.cancelled)} icon={<AlertTriangle className="size-4" />} accent="red" />
      </div>

      <Card title={t('Sales by day')} description={`14 · ${data.timezone}`}>
        <Bars series={data.series} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t('Best-selling products')}>
          {data.bestSellers.length === 0 ? (
            <Empty>{t('No sales in this period.')}</Empty>
          ) : (
            <ul className="space-y-2.5">
              {data.bestSellers.map((item, index) => (
                <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[#e7e7ec]">
                    <span className="me-2 text-[#6d6d78]">{index + 1}.</span>
                    {item.name}
                  </span>
                  <span className="shrink-0 text-xs text-[#7c7c87]">
                    {item.quantity} · {money(item.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('Cashier performance')}>
          {data.cashiers.length === 0 ? (
            <Empty>{t('No records found.')}</Empty>
          ) : (
            <ul className="space-y-2.5">
              {data.cashiers.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[#e7e7ec]">{row.name}</span>
                  <span className="shrink-0 text-xs text-[#7c7c87]">
                    {row.orders} · {money(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

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
                  <span className="font-bold text-white">{money(order.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.lowStock.length > 0 && (
        <Card title={t('Low stock warnings')}>
          <ul className="flex flex-wrap gap-2">
            {data.lowStock.map((item) => (
              <li
                key={item.id}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300"
              >
                <AlertTriangle className="size-3.5" /> {item.name}: {item.quantity} {item.unit}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
