import { useCallback, useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Printer, Search, ShoppingCart, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import type { Category, Order, Product } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { usePrefs } from '../../store/prefs';
import { Card, Empty, Modal, Spinner, btn, btnGhost, cx, field } from '../../staff/ui';

type Catalog = {
  items: Product[];
  categories: Category[];
  settings: { name: string; taxRate: number; currency: string; timezone: string };
};

type CartLine = { product: Product; quantity: number };

export function PosTab() {
  const t = useAdminT();
  const { lang } = usePrefs();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'pos' | 'phone'>('pos');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [notes, setNotes] = useState('');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const load = useCallback(() => {
    api<Catalog>('/api/pos/catalog')
      .then((data) => {
        setCatalog(data);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);

  const products = useMemo(() => {
    if (!catalog) return [];
    return catalog.items.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (
        search.trim() &&
        !`${product.name} ${product.description} ${t(product.name)} ${t(product.description)}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [catalog, category, search, t]);

  const add = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: Math.min(50, line.quantity + 1) } : line
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const setQuantity = (id: number, quantity: number) => {
    setCart((current) =>
      quantity <= 0
        ? current.filter((line) => line.product.id !== id)
        : current.map((line) => (line.product.id === id ? { ...line, quantity: Math.min(50, quantity) } : line))
    );
  };

  const subtotal = cart.reduce((sum, line) => sum + line.product.finalPrice * line.quantity, 0);
  const taxRate = catalog?.settings.taxRate ?? 0;
  const tax = Math.max(0, subtotal - discount) * taxRate;
  const total = Math.max(0, subtotal - discount) + tax;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const data = await api<{ discount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: { code: coupon.trim(), subtotal },
      });
      setDiscount(data.discount);
      setCouponMessage(`${coupon.trim().toUpperCase()} −${money(data.discount)}`);
    } catch (err) {
      setDiscount(0);
      setCouponMessage(err instanceof Error ? err.message : '');
    }
  };

  const place = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    setError('');
    try {
      const data = await api<{ order: Order }>('/api/pos/orders', {
        method: 'POST',
        body: {
          items: cart.map((line) => ({ id: line.product.id, quantity: line.quantity })),
          customerName: customerName.trim() || t('Walk-in guest'),
          phone: phone.trim(),
          channel,
          paymentMethod,
          notes,
          couponCode: coupon.trim() || undefined,
        },
      });
      setReceipt(data.order);
      setCart([]);
      setCustomerName('');
      setPhone('');
      setNotes('');
      setCoupon('');
      setDiscount(0);
      setCouponMessage('');
      setPaymentMethod('cash');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    } finally {
      setPlacing(false);
    }
  };

  if (error && !catalog) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!catalog) return <Spinner label={t('Loading…')} />;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px] xl:items-start">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6d6d78]" />
            <input
              className={`${field} ps-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Search products…')}
              aria-label={t('Search')}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[{ slug: 'all', name: t('All') }, ...catalog.categories].map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setCategory(item.slug)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                category === item.slug
                  ? 'border-[#e8412f] bg-[#e8412f] text-white'
                  : 'border-white/10 bg-white/[0.03] text-[#a4a4ae] hover:border-white/25 hover:text-white'
              )}
            >
              {t(item.name)}
            </button>
          ))}
        </div>

        {products.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => add(product)}
                className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111114] text-start transition hover:border-[#e8412f]/50"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                  <img
                    src={product.image}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  {product.discountPercent > 0 && (
                    <span className="absolute end-2 top-2 rounded-full bg-[#e8412f] px-2 py-0.5 text-[10px] font-bold text-white">
                      -{product.discountPercent}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-[#e7e7ec]">{t(product.name)}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#ff8a77]">{money(product.finalPrice)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 xl:sticky xl:top-4">
        <Card title={t('Your cart')} action={<ShoppingCart className="size-4 text-[#e8412f]" />}>
          {cart.length === 0 ? (
            <Empty>{t('Tap a product to add it.')}</Empty>
          ) : (
            <ul className="space-y-2">
              {cart.map((line) => (
                <li key={line.product.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#e7e7ec]">{t(line.product.name)}</p>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.product.id, 0)}
                      aria-label={t('Delete')}
                      className="text-[#6d6d78] transition hover:text-rose-300"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                        className="grid size-7 place-items-center rounded-lg border border-white/10 text-[#c9c9d2]"
                        aria-label="-"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-white">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                        className="grid size-7 place-items-center rounded-lg border border-white/10 text-[#c9c9d2]"
                        aria-label="+"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {money(line.product.finalPrice * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-3 text-sm">
            <div className="flex justify-between text-[#a4a4ae]">
              <span>{t('Subtotal')}</span>
              <span>{money(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>{t('Discounts')}</span>
                <span>-{money(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#a4a4ae]">
              <span>{t('Tax')}</span>
              <span>{money(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.07] pt-2 text-base font-bold text-white">
              <span>{t('Total')}</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </Card>

        <Card title={t('New order')}>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('pos')}
                className={cx(
                  'rounded-lg border px-2 py-1.5 text-xs font-semibold transition',
                  channel === 'pos' ? 'border-[#e8412f] bg-[#e8412f]/15 text-white' : 'border-white/10 text-[#a4a4ae]'
                )}
              >
                {t('In-store')}
              </button>
              <button
                type="button"
                onClick={() => setChannel('phone')}
                className={cx(
                  'rounded-lg border px-2 py-1.5 text-xs font-semibold transition',
                  channel === 'phone' ? 'border-[#e8412f] bg-[#e8412f]/15 text-white' : 'border-white/10 text-[#a4a4ae]'
                )}
              >
                {t('Phone order')}
              </button>
            </div>
            <input className={field} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('Customer name')} />
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('Phone number')} inputMode="tel" />
            <div className="flex gap-2">
              <input className={field} value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t('Discount code')} />
              <button type="button" className={btnGhost} onClick={() => void applyCoupon()}>
                {t('Apply')}
              </button>
            </div>
            {couponMessage && <p className="text-[11px] font-semibold text-emerald-400">{couponMessage}</p>}
            <textarea
              rows={2}
              className={`${field} resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Order notes…')}
            />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['cash', 'Cash'],
                  ['card', 'Card reader'],
                  ['online', 'Online payment'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={cx(
                    'rounded-lg border px-2 py-2 text-[11px] font-semibold transition',
                    paymentMethod === value
                      ? 'border-[#e8412f] bg-[#e8412f]/15 text-white'
                      : 'border-white/10 text-[#a4a4ae] hover:text-white'
                  )}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
            <button
              type="button"
              className={`${btn} w-full`}
              disabled={placing || cart.length === 0}
              onClick={() => void place()}
            >
              {placing ? t('Placing…') : `${t('Place order')} · ${money(total)}`}
            </button>
          </div>
        </Card>
      </div>

      {receipt && (
        <Modal title={t('Order placed')} onClose={() => setReceipt(null)}>
          <div className="receipt-print rounded-xl bg-white p-5 text-[#16161a]">
            <p className="text-center text-lg font-extrabold">{catalog.settings.name}</p>
            <p className="text-center text-[11px]">{new Date(receipt.createdAt).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US')}</p>
            <p className="mt-3 text-center text-sm font-bold">{receipt.orderNumber}</p>
            <ul className="mt-3 space-y-1 border-y border-dashed border-[#c9c9cf] py-2 text-xs">
              {receipt.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>
                    {item.quantity} × {t(item.name)}
                  </span>
                  <span>{money(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <dt>{t('Subtotal')}</dt>
                <dd>{money(receipt.subtotal)}</dd>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between">
                  <dt>{t('Discounts')}</dt>
                  <dd>-{money(receipt.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>{t('Tax')}</dt>
                <dd>{money(receipt.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-[#c9c9cf] pt-1 text-sm font-bold">
                <dt>{t('Total')}</dt>
                <dd>{money(receipt.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-center text-[11px]">
              {t('Payment')}: {receipt.paymentMethod} · {receipt.customer.name}
            </p>
            <p className="mt-1 text-center text-[10px]">Burger House · {catalog.settings.timezone}</p>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setReceipt(null)}>
              {t('Close')}
            </button>
            <button type="button" className={btn} onClick={() => window.print()}>
              <Printer className="size-4" /> {t('Print receipt')}
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setReceipt(null);
                setCart([]);
              }}
            >
              <CheckCircle2 className="size-4" /> {t('New sale')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
