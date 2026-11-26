const LOCALES: Record<string, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
};

/**
 * Prices are stored in US dollars. Each site language shows them in the currency of
 * its country; edit `rate` to your real exchange rate when it moves.
 */
const MONEY: Record<string, { currency?: string; suffix?: string; rate: number }> = {
  en: { currency: 'USD', rate: 1 },
  fa: { suffix: 'تومان', rate: 1000000 },
  de: { currency: 'EUR', rate: 0.92 },
  fr: { currency: 'EUR', rate: 0.92 },
  it: { currency: 'EUR', rate: 0.92 },
};

let activeLang = typeof document === 'undefined' ? 'en' : document.documentElement.lang || 'en';

/** Called by the site preferences provider so prices and dates follow the chosen language. */
export const setFormatLang = (lang: string) => {
  activeLang = lang;
};

const currentLocale = () => LOCALES[activeLang] || LOCALES.en;

export const money = (value: number) => {
  const base = Number.isFinite(value) ? value : 0;
  const format = MONEY[activeLang] || MONEY.en;
  const amount = base * format.rate;
  if (format.suffix) {
    return `${new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 0 }).format(
      Math.round(amount)
    )} ${format.suffix}`;
  }
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: format.currency,
  }).format(amount);
};

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(currentLocale(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const statusTone: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  preparing: 'bg-violet-50 text-violet-700 border-violet-200',
  ready: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};
