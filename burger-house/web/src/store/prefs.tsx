import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { dirFor, isLang, translate } from '../i18n';
import type { Lang } from '../i18n';

export type Theme = 'light' | 'dark';
export type Tone = 'classic' | 'warm' | 'cool' | 'graphite';

export const TEXT_STEPS = [0.9, 1, 1.1, 1.2];
const DEFAULT_STEP = 1;

type Stored = {
  theme?: Theme;
  tone?: Tone;
  lang?: Lang;
  step?: number;
};

const STORAGE_KEY = 'burger-house.display';

type PrefsValue = {
  theme: Theme;
  tone: Tone;
  lang: Lang;
  dir: 'ltr' | 'rtl';
  step: number;
  setTheme: (theme: Theme) => void;
  setTone: (tone: Tone) => void;
  setLang: (lang: Lang) => void;
  setStep: (step: number) => void;
  reset: () => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
};

const PrefsContext = createContext<PrefsValue | null>(null);

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    return {
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : undefined,
      tone: ['classic', 'warm', 'cool', 'graphite'].includes(parsed.tone as string)
        ? parsed.tone
        : undefined,
      lang: isLang(parsed.lang) ? parsed.lang : undefined,
      step: typeof parsed.step === 'number' ? parsed.step : undefined,
    };
  } catch {
    return {};
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [stored] = useState<Stored>(() => readStored());
  const [theme, setTheme] = useState<Theme>(stored.theme ?? 'light');
  const [tone, setTone] = useState<Tone>(stored.tone ?? 'classic');
  const [lang, setLang] = useState<Lang>(stored.lang ?? 'en');
  const [step, setStep] = useState<number>(
    stored.step !== undefined && stored.step >= 0 && stored.step < TEXT_STEPS.length
      ? stored.step
      : DEFAULT_STEP
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.tone = tone;
    root.lang = lang;
    root.dir = dirFor(lang);
    root.style.setProperty('--text-scale', String(TEXT_STEPS[step]));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, tone, lang, step }));
    } catch {
      /* storage can be unavailable in private modes — preferences stay in memory */
    }
  }, [theme, tone, lang, step]);

  const reset = useCallback(() => {
    setTheme('light');
    setTone('classic');
    setLang('en');
    setStep(DEFAULT_STEP);
  }, []);

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars),
    [lang]
  );

  const value = useMemo<PrefsValue>(
    () => ({
      theme,
      tone,
      lang,
      dir: dirFor(lang),
      step,
      setTheme,
      setTone,
      setLang,
      setStep,
      reset,
      t,
    }),
    [theme, tone, lang, step, reset, t]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error('usePrefs must be used inside PrefsProvider');
  return value;
}
