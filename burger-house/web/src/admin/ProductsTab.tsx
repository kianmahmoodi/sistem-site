import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import type { Category, Product } from '../lib/types';
import { useToast } from '../store/toast';
import { Modal } from '../components/Modal';
import { EmptyState, Field, Panel } from './ui';

const imageChoices = [
  '/img/burger-1.jpg',
  '/img/burger-2.jpg',
  '/img/burger-3.jpg',
  '/img/burger-4.jpg',
  '/img/burger-5.jpg',
  '/img/burger-6.jpg',
  '/img/burger-7.jpg',
  '/img/burger-8.jpg',
  '/img/burger-9.jpg',
  '/img/burger-10.jpg',
  '/img/combo-pack.jpg',
  '/img/side-fries.jpg',
  '/img/side-fries-2.jpg',
  '/img/drink-cola.jpg',
];

type FormState = {
  id?: number;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  badge: string;
  rating: string;
  discountPercent: string;
  popular: boolean;
  active: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  category: 'beef',
  image: imageChoices[0],
  badge: '',
  rating: '5',
  discountPercent: '0',
  popular: false,
  active: true,
  sortOrder: '0',
};

export function ProductsTab() {
  const { push } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = (term = '') => {
    setLoading(true);
    api<{ items: Product[]; categories: Category[] }>(
      `/api/admin/products${term ? `?q=${encodeURIComponent(term)}` : ''}`
    )
      .then((data) => {
        setItems(data.items);
        setCategories(data.categories);
      })
      .catch(() => push('Could not load products', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    load(query);
  }, [query]);

  const openNew = () => {
    setForm({ ...emptyForm, category: categories[0]?.slug || 'beef' });
    setError('');
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category || 'beef',
      image: product.image,
      badge: product.badge || '',
      rating: String(product.rating),
      discountPercent: String(product.discountPercent),
      popular: product.popular,
      active: product.active,
      sortOrder: '0',
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setError('');
    if (form.name.trim().length < 2) {
      setError('Enter a product name.');
      return;
    }
    if (!Number(form.price) || Number(form.price) <= 0) {
      setError('Enter a valid price.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category,
      image: form.image,
      badge: form.badge.trim(),
      rating: Number(form.rating),
      discountPercent: Number(form.discountPercent),
      popular: form.popular,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (form.id) {
        await api(`/api/admin/products/${form.id}`, { method: 'PATCH', body: payload });
        push('Product updated');
      } else {
        await api('/api/admin/products', { method: 'POST', body: payload });
        push('Product created');
      }
      setOpen(false);
      load(query);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== product.id));
      push(`${product.name} deleted`);
    } catch {
      push('Could not delete this product', 'error');
    }
  };

  const toggle = async (product: Product, patch: Partial<{ active: boolean; popular: boolean }>) => {
    try {
      const updated = await api<Product>(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        body: patch,
      });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      push('Could not update the product', 'error');
    }
  };

  return (
    <Panel
      title="Products"
      description={`${items.length} items on the menu`}
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="field py-2 pl-9 text-xs sm:w-52"
            />
          </label>
          <button type="button" onClick={openNew} className="btn-primary py-2 text-xs">
            <Plus className="size-4" /> Add product
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="No products found. Add your first burger." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Product</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 font-semibold">Price</th>
                <th className="pb-2 font-semibold">Rating</th>
                <th className="pb-2 font-semibold">Popular</th>
                <th className="pb-2 font-semibold">Active</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((product) => (
                <tr key={product.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="size-11 rounded-xl object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{product.name}</p>
                        {product.badge && <p className="text-[11px] text-brand">{product.badge}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-muted">{product.categoryName || '—'}</td>
                  <td className="py-3">
                    <span className="font-semibold">{money(product.finalPrice)}</span>
                    {product.discountPercent > 0 && (
                      <span className="ml-1.5 text-[11px] text-muted line-through">{money(product.price)}</span>
                    )}
                  </td>
                  <td className="py-3 text-xs">{product.rating.toFixed(1)} ★</td>
                  <td className="py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.popular}
                      aria-label={`Toggle popular for ${product.name}`}
                      onClick={() => void toggle(product, { popular: !product.popular })}
                      className={`relative h-6 w-11 rounded-full transition ${product.popular ? 'bg-brand' : 'bg-line'}`}
                    >
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                          product.popular ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.active}
                      aria-label={`Toggle availability for ${product.name}`}
                      onClick={() => void toggle(product, { active: !product.active })}
                      className={`relative h-6 w-11 rounded-full transition ${product.active ? 'bg-success' : 'bg-line'}`}
                    >
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                          product.active ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        aria-label={`Edit ${product.name}`}
                        className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-brand/40 hover:text-brand"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(product)}
                        aria-label={`Delete ${product.name}`}
                        className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-rose-200 hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit product' : 'New product'} size="lg">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="field"
                placeholder="Double Cheese Burger"
              />
            </Field>
            <Field label="Price (USD)">
              <input
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                className="field"
                inputMode="decimal"
                placeholder="11.20"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={2}
              className="field resize-none"
              placeholder="Short, appetising description"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                className="field"
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Badge">
              <select
                value={form.badge}
                onChange={(event) => setForm({ ...form, badge: event.target.value })}
                className="field"
              >
                <option value="">None</option>
                <option value="Most Popular">Most Popular</option>
                <option value="Hot Deal">Hot Deal</option>
                <option value="New">New</option>
                <option value="Combo Pack">Combo Pack</option>
              </select>
            </Field>
            <Field label="Discount %" hint="0 means no discount">
              <input
                value={form.discountPercent}
                onChange={(event) => setForm({ ...form, discountPercent: event.target.value })}
                className="field"
                inputMode="numeric"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating (0–5)">
              <input
                value={form.rating}
                onChange={(event) => setForm({ ...form, rating: event.target.value })}
                className="field"
                inputMode="decimal"
              />
            </Field>
            <Field label="Sort order">
              <input
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                className="field"
                inputMode="numeric"
              />
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Product image</span>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {imageChoices.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setForm({ ...form, image })}
                  aria-label={`Use image ${image}`}
                  aria-pressed={form.image === image}
                  className={`overflow-hidden rounded-xl border-2 transition ${
                    form.image === image ? 'border-brand' : 'border-transparent hover:border-brand/40'
                  }`}
                >
                  <img src={image} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <input
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
              className="field mt-2 text-xs"
              aria-label="Image URL or path"
              placeholder="/img/burger-1.jpg or https://…"
            />
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(event) => setForm({ ...form, popular: event.target.checked })}
                className="size-4 accent-[#F58220]"
              />
              Mark as popular
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                className="size-4 accent-[#F58220]"
              />
              Visible on the menu
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-ghost flex-1 py-2.5 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 py-2.5 text-xs" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
