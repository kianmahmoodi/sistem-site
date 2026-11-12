import { useEffect, useState } from 'react';
import { MessageSquarePlus, Quote, Star } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatDate, initials } from '../lib/format';
import type { Review } from '../lib/types';
import { useToast } from '../store/toast';
import { Modal } from './Modal';
import { Reveal } from './Reveal';
import { Stars } from './Stars';

const avatarGradients = [
  'linear-gradient(135deg,#F9A23B,#F58220)',
  'linear-gradient(135deg,#252525,#4a4a4a)',
  'linear-gradient(135deg,#FFD7A8,#F58220)',
  'linear-gradient(135deg,#F58220,#D96B0C)',
];

export function ReviewsSection() {
  const { push } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState('');

  useEffect(() => {
    api<{ items: Review[]; average: number; count: number }>('/api/reviews')
      .then((data) => {
        setReviews(data.items);
        setAverage(data.average);
        setCount(data.count);
      })
      .catch(() => push('Could not load reviews', 'error'))
      .finally(() => setLoading(false));
  }, [push]);

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) {
      setError('Please tell us your name.');
      return;
    }
    if (body.trim().length < 10) {
      setError('Your review should be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api<{ message: string }>('/api/reviews', {
        method: 'POST',
        body: { name: name.trim(), rating, body: body.trim() },
      });
      setSent(result.message);
      push('Thanks for sharing your experience!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setSent('');
    setError('');
    setName('');
    setBody('');
    setRating(5);
  };

  return (
    <section id="reviews" className="section-pad scroll-mt-24 bg-white">
      <div className="container-page">
        <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Guest love</span>
            <h2 className="mt-3 text-[clamp(2rem,4vw,2.9rem)] font-extrabold leading-tight">
              Customer Reviews
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Stars rating={average || 4.9} showValue />
              <span>
                {average ? average.toFixed(1) : '4.9'} average from {count || 240} reviews
              </span>
            </p>
          </div>
          <button type="button" className="btn-ghost self-start sm:self-auto" onClick={() => setOpen(true)}>
            <MessageSquarePlus className="size-4" /> Write a review
          </button>
        </Reveal>

        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="surface-card p-6">
                  <div className="skeleton h-4 w-24 rounded-full" />
                  <div className="skeleton mt-3 h-3 w-full rounded-full" />
                  <div className="skeleton mt-2 h-3 w-4/5 rounded-full" />
                </div>
              ))
            : reviews.map((review, index) => (
                <Reveal key={review.id} delay={index * 60}>
                  <article className="surface-card flex h-full flex-col gap-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid size-11 place-items-center rounded-full text-sm font-bold text-white"
                          style={{ background: avatarGradients[index % avatarGradients.length] }}
                          aria-hidden
                        >
                          {initials(review.name)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{review.name}</p>
                          <p className="text-xs text-muted">{formatDate(review.created_at)}</p>
                        </div>
                      </div>
                      <span className="badge bg-cream text-brand">
                        <Star className="size-3" fill="currentColor" /> {Number(review.rating).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-soft">“{review.body}”</p>
                    <div className="mt-auto flex items-center justify-between">
                      <Stars rating={Number(review.rating)} size={14} />
                      <Quote className="size-5 text-brand/25" aria-hidden />
                    </div>
                  </article>
                </Reveal>
              ))}
        </div>
      </div>

      <Modal open={open} onClose={closeModal} title="Write a review">
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{sent}</p>
            <button type="button" className="btn-primary w-full" onClick={closeModal}>
              Done
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div>
              <label htmlFor="review-name" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Your name
              </label>
              <input
                id="review-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field"
                placeholder="Sophie Miller"
                autoComplete="name"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Your rating</span>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHover(value)}
                    onMouseLeave={() => setHover(0)}
                    className="rounded-full p-0.5 transition hover:scale-110"
                  >
                    <Star
                      className={`size-7 ${
                        (hover || rating) >= value ? 'text-brand' : 'text-line'
                      }`}
                      fill={(hover || rating) >= value ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-semibold text-muted">{rating.toFixed(1)} / 5</span>
              </div>
            </div>

            <div>
              <label htmlFor="review-body" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Your review
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                maxLength={600}
                className="field resize-none"
                placeholder="Tell us about your last meal…"
              />
              <p className="mt-1 text-right text-[11px] text-muted">{body.length}/600</p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit review'}
            </button>
            <p className="text-center text-[11px] text-muted">
              Reviews are published after a quick check by our team.
            </p>
          </form>
        )}
      </Modal>
    </section>
  );
}
