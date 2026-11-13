import { useEffect, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, initials } from '../lib/format';
import type { Review } from '../lib/types';
import { useToast } from '../store/toast';
import { Stars } from '../components/Stars';
import { EmptyState, Panel } from './ui';

export function ReviewsTab() {
  const { push } = useToast();
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const load = () => {
    setLoading(true);
    api<{ items: Review[] }>('/api/admin/reviews')
      .then((data) => setItems(data.items))
      .catch(() => push('Could not load reviews', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setApproved = async (review: Review, approved: boolean) => {
    try {
      const updated = await api<Review>(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        body: { approved },
      });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      push(approved ? 'Review published' : 'Review hidden');
    } catch {
      push('Could not update the review', 'error');
    }
  };

  const remove = async (review: Review) => {
    if (!window.confirm(`Delete the review from ${review.name}?`)) return;
    try {
      await api(`/api/admin/reviews/${review.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== review.id));
      push('Review deleted');
    } catch {
      push('Could not delete the review', 'error');
    }
  };

  const visible = items.filter((review) =>
    filter === 'all' ? true : filter === 'pending' ? !review.approved : review.approved
  );
  const pendingCount = items.filter((review) => !review.approved).length;

  return (
    <Panel
      title="Reviews"
      description={`${pendingCount} awaiting approval`}
      action={
        <div className="flex gap-1 rounded-full bg-mist p-1">
          {(['all', 'pending', 'approved'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === value ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState message="No reviews in this view." />
      ) : (
        <ul className="space-y-3">
          {visible.map((review) => (
            <li key={review.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-cream text-xs font-bold text-brand">
                    {initials(review.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-[11px] text-muted">
                      {formatDate(review.created_at)} · <Stars rating={Number(review.rating)} size={12} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${review.approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                  >
                    {review.approved ? 'Published' : 'Pending'}
                  </span>
                  {review.approved ? (
                    <button
                      type="button"
                      onClick={() => void setApproved(review, false)}
                      className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold transition hover:border-amber-300 hover:text-amber-700"
                    >
                      <X className="size-3" /> Reject
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void setApproved(review, true)}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Check className="size-3" /> Approve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(review)}
                    aria-label={`Delete review by ${review.name}`}
                    className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-rose-200 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-soft">“{review.body}”</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
