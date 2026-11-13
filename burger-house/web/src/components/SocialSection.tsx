import { Facebook, Instagram, Music2, Twitter } from 'lucide-react';
import { usePrefs } from '../store/prefs';
import { useSettings } from '../store/settings';
import { Reveal } from './Reveal';

const gallery = [
  { src: '/img/social-1.jpg', alt: 'Burger House burger close-up' },
  { src: '/img/social-2.jpg', alt: 'Freshly grilled burger on a wooden board' },
  { src: '/img/social-3.jpg', alt: 'Loaded burger with melted cheese' },
  { src: '/img/social-4.jpg', alt: 'Signature burger served with fries' },
];

export function SocialSection() {
  const settings = useSettings();
  const { t } = usePrefs();
  const links = [
    { href: settings.social.facebook, label: 'Facebook', Icon: Facebook },
    { href: settings.social.instagram, label: 'Instagram', Icon: Instagram },
    { href: settings.social.twitter, label: 'Twitter / X', Icon: Twitter },
    { href: settings.social.tiktok, label: 'TikTok', Icon: Music2 },
  ];

  return (
    <section className="pb-16 sm:pb-20">
      <div className="container-page">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">@burgerhouse</span>
          <h2 className="mt-3 text-[clamp(2rem,4vw,2.9rem)] font-extrabold leading-tight">{t('Social Media')}</h2>
          <p className="mt-2 text-sm text-muted">{t('Follow us for updates and more!')}</p>
        </Reveal>

        <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {gallery.map((image, index) => (
            <Reveal key={image.src} delay={index * 60}>
              <a
                href={settings.social.instagram || '#'}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block overflow-hidden rounded-3xl bg-mist"
                aria-label={`See ${image.alt} on Instagram`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100">
                  <Instagram className="size-7 text-white" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href || '#'}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Burger House on ${label}`}
              className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink-soft transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-white"
            >
              <Icon className="size-[18px]" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
