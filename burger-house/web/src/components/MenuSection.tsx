import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Product } from '../lib/types';
import { usePrefs } from '../store/prefs';
import { useToast } from '../store/toast';
import { GlassSortMenu } from './GlassSortMenu';
import { ProductCard } from './ProductCard';
import { ProductSkeletons } from './ProductSkeletons';
import { QuickView } from './QuickView';
import { Reveal } from './Reveal';

const PAGE_SIZE = 8;

const sortOptions = [
  { value: 'default', label: 'Recommended' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

export function MenuSection() {
  const { push } = useToast();
  const { t } = usePrefs();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api<Category[]>('/api/categories')
      .then(setCategories)
      .catch(() => push('Could not load categories', 'error'));
  }, [push]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [search]);

  const buildQuery = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(PAGE_SIZE) });
      if (category !== 'all') params.set('category', category);
      if (query) params.set('q', query);
      if (sort !== 'default') params.set('sort', sort);
      return params.toString();
    },
    [category, query, sort]
  );

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await api<{ items: Product[]; total: number }>(`/api/products?${buildQuery(nextPage)}`, {
          signal: controller.signal,
        });
        setProducts((current) => (append ? [...current, ...data.items] : data.items));
        setTotal(data.total);
        setPage(nextPage);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          push(t('Could not load the menu. Please refresh.'), 'error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildQuery, push, t]
  );

  useEffect(() => {
    void load(1, false);
    return () => abortRef.current?.abort();
  }, [load]);

  const chips = useMemo(
    () => [{ slug: 'all', name: 'All Burgers' }, ...categories],
    [categories]
  );

  return (
    <section id="menu" className="section-pad scroll-mt-24 bg-white">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            {t('Our Kitchen')}
          </span>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight">{t('Menu')}</h2>
          <p className="mt-3 text-sm text-muted sm:text-base">
            {t('Served with Golden Crisp Fries and a Drink!')}
          </p>
        </Reveal>

        <div className="mt-9 flex flex-col gap-4">
          <div className="glass-control flex flex-col gap-3 rounded-3xl p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Menu categories">
              {chips.map((chip) => (
                <button
                  key={chip.slug}
                  type="button"
                  role="tab"
                  aria-selected={category === chip.slug}
                  onClick={() => setCategory(chip.slug)}
                  className={`chip ${category === chip.slug ? 'chip-active' : ''}`}
                >
                  {t(chip.name)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="relative flex-1 sm:w-56">
                <span className="sr-only">{t('Search the menu')}</span>
                <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('Search burgers…')}
                  className="field bg-white py-2.5 ps-10 text-sm"
                />
              </label>
              <GlassSortMenu
                value={sort}
                label={t('Sort products')}
                options={sortOptions.map((option) => ({ value: option.value, label: t(option.label) }))}
                onChange={setSort}
              />
            </div>
          </div>

          {loading ? (
            <ProductSkeletons count={PAGE_SIZE} />
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-mist/50 px-6 py-16 text-center">
              <LayoutGrid className="mx-auto size-8 text-muted" />
              <p className="mt-3 font-semibold">{t('No burgers match that search')}</p>
              <p className="mt-1 text-sm text-muted">{t('Try another category or clear your filters.')}</p>
              <button
                type="button"
                className="btn-soft mt-5"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setSort('default');
                }}
              >
                {t('Reset filters')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={setQuickView} />
              ))}
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-xs text-muted">
                {t('Showing {shown} of {total} items', { shown: products.length, total })}
              </p>
              {products.length < total && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={loadingMore}
                  onClick={() => void load(page + 1, true)}
                >
                  {loadingMore ? t('Loading…') : t('Load more burgers')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <QuickView product={quickView} onClose={() => setQuickView(null)} />
    </section>
  );
}
