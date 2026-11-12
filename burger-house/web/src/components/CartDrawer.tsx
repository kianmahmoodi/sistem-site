import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import { useCart } from '../store/cart';
import { usePrefs } from '../store/prefs';
import { useSettings } from '../store/settings';
import { useToast } from '../store/toast';

export function CartDrawer() {
  const { lines, isOpen, closeCart, setQuantity, removeItem, coupon, applyCoupon, removeCoupon, totalsFor } =
    useCart();
  const settings = useSettings();
  const { push } = useToast();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const totals = totalsFor(settings);
  const remaining = Math.max(0, settings.freeDeliveryOver - totals.subtotal);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  const applyCode = async () => {
    const value = code.trim();
    if (!value) return;
    setApplying(true);
    try {
      const result = await api<{ code: string; kind: 'percent' | 'fixed'; value: number }>(
        '/api/coupons/validate',
        { method: 'POST', body: { code: value, subtotal: totals.subtotal } }
      );
      applyCoupon({ code: result.code, kind: result.kind, value: result.value });
      setCode('');
      push(t('Discount code {code} applied', { code: result.code }));
    } catch (error) {
      push(error instanceof ApiError ? error.message : t('Could not apply that code'), 'error');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75]">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCart}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
        style={{ animation: 'fade-in 0.2s ease-out' }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-white shadow-[-30px_0_80px_-40px_rgba(37,37,37,0.6)]"
        style={{ animation: 'slide-in-right 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-cream text-brand">
              <ShoppingBag className="size-[18px]" />
            </span>
            <div>
              <h2 className="text-base font-bold leading-tight">{t('Your Bag')}</h2>
              <p className="text-xs text-muted">
                {t('{count} items', { count: totals.itemCount })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid size-9 place-items-center rounded-full bg-mist text-ink transition hover:bg-cream hover:text-brand"
          >
            <X className="size-4" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-cream text-brand">
              <ShoppingBag className="size-9" strokeWidth={1.6} />
            </span>
            <div>
              <p className="text-lg font-semibold">{t('Your bag is empty')}</p>
              <p className="mt-1 text-sm text-muted">{t('Add a burger and we will get grilling.')}</p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                closeCart();
                document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('Browse the menu')}
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-line bg-cream/60 px-5 py-3">
              {remaining > 0 ? (
                <p className="text-xs font-medium text-ink-soft">
                  {t('Add {amount} more for free delivery', { amount: money(remaining) })}
                </p>
              ) : (
                <p className="text-xs font-semibold text-success">{t('You unlocked free delivery 🎉')}</p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totals.subtotal / settings.freeDeliveryOver) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-3 rounded-2xl border border-line/80 p-2.5">
                  <img
                    src={line.image}
                    alt={line.name}
                    className="size-[70px] shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{line.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(line.id)}
                        aria-label={`Remove ${line.name}`}
                        className="text-muted transition hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted">
                      {money(line.price)} {t('each')}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 rounded-full border border-line">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.id, line.quantity - 1)}
                          aria-label={`Decrease ${line.name} quantity`}
                          className="grid size-7 place-items-center rounded-full transition hover:bg-mist"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.id, line.quantity + 1)}
                          aria-label={`Increase ${line.name} quantity`}
                          className="grid size-7 place-items-center rounded-full transition hover:bg-mist"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold">{money(line.price * line.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-line px-5 py-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <span className="flex items-center gap-2">
                    <Tag className="size-3.5" /> {t('{code} applied', { code: coupon.code })}
                  </span>
                  <button type="button" onClick={removeCoupon} className="underline">
                    {t('remove')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void applyCode();
                    }}
                    placeholder={t('Discount code')}
                    aria-label={t('Discount code')}
                    className="field py-2.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={applyCode}
                    disabled={applying || !code.trim()}
                    className="btn-soft shrink-0 px-4 py-2.5 text-xs"
                  >
                    {applying ? t('Checking…') : t('Apply')}
                  </button>
                </div>
              )}

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('Subtotal')}</dt>
                  <dd>{money(totals.subtotal)}</dd>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <dt>{t('Discount')}</dt>
                    <dd>-{money(totals.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('Delivery fee')}</dt>
                  <dd>{totals.deliveryFee === 0 ? t('Free') : money(totals.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('Tax ({rate}%)', { rate: (settings.taxRate * 100).toFixed(0) })}</dt>
                  <dd>{money(totals.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-dashed border-line pt-2 text-base font-bold">
                  <dt>{t('Total')}</dt>
                  <dd className="text-brand">{money(totals.total)}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  closeCart();
                  navigate('/checkout');
                }}
              >
                {t('Checkout')}
              </button>
              <button type="button" onClick={closeCart} className="w-full text-center text-xs font-semibold text-muted hover:text-brand">
                {t('Continue shopping')}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
