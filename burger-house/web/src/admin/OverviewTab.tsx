import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, PackageSearch, ShoppingBag, Star, Users } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money, statusTone } from '../lib/format';
import type { Order } from '../lib/types';
import { useToast } from '../store/toast';
import { EmptyState, Panel, StatCard } from './ui';

type Stats = {
  revenue: number;
  orders: number;
  pendingOrders: number;
  customers: number;
  pendingReviews: number;
  bestSellers: { name: string; quantity: number; revenue: number }[];
  recentOrders: Order[];
};

export function OverviewTab() {
  const { push } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/api/admin/stats')
      .then(setStats)
      .catch(() => push('Could not load dashboard stats', 'error'));
  }, [push]);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-3xl" />
        ))}
      </div>
    );
  }

  const maxQuantity = Math.max(1, ...stats.bestSellers.map((item) => item.quantity));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total sales"
          value={money(stats.revenue)}
          hint={`${stats.orders} paid orders`}
          icon={<Banknote className="size-5" />}
          accent="brand"
        />
        <StatCard
          label="Total orders"
          value={String(stats.orders)}
          hint="Excluding cancelled"
          icon={<ShoppingBag className="size-5" />}
        />
        <StatCard
          label="Pending orders"
          value={String(stats.pendingOrders)}
          hint="Needs kitchen attention"
          icon={<PackageSearch className="size-5" />}
          accent="ink"
        />
        <StatCard
          label="Customers"
          value={String(stats.customers)}
          hint={`${stats.pendingReviews} reviews awaiting approval`}
          icon={<Users className="size-5" />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Best-selling products" description="Ranked by units sold">
          {stats.bestSellers.length === 0 ? (
            <EmptyState message="No sales yet — your best sellers will appear here." />
          ) : (
            <ul className="space-y-3">
              {stats.bestSellers.map((item, index) => (
                <li key={item.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {index + 1}. {item.name}
                    </span>
                    <span className="text-xs text-muted">
                      {item.quantity} sold · {money(item.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent orders"
          description="Latest activity from your guests"
          action={
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
              <Star className="size-3.5 text-brand" fill="currentColor" /> live
            </span>
          }
        >
          {stats.recentOrders.length === 0 ? (
            <EmptyState message="No orders yet." />
          ) : (
            <ul className="divide-y divide-line">
              {stats.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted">
                      {order.customer.name} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`badge border ${statusTone[order.status] || 'border-line'}`}>
                      {order.statusLabel}
                    </span>
                    <span className="text-sm font-bold">{money(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/orders" className="mt-4 inline-block text-xs font-semibold text-brand hover:underline">
            Manage all orders →
          </Link>
        </Panel>
      </div>
    </div>
  );
}
