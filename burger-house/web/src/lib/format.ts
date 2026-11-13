export const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(value) ? value : 0
  );

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const LOCALES: Record<string, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
};

/** Locale of the language currently selected in the site settings. */
const currentLocale = () =>
  (typeof document !== 'undefined' && LOCALES[document.documentElement.lang]) || 'en-US';

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
