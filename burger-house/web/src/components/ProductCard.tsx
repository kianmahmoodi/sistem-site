import { Eye, Heart, Plus } from 'lucide-react';
import { money } from '../lib/format';
import type { Product } from '../lib/types';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { usePrefs } from '../store/prefs';
import { useToast } from '../store/toast';
import { Stars } from './Stars';

const badgeStyles: Record<string, string> = {
  'Most Popular': 'bg-brand text-white',
  'Hot Deal': 'bg-danger text-white',
  New: 'bg-ink text-white',
  'Combo Pack': 'bg-brand-soft text-white',
};

type Props = {
  product: Product;
  onQuickView: (product: Product) => void;
};

export function ProductCard({ product, onQuickView }: Props) {
  const { addItem } = useCart();
  const { push } = useToast();
  const { t } = usePrefs();
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(product.id);

  const add = () => {
    addItem(product);
    push(t('{name} added to your bag', { name: t(product.name) }));
  };

  return (
    <article className="group surface-card flex flex-col overflow-hidden p-3.5 transition duration-300 hover:-translate-y-1.5 hover:shadow-soft">
      <div className="relative overflow-hidden rounded-[22px] bg-cream">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.06]"
        />

        {product.badge && (
          <span className={`badge absolute left-3 top-3 shadow-sm ${badgeStyles[product.badge] || 'bg-brand text-white'}`}>
            {t(product.badge)}
          </span>
        )}

        {product.discountPercent > 0 && (
          <span className="badge absolute bottom-3 left-3 bg-white/95 text-danger shadow-sm">
            -{product.discountPercent}%
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            toggle(product.id);
            push(
              favorite
                ? t('{name} removed from favourites', { name: t(product.name) })
                : t('{name} saved to favourites', { name: t(product.name) }),
              'info'
            );
          }}
          aria-label={favorite ? 'Remove from favourites' : 'Save to favourites'}
          aria-pressed={favorite}
          className={`absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 shadow-sm backdrop-blur transition duration-300 hover:scale-105 ${
            favorite ? 'text-danger' : 'text-ink-soft hover:text-brand'
          }`}
        >
          <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} />
        </button>

        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-white/95 py-2.5 text-xs font-semibold text-ink opacity-0 shadow-sm backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          <Eye className="size-4" /> {t('Quick View')}
        </button>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-4">
        <div className="flex items-center justify-between">
          <Stars rating={product.rating} showValue />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {t(product.categoryName || 'Burgers')}
          </span>
        </div>

        <h3 className="mt-2 text-base font-semibold leading-snug">{t(product.name)}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{t(product.description)}</p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-brand">{money(product.finalPrice)}</span>
            {product.discountPercent > 0 && (
              <span className="text-xs font-medium text-muted line-through">{money(product.price)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={add}
            aria-label={`Add ${t(product.name)} to cart`}
            className="grid size-10 place-items-center rounded-full bg-brand text-white shadow-[0_14px_26px_-16px_rgba(245,130,32,0.95)] transition duration-300 hover:bg-brand-deep active:scale-95"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
