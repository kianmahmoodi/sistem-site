import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bh-intro-played';

/**
 * Opening moment for the site: the header arrives as one whole burger, splits
 * in half and the two halves fly apart, revealing the navigation underneath.
 * Plays once per browser session and never when the visitor asked for less motion.
 */
export function BurgerIntro() {
  const [stage, setStage] = useState<'whole' | 'split' | 'done'>(() => {
    if (typeof window === 'undefined') return 'done';
    if (window.sessionStorage.getItem(STORAGE_KEY)) return 'done';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
      return 'done';
    }
    return 'whole';
  });

  useEffect(() => {
    if (stage === 'done') return;
    window.sessionStorage.setItem(STORAGE_KEY, '1');
    const split = window.setTimeout(() => setStage('split'), 600);
    const finish = window.setTimeout(() => setStage('done'), 2500);
    return () => {
      window.clearTimeout(split);
      window.clearTimeout(finish);
    };
  }, [stage]);

  if (stage === 'done') return null;

  const half = 'absolute inset-y-0 w-1/2 overflow-hidden';
  const image = 'absolute inset-y-0 h-full w-[200%] max-w-none object-cover';

  return (
    <div
      aria-hidden="true"
      className={`bh-intro pointer-events-none fixed inset-0 z-[200] ${stage === 'split' ? 'bh-intro-out' : ''}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-[220px] sm:h-[260px]"
        style={{ background: 'var(--color-white)' }}
      />
      <div
        className="absolute inset-x-0 top-[220px] bottom-0 opacity-95 sm:top-[260px]"
        style={{ background: 'var(--color-white)' }}
      />

      <div className="bh-intro-burger absolute start-1/2 top-6 w-[220px] -translate-x-1/2 sm:top-8">
        <div className="relative mx-auto size-[220px]">
          <div
            className={`${half} start-0 rounded-s-full ${
              stage === 'split' ? 'bh-intro-half-left' : ''
            }`}
          >
            <img src="/img/hero-burger.jpg" alt="" className={`${image} start-0`} />
          </div>
          <div
            className={`${half} end-0 rounded-e-full ${
              stage === 'split' ? 'bh-intro-half-right' : ''
            }`}
          >
            <img src="/img/hero-burger.jpg" alt="" className={`${image} end-0`} />
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-brand">
          Burger House
        </p>
      </div>
    </div>
  );
}
