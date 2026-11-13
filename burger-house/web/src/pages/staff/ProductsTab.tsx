import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import type { Category, Product } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Modal, Spinner, btn, btnDanger, btnGhost, field } from '../../staff/ui';

type FormState = {
  name: string;
  price: string;
  category: string;
  image: string;
  description: string;
  discountPercent: string;
  badge: string;
  active: boolean;
  popular: boolean;
};

const EMPTY: FormState = {
  name: '',
  price: '',
  category: 'beef',
  image: '/img/burger-1.jpg',
  description: '',
  discountPercent: '0',
  badge: '',
  active: true,
  popular: false,
};

export function ProductsTab() {
  const t = useAdminT();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Product[]; categories: Category[] }>(
        `/api/admin/products${term ? `?q=${encodeURIComponent(term)}` : ''}`
      );
      setItems(data.items);
      setCategories(data.categories);
      setError('');
    } catch {
      setError(t('Could not load data.'));
    } finally {
      setLoading(false);
    }
  }, [term, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(['orders'], () => void load());

  const openEdit = (product: Product) => {
    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category || 'beef',
      image: product.image,
      description: product.description,
      discountPercent: String(product.discountPercent),
      badge: product.badge || '',
      active: product.active,
      popular: product.popular,
    });
    setEditing(product);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
      name: form.name,
      price: Number(form.price),
      category: form.category,
      image: form.image,
      description: form.description,
      discountPercent: Number(form.discountPercent),
      badge: form.badge,
      active: form.active,
      popular: form.popular,
    };
    try {
      if (editing === 'new') {
        await api('/api/admin/products', { method: 'POST', body });
      } else if (editing) {
        await api(`/api/admin/products/${editing.id}`, { method: 'PATCH', body });
      }
      setEditing(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6d6d78]" />
          <input
            className={`${field} ps-9`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && setTerm(search.trim())}
            placeholder={t('Search products…')}
            aria-label={t('Search')}
          />
        </div>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setForm(EMPTY);
            setEditing('new');
          }}
        >
          <Plus className="size-4" /> {t('Add product')}
        </button>
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>}

      {loading ? (
        <Spinner label={t('Loading…')} />
      ) : (
        <Card>
          {items.length === 0 ? (
            <Empty>{t('No records found.')}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-[#7c7c87]">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">{t('Products')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Category')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Price')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Discount %')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Visible')}</th>
                    <th className="px-3 py-2 text-end font-semibold">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {items.map((product) => (
                    <tr key={product.id}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <img src={product.image} alt="" className="size-9 rounded-lg object-cover" loading="lazy" />
                          <span className="font-medium text-[#e7e7ec]">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#a4a4ae]">{product.categoryName || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-white">{money(product.price)}</td>
                      <td className="px-3 py-2.5 text-xs text-[#a4a4ae]">{product.discountPercent}%</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            product.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {product.active ? t('Active') : t('Disabled')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            aria-label={t('Edit')}
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-[#a4a4ae] transition hover:border-white/30 hover:text-white"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(product)}
                            aria-label={t('Delete')}
                            className="grid size-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 transition hover:bg-rose-500/15"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {editing && (
        <Modal
          title={editing === 'new' ? t('Add product') : t('Edit product')}
          onClose={() => setEditing(null)}
          wide
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Product name')}</span>
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Price')}</span>
              <input
                type="number"
                step="0.1"
                className={field}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Category')}</span>
              <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Discount %')}</span>
              <input
                type="number"
                className={field}
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Image path or URL')}</span>
              <input className={field} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Description')}</span>
              <textarea
                rows={3}
                className={`${field} resize-none`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[#c9c9d2]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="size-4 accent-[#e8412f]"
              />
              {t('Visible')}
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[#c9c9d2]">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                className="size-4 accent-[#e8412f]"
              />
              {t('Best sellers')}
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
              {t('Cancel')}
            </button>
            <button
              type="button"
              className={btn}
              disabled={busy || form.name.trim().length < 2 || !(Number(form.price) > 0)}
              onClick={() => void save()}
            >
              {t('Save')}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title={t('Delete product?')} onClose={() => setDeleting(null)}>
          <p className="text-sm text-[#a4a4ae]">{deleting.name}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setDeleting(null)}>
              {t('Cancel')}
            </button>
            <button type="button" className={btnDanger} disabled={busy} onClick={() => void remove()}>
              {t('Delete')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
