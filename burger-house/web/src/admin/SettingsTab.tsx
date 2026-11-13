import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Settings } from '../lib/types';
import { useToast } from '../store/toast';
import { EmptyState, Field, Panel } from './ui';

type Coupon = {
  id: number;
  code: string;
  kind: 'percent' | 'fixed';
  value: string;
  min_subtotal: string;
  active: boolean;
};

const imageChoices = [
  '/img/hero-burger.jpg',
  '/img/burger-1.jpg',
  '/img/burger-2.jpg',
  '/img/burger-3.jpg',
  '/img/burger-6.jpg',
  '/img/combo-pack.jpg',
];

const toLocalInput = (iso: string) => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function SettingsTab() {
  const { push } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', kind: 'percent', value: '10', minSubtotal: '0' });

  useEffect(() => {
    api<Settings>('/api/admin/settings')
      .then(setSettings)
      .catch(() => push('Could not load settings', 'error'));
    api<{ items: Coupon[] }>('/api/admin/coupons')
      .then((data) => setCoupons(data.items))
      .catch(() => undefined);
  }, [push]);

  if (!settings) {
    return <div className="skeleton h-72 rounded-3xl" />;
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api<Settings>('/api/admin/settings', { method: 'PUT', body: settings });
      setSettings(updated);
      push('Restaurant settings saved');
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCoupon = async () => {
    try {
      const created = await api<Coupon>('/api/admin/coupons', {
        method: 'POST',
        body: {
          code: couponForm.code,
          kind: couponForm.kind,
          value: Number(couponForm.value),
          minSubtotal: Number(couponForm.minSubtotal) || 0,
        },
      });
      setCoupons((current) => [created, ...current]);
      setCouponForm({ code: '', kind: 'percent', value: '10', minSubtotal: '0' });
      push('Discount code created');
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'Could not create the code', 'error');
    }
  };

  const removeCoupon = async (coupon: Coupon) => {
    try {
      await api(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' });
      setCoupons((current) => current.filter((item) => item.id !== coupon.id));
      push('Discount code removed');
    } catch {
      push('Could not remove the code', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Panel
        title="Restaurant settings"
        description="Everything here is live on the customer website"
        action={
          <button type="button" onClick={save} className="btn-primary py-2 text-xs" disabled={saving}>
            <Save className="size-4" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Restaurant name">
            <input value={settings.name} onChange={(event) => update('name', event.target.value)} className="field" />
          </Field>
          <Field label="Tagline">
            <input value={settings.tagline} onChange={(event) => update('tagline', event.target.value)} className="field" />
          </Field>
          <Field label="Phone number">
            <input value={settings.phone} onChange={(event) => update('phone', event.target.value)} className="field" />
          </Field>
          <Field label="Email">
            <input value={settings.email} onChange={(event) => update('email', event.target.value)} className="field" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input value={settings.address} onChange={(event) => update('address', event.target.value)} className="field" />
          </Field>
          <Field label="Opening hours" className="sm:col-span-2">
            <input value={settings.hours} onChange={(event) => update('hours', event.target.value)} className="field" />
          </Field>
          <Field label="Delivery fee (USD)">
            <input
              value={String(settings.deliveryFee)}
              onChange={(event) => update('deliveryFee', Number(event.target.value) || 0)}
              className="field"
              inputMode="decimal"
            />
          </Field>
          <Field label="Free delivery over (USD)">
            <input
              value={String(settings.freeDeliveryOver)}
              onChange={(event) => update('freeDeliveryOver', Number(event.target.value) || 0)}
              className="field"
              inputMode="decimal"
            />
          </Field>
          <Field label="Tax rate (%)">
            <input
              value={String(Math.round(settings.taxRate * 1000) / 10)}
              onChange={(event) => update('taxRate', (Number(event.target.value) || 0) / 100)}
              className="field"
              inputMode="decimal"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {(['facebook', 'instagram', 'twitter', 'tiktok'] as const).map((network) => (
              <Field key={network} label={network[0].toUpperCase() + network.slice(1)}>
                <input
                  value={settings.social[network] || ''}
                  onChange={(event) => update('social', { ...settings.social, [network]: event.target.value })}
                  className="field text-xs"
                  placeholder={`https://${network}.com/burgerhouse`}
                />
              </Field>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Hero banners" description="The five slides at the top of the homepage">
        <div className="space-y-4">
          {settings.hero.map((slide, index) => (
            <div key={index} className="rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Slide {index + 1}</p>
                <span className="text-[11px] text-muted">{slide.title}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Eyebrow">
                  <input
                    value={slide.eyebrow}
                    onChange={(event) => {
                      const hero = [...settings.hero];
                      hero[index] = { ...slide, eyebrow: event.target.value };
                      update('hero', hero);
                    }}
                    className="field text-xs"
                  />
                </Field>
                <Field label="Title">
                  <input
                    value={slide.title}
                    onChange={(event) => {
                      const hero = [...settings.hero];
                      hero[index] = { ...slide, title: event.target.value };
                      update('hero', hero);
                    }}
                    className="field text-xs"
                  />
                </Field>
                <Field label="Subtitle">
                  <input
                    value={slide.subtitle}
                    onChange={(event) => {
                      const hero = [...settings.hero];
                      hero[index] = { ...slide, subtitle: event.target.value };
                      update('hero', hero);
                    }}
                    className="field text-xs"
                  />
                </Field>
                <Field label="Starting price">
                  <input
                    value={String(slide.price)}
                    onChange={(event) => {
                      const hero = [...settings.hero];
                      hero[index] = { ...slide, price: Number(event.target.value) || 0 };
                      update('hero', hero);
                    }}
                    className="field text-xs"
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Note" className="sm:col-span-2">
                  <input
                    value={slide.note}
                    onChange={(event) => {
                      const hero = [...settings.hero];
                      hero[index] = { ...slide, note: event.target.value };
                      update('hero', hero);
                    }}
                    className="field text-xs"
                  />
                </Field>
                <Field label="Image" className="sm:col-span-2">
                  <select
                    value={slide.image}
                    onChange={(event) => {
                      const hero = [...settings.hero];
                      hero[index] = { ...slide, image: event.target.value };
                      update('hero', hero);
                    }}
                    className="field text-xs"
                  >
                    {imageChoices.map((image) => (
                      <option key={image} value={image}>
                        {image}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Hot deals" description="The promotional combo block">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input value={settings.deal.title} onChange={(event) => update('deal', { ...settings.deal, title: event.target.value })} className="field" />
          </Field>
          <Field label="Subtitle">
            <input value={settings.deal.subtitle} onChange={(event) => update('deal', { ...settings.deal, subtitle: event.target.value })} className="field" />
          </Field>
          <Field label="Offer price">
            <input
              value={String(settings.deal.comboPrice)}
              onChange={(event) => update('deal', { ...settings.deal, comboPrice: Number(event.target.value) || 0 })}
              className="field"
              inputMode="decimal"
            />
          </Field>
          <Field label="Original price">
            <input
              value={String(settings.deal.originalPrice)}
              onChange={(event) => update('deal', { ...settings.deal, originalPrice: Number(event.target.value) || 0 })}
              className="field"
              inputMode="decimal"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={settings.deal.description}
              onChange={(event) => update('deal', { ...settings.deal, description: event.target.value })}
              rows={2}
              className="field resize-none"
            />
          </Field>
          <Field label="Countdown ends at">
            <input
              type="datetime-local"
              value={toLocalInput(settings.deal.endsAt)}
              onChange={(event) =>
                update('deal', { ...settings.deal, endsAt: new Date(event.target.value).toISOString() })
              }
              className="field"
            />
          </Field>
          <label className="flex items-end gap-2 pb-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.deal.freeDelivery}
              onChange={(event) => update('deal', { ...settings.deal, freeDelivery: event.target.checked })}
              className="size-4 accent-[#F58220]"
            />
            Highlight free delivery
          </label>
        </div>
        <button type="button" onClick={save} className="btn-primary mt-4 py-2 text-xs" disabled={saving}>
          <Save className="size-4" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </Panel>

      <Panel title="Discount codes" description="Codes customers can enter in the cart">
        {coupons.length === 0 ? (
          <EmptyState message="No discount codes yet." />
        ) : (
          <ul className="divide-y divide-line">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{coupon.code}</p>
                  <p className="text-xs text-muted">
                    {coupon.kind === 'percent' ? `${Number(coupon.value)}% off` : `$${Number(coupon.value)} off`}
                    {Number(coupon.min_subtotal) > 0 ? ` · min $${Number(coupon.min_subtotal).toFixed(2)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeCoupon(coupon)}
                  aria-label={`Delete coupon ${coupon.code}`}
                  className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-rose-200 hover:text-rose-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
          <Field label="Code">
            <input
              value={couponForm.code}
              onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })}
              className="field text-xs"
              placeholder="SUMMER15"
            />
          </Field>
          <Field label="Type">
            <select
              value={couponForm.kind}
              onChange={(event) => setCouponForm({ ...couponForm, kind: event.target.value })}
              className="field text-xs"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed $</option>
            </select>
          </Field>
          <Field label="Value">
            <input
              value={couponForm.value}
              onChange={(event) => setCouponForm({ ...couponForm, value: event.target.value })}
              className="field w-20 text-xs"
              inputMode="decimal"
            />
          </Field>
          <Field label="Min subtotal">
            <input
              value={couponForm.minSubtotal}
              onChange={(event) => setCouponForm({ ...couponForm, minSubtotal: event.target.value })}
              className="field w-24 text-xs"
              inputMode="decimal"
            />
          </Field>
          <button
            type="button"
            onClick={() => void addCoupon()}
            className="btn-soft py-2.5 text-xs"
            disabled={!couponForm.code.trim()}
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
      </Panel>
    </div>
  );
}
