import { Fragment, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money, statusTone } from '../lib/format';
import type { Order } from '../lib/types';
import { useToast } from '../store/toast';
import { EmptyState, Panel } from './ui';

const statuses = [
  { value: 'all', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OrdersTab() {
  const { push } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ status, page: '1' });
    if (query) params.set('q', query);
    api<{ items: Order[]; total: number }>(`/api/admin/orders?${params.toString()}`)
      .then((data) => {
        if (!active) return;
        setOrders(data.items);
        setTotal(data.total);
      })
      .catch(() => push('Could not load orders', 'error'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, query, push]);

  const updateStatus = async (id: number, next: string) => {
    try {
      const updated = await api<Order>(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: { status: next },
      });
      setOrders((current) => current.map((order) => (order.id === id ? updated : order)));
      push(`Order ${updated.orderNumber} → ${updated.statusLabel}`);
    } catch {
      push('Could not update the order status', 'error');
    }
  };

  return (
    <Panel
      title="Orders"
      description={`${total} order${total === 1 ? '' : 's'} in this view`}
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order, name, phone…"
            aria-label="Search orders"
            className="field py-2 text-xs sm:w-56"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="field py-2 text-xs sm:w-44"
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState message="No orders match these filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Order</th>
                <th className="pb-2 font-semibold">Customer</th>
                <th className="pb-2 font-semibold">Placed</th>
                <th className="pb-2 font-semibold">Items</th>
                <th className="pb-2 font-semibold">Total</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr className="align-middle">
                    <td className="py-3 font-semibold">{order.orderNumber}</td>
                    <td className="py-3">
                      <p className="font-medium">{order.customer.name}</p>
                      <p className="text-xs text-muted">{order.customer.phone}</p>
                    </td>
                    <td className="py-3 text-xs text-muted">{formatDateTime(order.createdAt)}</td>
                    <td className="py-3 text-xs">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="py-3 font-semibold">{money(order.total)}</td>
                    <td className="py-3">
                      <span className={`badge border ${statusTone[order.status] || 'border-line'}`}>
                        {order.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-brand/40 hover:text-brand"
                      >
                        {expanded === order.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>

                  {expanded === order.id && (
                    <tr key={`${order.id}-details`}>
                      <td colSpan={7} className="bg-cream/40 px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-muted">Items</p>
                            <ul className="mt-2 space-y-1.5 text-sm">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex justify-between gap-3">
                                  <span>
                                    {item.quantity} × {item.name}
                                  </span>
                                  <span className="font-medium">{money(item.lineTotal)}</span>
                                </li>
                              ))}
                            </ul>
                            <dl className="mt-3 space-y-1 border-t border-line pt-2 text-xs text-ink-soft">
                              <div className="flex justify-between">
                                <dt>Subtotal</dt>
                                <dd>{money(order.subtotal)}</dd>
                              </div>
                              {order.discount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                  <dt>Discount {order.couponCode}</dt>
                                  <dd>-{money(order.discount)}</dd>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <dt>Delivery</dt>
                                <dd>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt>Tax</dt>
                                <dd>{money(order.tax)}</dd>
                              </div>
                              <div className="flex justify-between font-bold text-ink">
                                <dt>Total</dt>
                                <dd>{money(order.total)}</dd>
                              </div>
                            </dl>
                          </div>

                          <div className="space-y-2 text-xs text-ink-soft">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted">Delivery</p>
                            <p className="font-semibold text-ink">{order.customer.name}</p>
                            <p>{order.customer.phone}</p>
                            <p>{order.customer.email}</p>
                            <p>{order.customer.address}</p>
                            {order.customer.notes && <p className="italic">“{order.customer.notes}”</p>}
                            <p className="pt-1">
                              Payment: {order.paymentMethod === 'cash' ? 'Cash on delivery' : 'Online'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(event) => void updateStatus(order.id, event.target.value)}
                            aria-label={`Update status for ${order.orderNumber}`}
                            className="field w-auto py-2 text-xs"
                          >
                            {statuses
                              .filter((option) => option.value !== 'all')
                              .map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                          </select>
                          {order.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(order.id, 'cancelled')}
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="size-3.5" /> Cancel order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
