import { Star } from 'lucide-react';

type Props = { rating: number; size?: number; className?: string; showValue?: boolean };

export function Stars({ rating, size = 15, className = '', showValue = false }: Props) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  const stars = [0, 1, 2, 3, 4];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`Rated ${safe.toFixed(1)} out of 5`}
      >
        <span className="flex gap-0.5 text-brand/25">
          {stars.map((index) => (
            <Star key={index} style={{ width: size, height: size }} strokeWidth={0} fill="currentColor" />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 overflow-hidden text-brand"
          style={{ width: `${(safe / 5) * 100}%` }}
        >
          <span className="flex min-w-max gap-0.5">
            {stars.map((index) => (
              <Star key={index} style={{ width: size, height: size }} strokeWidth={0} fill="currentColor" />
            ))}
          </span>
        </span>
      </span>
      {showValue && <span className="text-xs font-semibold text-ink-soft">{safe.toFixed(1)}</span>}
    </span>
  );
}
