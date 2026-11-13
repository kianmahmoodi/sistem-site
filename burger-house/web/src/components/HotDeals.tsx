import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, Star, Truck, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { money } from '../lib/format';
import type { Product } from '../lib/types';
import { useCart } from '../store/cart';
import { usePrefs } from '../store/prefs';
import { useSettings } from '../store/settings';
import type { Settings } from '../lib/types';
import { Reveal } from './Reveal';

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt || Date.now()).getTime() - Date.now());

  useEffect(() => {
    setRemaining(new Date(endsAt || Date.now()).getTime() - Date.now());
    const timer = window.setInterval(() => {
      setRemaining(new Date(endsAt || Date.now()).getTime() - Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const clamped = Math.max(0, remaining);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped / 3_600_000) % 24),
    minutes: Math.floor((clamped / 60_000) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    expired: clamped <= 0,
  };
}

function findDealProduct(deal: Settings['deal']): Promise<Product | null> {
  const params = new URLSearchParams({ q: 'Combo', limit: '1' });
  return api<{ items: Product[] }>(`/api/products?${params.toString()}`)
    .then((data) => data.items[0] || null)
    .catch(() => null);
}

export function HotDeals() {
  const settings = useSettings();
  const { deal } = settings;
  const { addItem, openCart } = useCart();
  const { t } = usePrefs();
  const [product, setProduct] = useState<Product | null>(null);
  const countdown = useCountdown(deal.endsAt);
  const saving = Math.max(0, deal.originalPrice - deal.comboPrice);
  const percent = deal.originalPrice > 0 ? Math.round((saving / deal.originalPrice) * 100) : 0;

  useEffect(() => {
    let active = true;
    void findDealProduct(deal).then((found) => {
      if (active) setProduct(found);
    });
    return () => {
      active = false;
    };
  }, [deal]);

  const orderCombo = () => {
    if (!product) {
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    addItem(product);
    openCart();
  };

  const units = [
    { label: 'Days', value: countdown.days },
    { label: 'Hours', value: countdown.hours },
    { label: 'Mins', value: countdown.minutes },
    { label: 'Secs', value: countdown.seconds },
  ];

  return (
    <section id="deals" className="scroll-mt-24 pb-4">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[36px] bg-cream px-6 py-10 sm:px-10 lg:rounded-[48px] lg:px-14 lg:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/10 blur-2xl"
            />
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand shadow-sm">
                  <Zap className="size-3.5" /> {t('Limited time')}
                </span>
                <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight">
                  {t(deal.title)}
                </h2>
                <p className="mt-1 text-base font-semibold text-ink-soft">{t(deal.subtitle)}</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t(deal.description)}</p>

                <div className="mt-6 flex flex-wrap items-end gap-3">
                  <span className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-none text-brand">
                    {money(deal.comboPrice)}
                  </span>
                  <span className="pb-1 text-base font-medium text-muted line-through">
                    {money(deal.originalPrice)}
                  </span>
                  {percent > 0 && (
                    <span className="badge mb-1 bg-danger text-white">{t('Save {percent}%', { percent })}</span>
                  )}
                </div>

                {!countdown.expired ? (
                  <div className="mt-6 flex items-center gap-2.5" aria-label="Offer countdown">
                    {units.map((unit) => (
                      <div
                        key={unit.label}
                        className="w-16 rounded-2xl bg-white px-2 py-2.5 text-center shadow-sm sm:w-[70px]"
                      >
                        <p className="text-lg font-extrabold tabular-nums leading-none text-ink">
                          {String(unit.value).padStart(2, '0')}
                        </p>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                          {t(unit.label)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink-soft">
                    <Clock3 className="size-4 text-brand" />{' '}
                    {t('New deal drops every week — order while it lasts.')}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-5 text-xs font-semibold text-ink-soft">
                  {deal.freeDelivery && (
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="size-4 text-success" /> {t('Free delivery included')}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="size-4 text-brand" fill="currentColor" />{' '}
                    {t('5.0 rated by 620 guests')}
                  </span>
                </div>

                <button type="button" onClick={orderCombo} className="btn-primary group mt-7">
                  {t('Order This Combo')}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:rotate-180" />
                </button>
              </div>

              <div className="relative mx-auto w-full max-w-[460px]">
                <div className="relative overflow-hidden rounded-[32px] bg-white shadow-soft">
                  <img
                    src="/img/combo-pack.jpg"
                    alt="Combo pack with burger, fries and a cold drink"
                    loading="lazy"
                    className="aspect-[4/3.4] w-full object-cover transition duration-700 hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink shadow-sm">
                    {deal.freeDelivery ? t('Free delivery') : t('Chef’s pick')}
                  </span>
                  <span className="absolute right-4 top-4 rounded-full bg-danger px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white shadow-sm">
                    {t('Combo Pack')}
                  </span>
                </div>

                <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 shadow-soft">
                  <Star className="size-4 text-brand" fill="currentColor" />
                  <span className="text-sm font-bold">5.0</span>
                  <span className="text-xs text-muted">· {t('620 reviews')}</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
