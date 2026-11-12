import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Moon, Palette, Plus, RotateCcw, Sun, X } from 'lucide-react';
import { LANGUAGES } from '../i18n';
import { TEXT_STEPS, usePrefs } from '../store/prefs';
import type { Tone } from '../store/prefs';

const tones: { value: Tone; label: string; swatch: string }[] = [
  { value: 'classic', label: 'Classic', swatch: '#252525' },
  { value: 'warm', label: 'Warm', swatch: '#5b4029' },
  { value: 'cool', label: 'Cool', swatch: '#254160' },
  { value: 'graphite', label: 'Graphite', swatch: '#111114' },
];

export function SiteSettingsMenu() {
  const { theme, setTheme, tone, setTone, lang, setLang, step, setStep, reset, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="site-display-settings"
        aria-label={t('Display & language')}
        className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition duration-300 hover:border-brand/40 hover:text-brand"
      >
        <Palette className="size-[18px]" />
      </button>

      {open && (
        <div
          id="site-display-settings"
          role="dialog"
          aria-label={t('Display & language')}
          className="glass absolute end-0 top-[calc(100%+12px)] z-[60] w-[318px] rounded-3xl p-4"
          style={{ animation: 'pop-in 0.22s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{t('Display & language')}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-full bg-mist text-ink-soft transition hover:bg-cream hover:text-brand"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('Appearance')}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { value: 'light' as const, label: t('Day'), Icon: Sun },
                { value: 'dark' as const, label: t('Night'), Icon: Moon },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={theme === value}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition duration-300 ${
                    theme === value
                      ? 'border-transparent bg-brand text-white'
                      : 'border-line bg-white/70 text-ink-soft hover:border-brand/40 hover:text-brand'
                  }`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('Text size')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                aria-label={t('Smaller text')}
                className="grid size-9 place-items-center rounded-full border border-line bg-white/70 text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
                {TEXT_STEPS.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index <= step ? 'w-6 bg-brand' : 'w-3 bg-line'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(Math.min(TEXT_STEPS.length - 1, step + 1))}
                disabled={step === TEXT_STEPS.length - 1}
                aria-label={t('Larger text')}
                className="grid size-9 place-items-center rounded-full border border-line bg-white/70 text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('Text colour')}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {tones.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  aria-pressed={tone === option.value}
                  className={`flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-xs font-semibold transition duration-300 ${
                    tone === option.value
                      ? 'border-brand/60 bg-cream text-ink'
                      : 'border-line bg-white/70 text-ink-soft hover:border-brand/40'
                  }`}
                >
                  <span
                    className="grid size-4 shrink-0 place-items-center rounded-full ring-1 ring-black/10"
                    style={{ background: option.swatch }}
                  >
                    {tone === option.value && <Check className="size-2.5 text-white" />}
                  </span>
                  {t(option.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('Language')}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {LANGUAGES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setLang(option.code)}
                  aria-pressed={lang === option.code}
                  className={`rounded-2xl border px-2.5 py-2 text-xs font-semibold transition duration-300 ${
                    lang === option.code
                      ? 'border-transparent bg-brand text-white'
                      : 'border-line bg-white/70 text-ink-soft hover:border-brand/40 hover:text-brand'
                  }`}
                >
                  {option.native}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white/60 px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:text-brand"
          >
            <RotateCcw className="size-3.5" /> {t('Reset')}
          </button>
        </div>
      )}
    </div>
  );
}
