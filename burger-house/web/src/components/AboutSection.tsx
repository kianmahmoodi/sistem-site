import { useEffect, useRef, useState } from 'react';
import { Award, ChefHat, Leaf, Truck } from 'lucide-react';
import { Reveal } from './Reveal';

const features = [
  { icon: Leaf, title: 'Fresh ingredients', copy: 'Produce delivered to our kitchen every morning.' },
  { icon: Award, title: 'Quality guarantee', copy: '100% prime beef, no fillers, ever.' },
  { icon: Truck, title: 'Fast delivery', copy: 'Hot at your door in 30 minutes or less.' },
  { icon: ChefHat, title: 'Customer satisfaction', copy: '4.9 stars from more than 10,000 guests.' },
];

const stats = [
  { target: 10000, suffix: '+', label: 'Happy Customers', decimals: 0 },
  { target: 25, suffix: '+', label: 'Burger Varieties', decimals: 0 },
  { target: 5, suffix: '+', label: 'Years of Experience', decimals: 0 },
  { target: 4.9, suffix: '', label: 'Average Rating', decimals: 1 },
];

function Counter({ target, suffix, decimals }: { target: number; suffix: string; decimals: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }

    let frame = 0;
    const duration = 1400;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          frame = requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString('en-US');

  return (
    <span ref={ref} className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="section-pad scroll-mt-24">
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="relative">
            <div className="overflow-hidden rounded-[36px] shadow-soft">
              <img
                src="/img/about-restaurant.jpg"
                alt="The Burger House dining room"
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition duration-700 hover:scale-105"
              />
            </div>

            <div className="absolute -bottom-8 right-2 w-40 overflow-hidden rounded-3xl border-4 border-white shadow-soft sm:-right-6 sm:w-56">
              <img
                src="/img/about-chef.jpg"
                alt="Guests dining in the Burger House dining room"
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            </div>

            <div className="absolute -left-2 -top-5 rounded-2xl bg-brand px-5 py-4 text-white shadow-soft sm:-left-5">
              <p className="text-3xl font-extrabold leading-none">5+</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide">Years grilling</p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Our story</span>
            <h2 className="mt-3 text-[clamp(2rem,4vw,2.9rem)] font-extrabold leading-tight">
              About Burger House
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              At Burger House, we believe every great burger starts with fresh ingredients, quality meat,
              delicious flavors, and a passion for food.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              What began as a two-table corner grill in 2019 is now the neighbourhood favourite for
              flame-grilled burgers. Every patty is pressed by hand, every bun is baked the same morning,
              and every sauce is made in house — no shortcuts, no compromise.
            </p>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3 rounded-2xl border border-line/80 bg-white p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-brand">
                    <feature.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{feature.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{feature.copy}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <dl className="mt-16 grid grid-cols-2 gap-4 rounded-[32px] bg-cream px-6 py-8 sm:px-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dd className="text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold leading-none text-brand">
                  <Counter target={stat.target} suffix={stat.suffix} decimals={stat.decimals} />
                </dd>
                <dt className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-soft">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
