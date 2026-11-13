import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ChefHat, CircleDot, MapPin, Phone, ReceiptText, Timer, Truck, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money } from '../lib/format';
import type { Order } from '../lib/types';
import { usePrefs } from '../store/prefs';

const steps = [
  { key: 'pending', label: 'Pending', icon: CircleDot },
  { key: 'confirmed', label: 'Confirmed', icon: ReceiptText },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Truck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export function OrderPage() {
  const { orderNumber = '' } = useParams();
  const { t } = usePrefs();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<{ order: Order }>(`/api/orders/${encodeURIComponent(orderNumber)}`)
      .then((data) => {
        if (active) setOrder(data.order);
      })
      .catch(() => {
        if (active) setError('We could not find that order. Check the order number and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <main id="main" className="container-page py-20">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="skeleton h-28 w-full rounded-4xl" />
          <div className="skeleton h-64 w-full rounded-4xl" />
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main id="main" className="container-page py-20">
        <div className="mx-auto max-w-md rounded-[32px] border border-line bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-rose-50 text-rose-500">
            <XCircle className="size-8" />
          </span>
          <h1 className="mt-4 text-xl font-bold">{t('Order not found')}</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Link to="/" className="btn-primary mt-6">
            {t('Back to home')}
          </Link>
        </div>
      </main>
    );
  }

  const cancelled = order.status === 'cancelled';
  const normalizedStatus = order.status === 'delivered' ? 'completed' : order.status;
  const currentIndex = steps.findIndex((step) => step.key === normalizedStatus);

  return (
    <main id="main" className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[32px] bg-gradient-to-br from-brand to-brand-deep px-6 py-8 text-white shadow-soft sm:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/20">
                <CheckCircle2 className="size-8" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">{t('Thank you')}</p>
                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Order {order.orderNumber}</h1>
                <p className="mt-1 text-sm text-white/85">
                  Placed {formatDateTime(order.createdAt)} · {order.items.length} item
                  {order.items.length === 1 ? '' : 's'} · {money(order.total)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border border-line bg-white/95 text-ink">{order.statusLabel}</span>
              {!cancelled && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold">
                  <Timer className="size-3.5" /> 30 min delivery
                </span>
              )}
            </div>
          </div>
        </div>

        <section className="surface-card mt-5 p-6 sm:p-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{t('Order status')}</h2>
          {cancelled ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              <XCircle className="size-4" /> {t('This order was cancelled. Contact us if you need help.')}
            </p>
          ) : (
            <ol className="mt-5 grid gap-4 sm:grid-cols-5">
              {steps.map((step, index) => {
                const done = index <= currentIndex;
                return (
                  <li key={step.key} className="flex items-center gap-3 sm:flex-col sm:text-center">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full border-2 transition ${
                        done ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
                      }`}
                    >
                      <step.icon className="size-4" />
                    </span>
                    <div>
                      <p className={`text-xs font-semibold ${done ? 'text-ink' : 'text-muted'}`}>{t(step.label)}</p>
                      <p className="hidden text-[10px] text-muted sm:block">
                        {done ? t('Done') : t('Waiting')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <section className="surface-card p-6 sm:p-8">
            <h2 className="text-lg font-bold">{t('Your items')}</h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <img src={item.image} alt={item.name} className="size-14 rounded-xl object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.quantity} × {money(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{money(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>{t('Subtotal')}</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>{t('Discount')} {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd>-{money(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-soft">
                <dt>{t('Delivery')}</dt>
                <dd>{order.deliveryFee === 0 ? t('Free') : money(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>{t('Tax')}</dt>
                <dd>{money(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-line pt-3 text-base font-bold">
                <dt>{t('Total')}</dt>
                <dd className="text-brand">{money(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-lg font-bold">{t('Delivery details')}</h2>
            <div className="mt-4 space-y-3 text-sm text-ink-soft">
              <p className="font-semibold text-ink">{order.customer.name}</p>
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand" /> {order.customer.phone}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> {order.customer.address}
              </p>
              {order.customer.notes && (
                <p className="rounded-xl bg-mist px-3 py-2 text-xs">“{order.customer.notes}”</p>
              )}
              <p className="rounded-xl bg-cream px-3 py-2 text-xs font-medium text-ink">
                {t('Payment')}: {order.paymentMethod === 'cash' ? t('Cash on delivery') : order.paymentMethod === 'card' ? t('Card reader') : t('Online payment')}
              </p>
            </div>

            <Link to="/" className="btn-primary mt-5 w-full">
              {t('Order something else')}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
