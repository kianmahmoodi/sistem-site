import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sandwich, ShoppingBag, UserRound, X } from 'lucide-react';
import { redirectForRole } from '../store/auth';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { usePrefs } from '../store/prefs';
import { useSettings } from '../store/settings';
import { SiteSettingsMenu } from './SiteSettingsMenu';

const links = [
  { label: 'Home', hash: 'top' },
  { label: 'Menu', hash: 'menu' },
  { label: 'About Us', hash: 'about' },
  { label: 'Order', hash: 'order', route: '/checkout' },
  { label: 'Contact', hash: 'contact' },
];

export function Header() {
  const settings = useSettings();
  const { t } = usePrefs();
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState('top');
  const intro = useRef(false);
  if (!intro.current && typeof window !== 'undefined') {
    intro.current = !window.sessionStorage.getItem('bh-intro-played');
    if (intro.current) window.sessionStorage.setItem('bh-intro-played', '1');
  }
  const accountPath = user ? redirectForRole(user.role) : '/login';
  const isStaffAccount = user ? ['super_admin', 'manager', 'cashier'].includes(user.role) : false;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/') {
      setActive(location.pathname === '/checkout' ? 'order' : '');
      return;
    }
    const onScroll = () => {
      if (window.scrollY < 140) setActive('top');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const sections = ['top', 'menu', 'about', 'contact']
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.3, 0.6] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.pathname]);

  const go = (hash: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 140);
      return;
    }
    if (hash === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isActive = (link: (typeof links)[number]) =>
    link.route ? location.pathname === link.route : location.pathname === '/' && active === link.hash;

  return (
    <header className="sticky top-0 z-50 pt-3 sm:pt-5">
      <div className="container-page">
        <nav
          aria-label="Primary"
          className={`flex items-center justify-between gap-3 rounded-[26px] border border-line/70 bg-white/92 px-3 py-2.5 shadow-nav backdrop-blur-md sm:px-5 ${
            intro.current ? 'bh-header-open' : ''
          }`}
        >
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${settings.name} home`}>
            <span className="grid size-11 place-items-center rounded-full bg-brand text-white shadow-[0_12px_24px_-14px_rgba(245,130,32,0.9)]">
              <Sandwich className="size-6" strokeWidth={1.9} />
            </span>
            <span className="hidden text-[17px] font-bold leading-none tracking-tight sm:block">
              {settings.name}
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => (link.route ? navigate(link.route) : go(link.hash))}
                  aria-current={isActive(link) ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition duration-300 ${
                    isActive(link)
                      ? 'bg-cream text-brand'
                      : 'text-ink-soft hover:bg-cream/70 hover:text-brand'
                  }`}
                >
                  {t(link.label)}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <SiteSettingsMenu />

            <Link
              to={accountPath}
              aria-label={user ? t(isStaffAccount ? 'Your panel' : 'Your account') : t('Sign in')}
              className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition duration-300 hover:border-brand/40 hover:text-brand"
            >
              <UserRound className="size-[18px]" />
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={`Open shopping bag, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
              className="relative grid size-11 place-items-center rounded-full bg-brand text-white shadow-[0_14px_26px_-16px_rgba(245,130,32,0.95)] transition duration-300 hover:bg-brand-deep active:scale-95"
            >
              <ShoppingBag className="size-5" />
              <span className="absolute -right-1 -top-1 grid size-5 min-w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white ring-2 ring-white">
                {itemCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? t('Close menu') : t('Open menu')}
              className="grid size-10 place-items-center rounded-full border border-line text-ink transition hover:border-brand/40 hover:text-brand lg:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <div
          id="mobile-nav"
          className={`overflow-hidden transition-[max-height,opacity] duration-300 lg:hidden ${
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <ul className="mt-2 space-y-1 rounded-3xl border border-line bg-white p-3 shadow-soft">
            {links.map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => (link.route ? (setMobileOpen(false), navigate(link.route)) : go(link.hash))}
                  className={`w-full rounded-2xl px-4 py-3 text-start text-sm font-medium transition ${
                    isActive(link) ? 'bg-cream text-brand' : 'text-ink-soft hover:bg-mist'
                  }`}
                >
                  {t(link.label)}
                </button>
              </li>
            ))}
            <li className="pt-1">
              <Link
                to={accountPath}
                className="block rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink"
              >
                {user ? user.name.split(' ')[0] : t('Sign in / Register')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
