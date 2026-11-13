import { useEffect, useState } from 'react';
import { Banknote, Download, Printer, Receipt, ShoppingBag, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money } from '../lib/format';
import { useAdminT } from './labels';
import { useRealtime } from './useRealtime';
import { Bars, Card, Empty, Spinner, Stat, btn, btnGhost, cx } from './ui';

type Report = {
  days: number;
  timezone: string;
  summary: {
    revenue: number;
    orders: number;
    cancelled: number;
    tax: number;
    discount: number;
    delivery: number;
    average: number;
  };
  series: { day: string; revenue: number; orders: number }[];
  bestSellers: { name: string; quantity: number; revenue: number }[];
  cancelledOrders: { order_number: string; customer_name: string; total: number; cancel_reason: string | null; created_at: string }[];
  cashiers: { name: string; orders: number; revenue: number }[];
};

export function ReportsTab() {
  const t = useAdminT();
  const [data, setData] = useState<Report | null>(null);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');

  const load = () => {
    api<Report>(`/api/staff/reports?days=${days}`)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  };

  useEffect(load, [days]);
  useRealtime(['orders'], load);

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!data) return <Spinner label={t('Loading…')} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex gap-1.5">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              className={cx(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                days === value
                  ? 'border-[#e8412f] bg-[#e8412f] text-white'
                  : 'border-white/10 text-[#a4a4ae] hover:border-white/25 hover:text-white'
              )}
            >
              {t(value === 7 ? 'Last 7 days' : value === 30 ? 'Last 30 days' : 'Last 90 days')}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <a
            className={btnGhost}
            href={`/api/staff/reports/export.csv?days=${days}`}
            download
          >
            <Download className="size-4" /> {t('Export CSV (Excel)')}
          </a>
          <button type="button" className={btn} onClick={() => window.print()}>
            <Printer className="size-4" /> {t('Print / PDF')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t(days === 7 ? 'Revenue (7 days)' : days === 30 ? 'Revenue (30 days)' : 'Revenue (90 days)')}
          value={money(data.summary.revenue)}
          icon={<Banknote className="size-4" />}
          accent="green"
        />
        <Stat label={t('Total orders')} value={String(data.summary.orders)} icon={<ShoppingBag className="size-4" />} />
        <Stat label={t('Average order')} value={money(data.summary.average)} icon={<Receipt className="size-4" />} />
        <Stat label={t('Cancelled orders')} value={String(data.summary.cancelled)} icon={<XCircle className="size-4" />} accent="red" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">{t('Tax')}</p>
          <p className="mt-1 text-lg font-bold text-white">{money(data.summary.tax)}</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">{t('Discounts')}</p>
          <p className="mt-1 text-lg font-bold text-white">{money(data.summary.discount)}</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">{t('Delivery fees')}</p>
          <p className="mt-1 text-lg font-bold text-white">{money(data.summary.delivery)}</p>
        </Card>
      </div>

      <Card title={t('Sales by day')} description={`${data.days} · ${data.timezone}`}>
        <Bars series={data.series} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
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

      <Card title={t('Cancelled orders report')}>
        {data.cancelledOrders.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data.cancelledOrders.map((order) => (
              <li key={order.order_number} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-[#e7e7ec]">
                    {order.order_number} · {order.customer_name}
                  </p>
                  <p className="text-xs text-[#7c7c87]">
                    {formatDateTime(order.created_at)} · {order.cancel_reason || '—'}
                  </p>
                </div>
                <span className="font-bold text-rose-300">{money(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
