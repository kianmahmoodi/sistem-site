import { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { money } from '../lib/format';
import type { Product } from '../lib/types';
import { useCart } from '../store/cart';
import { usePrefs } from '../store/prefs';
import { useToast } from '../store/toast';
import { Modal } from './Modal';
import { Stars } from './Stars';

type Props = {
  product: Product | null;
  onClose: () => void;
};

export function QuickView({ product, onClose }: Props) {
  const { addItem, openCart } = useCart();
  const { push } = useToast();
  const { t } = usePrefs();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  if (!product) return null;

  return (
    <Modal open={Boolean(product)} onClose={onClose} size="lg" title={t('Product details')}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-cream">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {product.badge && <span className="badge bg-brand/10 text-brand">{product.badge}</span>}
            <Stars rating={product.rating} showValue />
          </div>

          <h3 className="mt-3 text-2xl font-bold leading-tight">{product.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{product.description}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-mist px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted">{t('Category')}</dt>
              <dd className="font-semibold">{product.categoryName || t('Burgers')}</dd>
            </div>
            <div className="rounded-2xl bg-mist px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted">{t('Ready in')}</dt>
              <dd className="font-semibold">{t('15–20 min')}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-brand">{money(product.finalPrice)}</span>
            {product.discountPercent > 0 && (
              <span className="text-sm font-medium text-muted line-through">{money(product.price)}</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-line p-1">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
                className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-mist"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                aria-label="Increase quantity"
                className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-mist"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                addItem(product, quantity);
                push(t('{count} × {name} added to your bag', { count: quantity, name: product.name }));
                onClose();
                openCart();
              }}
            >
              <ShoppingBag className="size-4" /> {t('Add to bag')} · {money(product.finalPrice * quantity)}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
