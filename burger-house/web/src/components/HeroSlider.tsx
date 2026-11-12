import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Clock3, Star } from 'lucide-react';
import { money } from '../lib/format';
import { usePrefs } from '../store/prefs';
import { useSettings } from '../store/settings';

export function HeroSlider() {
  const settings = useSettings();
  const { t } = usePrefs();
  const slides = settings.hero.length > 0 ? settings.hero : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  useEffect(() => {
    if (index > slides.length - 1) setIndex(0);
  }, [slides.length, index]);

  const slide = slides[index];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!slide) return null;

  return (
    <section
      id="top"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden pt-10 pb-16 sm:pt-14 lg:pt-16 lg:pb-24"
      aria-label="Featured burgers"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 size-[420px] rounded-full bg-cream blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 size-[320px] rounded-full bg-cream/70 blur-2xl"
      />

      <div className="container-page relative">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
          <div key={`copy-${index}`} style={{ animation: 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1)' }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-cream px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              {slide.eyebrow}
            </span>

            <h1 className="mt-5 text-[clamp(2.75rem,6.4vw,4.75rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-md text-lg font-medium text-ink-soft sm:text-xl">
              {slide.subtitle}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{slide.note}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => scrollTo('menu')} className="btn-primary group">
                {t('Order Now')}
                <span className="grid size-6 place-items-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">
                  <ArrowRight className="size-3.5 rtl:rotate-180" />
                </span>
              </button>
              <button type="button" onClick={() => scrollTo('deals')} className="btn-ghost">
                {t('View Hot Deals')}
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2.5" aria-hidden>
                  {['#F9A23B', '#F58220', '#252525'].map((color, avatarIndex) => (
                    <span
                      key={color}
                      className="grid size-9 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {['SM', 'JJ', 'EW'][avatarIndex]}
                    </span>
                  ))}
                </div>
                <div className="text-xs leading-tight">
                  <p className="font-bold text-ink">{t('10,000+ happy customers')}</p>
                  <p className="text-muted">{t('4.9 average rating')}</p>
                </div>
              </div>
              <div className="hidden h-8 w-px bg-line sm:block" aria-hidden />
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                <Clock3 className="size-4 text-brand" />
                {t('Delivered in 30 min')}
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div
              aria-hidden
              className="absolute inset-4 rounded-full border border-dashed border-brand/25 animate-spin-slow"
            />
            <div
              className="relative aspect-square overflow-hidden rounded-full bg-gradient-to-br from-brand-soft via-brand to-brand-deep shadow-[0_40px_80px_-40px_rgba(245,130,32,0.85)]"
              key={`art-${index}`}
              style={{ animation: 'fade-in 0.5s ease-out' }}
            >
              <div
                aria-hidden
                className="absolute -left-10 -top-10 size-40 rounded-full bg-white/20 blur-2xl"
              />
              <img
                src={slide.image}
                alt={slide.title}
                fetchPriority="high"
                className="absolute inset-0 size-full scale-[1.04] object-cover animate-float-slow"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-brand-deep/25 via-transparent to-transparent"
              />
            </div>

            <div className="absolute -left-2 top-6 rounded-2xl bg-white/95 px-4 py-3 shadow-soft backdrop-blur sm:left-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t('Starting at')}</p>
              <p className="text-xl font-extrabold text-brand">{money(slide.price)}</p>
            </div>

            <div className="absolute -right-1 top-1/2 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-soft backdrop-blur sm:-right-3">
              <BadgeCheck className="size-4 text-success" />
              <span className="text-xs font-semibold">{t('100% Fresh Beef')}</span>
            </div>

            <div className="absolute -bottom-2 left-4 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-soft backdrop-blur sm:left-8">
              <span className="grid size-10 place-items-center rounded-full bg-cream text-brand">
                <Star className="size-5" fill="currentColor" />
              </span>
              <div>
                <p className="text-sm font-bold leading-none">4.9 / 5</p>
                <p className="mt-1 text-[11px] text-muted">{t('2,480 reviews')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 lg:justify-start">
          {slides.map((item, dotIndex) => (
            <button
              key={`${item.title}-${dotIndex}`}
              type="button"
              onClick={() => setIndex(dotIndex)}
              aria-label={`Show slide ${dotIndex + 1}: ${item.title}`}
              aria-current={dotIndex === index}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                dotIndex === index ? 'w-8 bg-brand' : 'w-2.5 bg-line hover:bg-brand/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
