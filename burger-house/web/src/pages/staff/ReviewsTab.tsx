import { useCallback, useEffect, useState } from 'react';
import { Check, Star, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Review } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Pill, Spinner, btnGhost } from '../../staff/ui';

export function ReviewsTab() {
  const t = useAdminT();
  const [items, setItems] = useState<Review[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ items: Review[] }>('/api/admin/reviews')
      .then((data) => setItems(data.items))
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);
  useRealtime(['orders'], load);

  const approve = async (review: Review, approved: boolean) => {
    try {
      await api(`/api/admin/reviews/${review.id}`, { method: 'PATCH', body: { approved } });
      load();
    } catch {
      setError(t('Something went wrong.'));
    }
  };

  const remove = async (review: Review) => {
    try {
      await api(`/api/admin/reviews/${review.id}`, { method: 'DELETE' });
      load();
    } catch {
      setError(t('Something went wrong.'));
    }
  };

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!items) return <Spinner label={t('Loading…')} />;

  return (
    <Card title={`${t('Reviews')} (${items.length})`}>
      {items.length === 0 ? (
        <Empty>{t('No records found.')}</Empty>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {items.map((review) => (
            <li key={review.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#e7e7ec]">
                  {review.name}
                  <span className="inline-flex items-center gap-0.5 text-[#f5a623]">
                    <Star className="size-3.5" fill="currentColor" /> {review.rating}
                  </span>
                  <Pill status={review.approved ? 'active' : 'pending'} label={t(review.approved ? 'Active' : 'Pending')} />
                </p>
                <p className="mt-1 text-sm text-[#a4a4ae]">{review.body}</p>
                <p className="mt-1 text-[11px] text-[#6d6d78]">{formatDateTime(review.created_at)}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => void approve(review, !review.approved)}
                >
                  <Check className="size-4" /> {t(review.approved ? 'Disabled' : 'Confirm')}
                </button>
                <button
                  type="button"
                  aria-label={t('Delete')}
                  className="grid size-9 place-items-center rounded-lg border border-rose-500/30 text-rose-300 transition hover:bg-rose-500/10"
                  onClick={() => void remove(review)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
