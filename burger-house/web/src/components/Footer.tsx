import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Facebook, Instagram, Mail, MapPin, Music2, Phone, Sandwich, Twitter } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { usePrefs } from '../store/prefs';
import { useSettings } from '../store/settings';
import { useToast } from '../store/toast';

const quickLinks = [
  { label: 'Home', hash: 'top' },
  { label: 'Menu', hash: 'menu' },
  { label: 'About Us', hash: 'about' },
  { label: 'Reviews', hash: 'reviews' },
];

export function Footer() {
  const settings = useSettings();
  const { t } = usePrefs();
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  const subscribe = async () => {
    setError('');
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError(t('Please enter a valid email address.'));
      return;
    }
    setStatus('sending');
    try {
      const result = await api<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: { email: value },
      });
      setStatus('done');
      setEmail('');
      push(result.message);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof ApiError ? err.message : t('Could not subscribe. Please try again.'));
    }
  };

  const scrollTo = (hash: string) => {
    if (hash === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer id="contact" className="scroll-mt-24 bg-cream">
      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.7fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-11 place-items-center rounded-full bg-brand text-white">
                <Sandwich className="size-6" strokeWidth={1.9} />
              </span>
              <span className="text-lg font-bold">{settings.name}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              {t(
                'Flame-grilled burgers made with fresh ingredients and a lot of love. Dine in, take away or have it delivered to your door.'
              )}
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {[
                { href: settings.social.facebook, label: 'Facebook', Icon: Facebook },
                { href: settings.social.instagram, label: 'Instagram', Icon: Instagram },
                { href: settings.social.twitter, label: 'Twitter / X', Icon: Twitter },
                { href: settings.social.tiktok, label: 'TikTok', Icon: Music2 },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href || '#'}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Burger House on ${label}`}
                  className="grid size-10 place-items-center rounded-full bg-white text-ink-soft transition duration-300 hover:bg-brand hover:text-white"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Footer">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">{t('Explore')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={() => scrollTo(link.hash)} className="transition hover:text-brand">
                    {t(link.label)}
                  </button>
                </li>
              ))}
              <li>
                <Link to="/account" className="transition hover:text-brand">
                  {t('My Orders')}
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="transition hover:text-brand">
                  {t('Checkout')}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">{t('Contact')}</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand" />
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="hover:text-brand">
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
                <a href={`mailto:${settings.email}`} className="hover:text-brand">
                  {settings.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>{settings.hours}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">{t('Newsletter')}</h3>
            <p className="mt-4 text-sm text-ink-soft">
              {t('Fresh drops, secret menu items and member-only deals — once a week.')}
            </p>
            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void subscribe();
              }}
            >
              <label className="relative block">
                <span className="sr-only">{t('Your email')}</span>
                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setStatus('idle');
                    setError('');
                  }}
                  type="email"
                  placeholder={t('Your email')}
                  className="field bg-white pe-14"
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  aria-label="Subscribe to the newsletter"
                  className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-deep disabled:opacity-60"
                >
                  <ArrowRight className="size-4" />
                </button>
              </label>
              {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
              {status === 'done' && (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  {t('You are subscribed. Welcome aboard!')}
                </p>
              )}
              {status === 'sending' && <p className="mt-2 text-xs text-muted">{t('Subscribing…')}</p>}
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-brand/15 pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('© {year} {name}. All rights reserved.', {
              year: new Date().getFullYear(),
              name: settings.name,
            })}
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="transition hover:text-brand">
              {t('Privacy Policy')}
            </Link>
            <Link to="/terms" className="transition hover:text-brand">
              {t('Terms and Conditions')}
            </Link>
            <Link to="/admin" className="transition hover:text-brand">
              {t('Staff login')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
