import { useCallback, useEffect, useState } from 'react';
import { Ban, ChevronRight, Eye, RefreshCcw, Search } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money } from '../lib/format';
import type { Order } from '../lib/types';
import { useAdminT } from './labels';
import { useRealtime } from './useRealtime';
import { Empty, Modal, Pill, Spinner, btn, btnDanger, btnGhost, cx, field } from './ui';

const FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

const STATUS_KEYS = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];

export function statusLabel(status: string) {
  return STATUS_KEYS.find((label) => label.toLowerCase() === status) || status;
}

export function OrdersBoard({
  endpoint,
  query = '',
  canCancel = false,
  canAdvance = false,
  emptyMessage,
}: {
  endpoint: string;
  query?: string;
  canCancel?: boolean;
  canAdvance?: boolean;
  emptyMessage?: string;
}) {
  const t = useAdminT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (term) params.set('q', term);
      const result = await api<{ items: Order[] }>(`${endpoint}?${params.toString()}${query ? `&${query}` : ''}`);
      setOrders(result.items);
      setError('');
    } catch {
      setError(t('Could not load data.'));
    } finally {
      setLoading(false);
    }
  }, [endpoint, query, status, term, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(['orders'], () => void load());

  const advance = async (order: Order) => {
    const index = FLOW.indexOf(order.status);
    const next = FLOW[index + 1];
    if (!next) return;
    setBusy(true);
    try {
      await api(`${endpoint}/${order.id}/status`, { method: 'PATCH', body: { status: next } });
      await load();
      setSelected(null);
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!cancelling) return;
    if (reason.trim().length < 3) {
      setError(t('Please give a reason for the cancellation.'));
      return;
    }
    setBusy(true);
    try {
      await api(`${endpoint}/${cancelling.id}/cancel`, { method: 'POST', body: { reason } });
      setCancelling(null);
      setReason('');
      setSelected(null);
      await load();
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6d6d78]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setTerm(search.trim());
            }}
            placeholder={t('Search orders, customers…')}
            className={`${field} ps-9`}
            aria-label={t('Search')}
          />
        </div>
        <button type="button" className={btnGhost} onClick={() => setTerm(search.trim())}>
          {t('Search')}
        </button>
        <button type="button" className={btnGhost} onClick={() => void load()} aria-label={t('Refresh')}>
          <RefreshCcw className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['all', ...FLOW, 'cancelled'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              status === key
                ? 'border-[#e8412f] bg-[#e8412f] text-white'
                : 'border-white/10 bg-white/[0.03] text-[#a4a4ae] hover:border-white/25 hover:text-white'
            )}
          >
            {key === 'all' ? t('All') : t(statusLabel(key))}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>}

      {loading ? (
        <Spinner label={t('Loading…')} />
      ) : orders.length === 0 ? (
        <Empty>{emptyMessage ? t(emptyMessage) : t('No records found.')}</Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111114]">
          <table className="w-full text-start text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.12em] text-[#7c7c87]">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">#</th>
                <th className="px-4 py-3 text-start font-semibold">{t('Customer')}</th>
                <th className="hidden px-4 py-3 text-start font-semibold md:table-cell">{t('Created')}</th>
                <th className="hidden px-4 py-3 text-start font-semibold sm:table-cell">{t('Items')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('Total')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('Status')}</th>
                <th className="px-4 py-3 text-end font-semibold">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {orders.map((order) => (
                <tr key={order.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="font-semibold text-white hover:text-[#ff7a68]"
                    >
                      {order.orderNumber}
                    </button>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-[#6d6d78]">
                      {order.channel === 'pos' ? t('POS') : order.channel === 'phone' ? t('Phone') : t('Online')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#e7e7ec]">{order.customer.name}</p>
                    <p className="text-xs text-[#7c7c87]">{order.customer.phone}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[#a4a4ae] md:table-cell">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[#a4a4ae] sm:table-cell">{order.items.length}</td>
                  <td className="px-4 py-3 font-bold text-white">{money(order.total)}</td>
                  <td className="px-4 py-3">
                    <Pill status={order.status} label={t(statusLabel(order.status))} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelected(order)}
                        aria-label={t('View')}
                        className="grid size-8 place-items-center rounded-lg border border-white/10 text-[#a4a4ae] transition hover:border-white/30 hover:text-white"
                      >
                        <Eye className="size-4" />
                      </button>
                      {canAdvance && FLOW.includes(order.status) && order.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => void advance(order)}
                          disabled={busy}
                          aria-label={t('Update status')}
                          className="grid size-8 place-items-center rounded-lg border border-[#e8412f]/40 bg-[#e8412f]/10 text-[#ff8a77] transition hover:bg-[#e8412f]/25 disabled:opacity-50"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      )}
                      {canCancel && order.status !== 'cancelled' && order.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelling(order);
                            setReason('');
                          }}
                          aria-label={t('Cancel order')}
                          className="grid size-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 transition hover:bg-rose-500/15"
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={`${selected.orderNumber}`} onClose={() => setSelected(null)} wide>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c7c87]">{t('Customer')}</p>
              <p className="mt-1 font-semibold text-white">{selected.customer.name}</p>
              <p className="text-[#a4a4ae]">{selected.customer.phone}</p>
              <p className="text-xs text-[#7c7c87]">{selected.customer.address}</p>
              {selected.customer.notes && (
                <p className="mt-2 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-xs text-[#c9c9d2]">
                  “{selected.customer.notes}”
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c7c87]">{t('Status')}</p>
                <Pill status={selected.status} label={t(statusLabel(selected.status))} />
              </div>
              <p className="mt-2 text-xs text-[#a4a4ae]">
                {t('Payment')}: {selected.paymentMethod} ({selected.paymentStatus})
              </p>
              <p className="text-xs text-[#a4a4ae]">
                {t('Created')}: {formatDateTime(selected.createdAt)}
              </p>
              {selected.cashierName && <p className="text-xs text-[#a4a4ae]">{t('Cashier')}: {selected.cashierName}</p>}
              {selected.cancelReason && <p className="mt-2 text-xs text-rose-300">{t('Reason')}: {selected.cancelReason}</p>}
            </div>
          </div>

          <ul className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/10">
            {selected.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-[#e7e7ec]">{t(item.name)}</span>
                <span className="text-xs text-[#7c7c87]">
                  {item.quantity} × {money(item.unitPrice)}
                </span>
                <span className="font-semibold text-white">{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 ms-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-[#a4a4ae]">
              <dt>{t('Subtotal')}</dt>
              <dd>{money(selected.subtotal)}</dd>
            </div>
            {selected.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>{t('Discounts')}</dt>
                <dd>-{money(selected.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-[#a4a4ae]">
              <dt>{t('Delivery fees')}</dt>
              <dd>{money(selected.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between text-[#a4a4ae]">
              <dt>{t('Tax')}</dt>
              <dd>{money(selected.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
              <dt>{t('Total')}</dt>
              <dd>{money(selected.total)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {canCancel && selected.status !== 'cancelled' && selected.status !== 'completed' && (
              <button
                type="button"
                className={btnDanger}
                onClick={() => {
                  setCancelling(selected);
                  setReason('');
                }}
              >
                <Ban className="size-4" /> {t('Cancel order')}
              </button>
            )}
            {canAdvance && FLOW.includes(selected.status) && selected.status !== 'completed' && (
              <button type="button" className={btn} disabled={busy} onClick={() => void advance(selected)}>
                {t('Update status')}
              </button>
            )}
          </div>
        </Modal>
      )}

      {cancelling && (
        <Modal title={t('Cancel order')} onClose={() => setCancelling(null)}>
          <p className="text-sm text-[#a4a4ae]">
            {cancelling.orderNumber} · {cancelling.customer.name}
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Cancellation reason')}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className={`${field} resize-none`}
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setCancelling(null)}>
              {t('Cancel')}
            </button>
            <button type="button" className={btnDanger} disabled={busy} onClick={() => void cancel()}>
              {t('Confirm cancellation')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
