import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CreditCard, Lock, ShoppingBag, Tag, Truck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import type { Order, Product } from '../lib/types';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { useSettings } from '../store/settings';
import { useToast } from '../store/toast';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'address', string>>;

export function CheckoutPage() {
  const { lines, coupon, removeCoupon, totalsFor, clearCart } = useCart();
  const settings = useSettings();
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const totals = totalsFor(settings);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    paymentMethod: 'cash',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name,
      email: current.email || user.email,
      phone: current.phone || user.phone || '',
    }));
  }, [user]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Errors = {};
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (phoneDigits.length < 7 || phoneDigits.length > 15) next.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.address.trim().length < 10) next.address = 'Enter your full delivery address (street, city, ZIP).';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async () => {
    setBanner('');
    if (!validate()) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const data = await api<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: {
          ...form,
          couponCode: coupon?.code || null,
          items: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
        },
      });
      clearCart();
      push('Order placed — we are firing up the grill!');
      navigate(`/order/${data.order.orderNumber}`, { replace: true });
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : 'Could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const items = useMemo(() => lines, [lines]);

  if (items.length === 0) {
    return (
      <main id="main" className="container-page py-20">
        <div className="mx-auto max-w-md rounded-[32px] border border-line bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-cream text-brand">
            <ShoppingBag className="size-9" strokeWidth={1.6} />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Your bag is empty</h1>
          <p className="mt-2 text-sm text-muted">Add something delicious before checking out.</p>
          <Link to="/" className="btn-primary mt-6">
            Browse the menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="container-page py-10">
      <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <section className="surface-card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Checkout</h1>
          <p className="mt-1 text-sm text-muted">Delivery details, then we get cooking.</p>

          <form
            className="mt-7 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void placeOrder();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="checkout-name" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                  Full name *
                </label>
                <input
                  id="checkout-name"
                  value={form.name}
                  onChange={(event) => setField('name', event.target.value)}
                  className="field"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'error-name' : undefined}
                />
                {errors.name && (
                  <p id="error-name" className="mt-1.5 text-xs font-medium text-rose-600">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-phone" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                  Phone number *
                </label>
                <input
                  id="checkout-phone"
                  value={form.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  className="field"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="checkout-email" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Email *
              </label>
              <input
                id="checkout-email"
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                className="field"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="checkout-address" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Delivery address *
              </label>
              <textarea
                id="checkout-address"
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                rows={3}
                className="field resize-none"
                autoComplete="street-address"
                placeholder="Street, apartment, city, ZIP code"
                aria-invalid={Boolean(errors.address)}
              />
              {errors.address && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.address}</p>}
            </div>

            <div>
              <label htmlFor="checkout-notes" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Additional instructions
              </label>
              <textarea
                id="checkout-notes"
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
                rows={2}
                maxLength={500}
                className="field resize-none"
                placeholder="No onions, extra sauce, leave at the door…"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-ink-soft">Payment method</legend>
              <div className="space-y-2.5">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand/40 bg-cream/60 px-4 py-3.5">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={form.paymentMethod === 'cash'}
                    onChange={() => setField('paymentMethod', 'cash')}
                    className="mt-0.5 size-4 accent-[#F58220]"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Banknote className="size-4 text-brand" /> Cash on delivery
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Pay the driver when your order arrives.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-not-allowed items-start gap-3 rounded-2xl border border-line bg-mist/60 px-4 py-3.5 opacity-70">
                  <input type="radio" name="payment" value="online" disabled className="mt-0.5 size-4" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <CreditCard className="size-4" /> Online payment
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Card payments activate as soon as a payment provider is connected.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            {banner && (
              <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {banner}
              </p>
            )}

            <button type="submit" className="btn-primary w-full text-base" disabled={submitting}>
              <Lock className="size-4" />
              {submitting ? 'Placing order…' : `Place order · ${money(totals.total)}`}
            </button>
            <p className="text-center text-[11px] text-muted">
              No payment is taken online. Your order is confirmed by our team within minutes.
            </p>
          </form>
        </section>

        <aside className="surface-card sticky top-28 p-6">
          <h2 className="text-lg font-bold">Order summary</h2>

          <ul className="mt-4 space-y-3">
            {items.map((line) => (
              <li key={line.id} className="flex items-center gap-3">
                <img src={line.image} alt={line.name} className="size-14 rounded-xl object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{line.name}</p>
                  <p className="text-xs text-muted">
                    {line.quantity} × {money(line.price)}
                  </p>
                </div>
                <span className="text-sm font-semibold">{money(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-line pt-4">
            {coupon ? (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <span className="flex items-center gap-1.5">
                  <Tag className="size-3.5" /> {coupon.code}
                </span>
                <button type="button" onClick={removeCoupon} className="underline">
                  remove
                </button>
              </div>
            ) : null}

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd>{money(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd>-{money(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-soft">
                <dt>Delivery</dt>
                <dd>{totals.deliveryFee === 0 ? 'Free' : money(totals.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>Tax ({(settings.taxRate * 100).toFixed(0)}%)</dt>
                <dd>{money(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-brand">{money(totals.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-cream px-3.5 py-3 text-xs text-ink-soft">
            <Truck className="mt-0.5 size-4 shrink-0 text-brand" />
            <p>
              Free delivery on orders over {money(settings.freeDeliveryOver)}. Typical delivery time is 30
              minutes.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
