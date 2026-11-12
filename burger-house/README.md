# Burger House

A premium restaurant and online-ordering site: marketing homepage, live menu with
filtering, persistent shopping cart, validated checkout with real orders, customer
accounts, reviews and a role-protected admin dashboard.

```
burger-house/
├─ web/   React 19 + TypeScript + Vite 7 + Tailwind CSS 4 (customer site + admin UI)
└─ api/   Express 4 + PostgreSQL (schema, seed, auth, orders, admin endpoints)
```

## What works

- **Homepage** — floating rounded navigation with scroll-spy, five-slide hero with
  autoplay and pagination, menu with category filters / search / sorting / load more,
  hot-deal combo with live countdown, about section with animated statistics, reviews,
  social gallery, footer with newsletter signup.
- **Menu & products** — 16 seeded products across burgers, combos, drinks and sides,
  quick-view modal, favourites (stored locally), badges, ratings and discounts.
- **Cart** — add, remove, quantity control, free-delivery progress, discount codes,
  taxes and delivery fee; the bag survives page refreshes (`localStorage`).
- **Checkout** — client and server validation, order number (`BH-XXXXX`), order status
  timeline, cash on delivery. Online payment stays disabled until a payment provider is
  connected; no card data is ever collected or stored.
- **Accounts** — register / sign in (scrypt-hashed passwords, signed httpOnly session
  cookie), personal order history. Admin routes are protected on the server, so a
  customer token receives `403` for every admin endpoint.
- **Admin dashboard** — sales, orders, pending orders, customers, best sellers, recent
  orders; product CRUD with images/prices/discounts/visibility; order search, status
  updates and cancellations; review approval; customer list; restaurant settings,
  hero banners, hot-deal copy and discount codes.
- **SEO & accessibility** — semantic landmarks, per-page titles/description/OG tags,
  image alt text, lazy-loaded images, keyboard-visible focus states and
  `prefers-reduced-motion` support.

## Run locally

```bash
# 1. database
docker run -d --name burger-db -p 5432:5432 \
  -e POSTGRES_USER=burger -e POSTGRES_PASSWORD=burger -e POSTGRES_DB=burger postgres:16

# 2. API (http://localhost:8000) — creates its schema and seed data on boot
cd api && npm install
DATABASE_URL=postgres://burger:burger@localhost:5432/burger npm run dev

# 3. web app (http://localhost:3000, proxies /api to the API)
cd ../web && npm install && npm run dev
```

Environment variables used by the API: `DATABASE_URL`, `PORT`, `SESSION_SECRET`.
The web app only needs `API_PROXY_TARGET` (defaults to `http://api:8000`) when the API
is not reachable at that address.

## Admin access

Seeded administrator — change the password before going live:

```
admin@burgerhouse.com
admin123
```

Sign in at `/login`; the dashboard lives at `/admin` (products, orders, reviews,
customers, settings, discount codes).

## Seed data

Schema and seed run automatically at API start (`api/src/db.js`). The seed creates the
six categories, 16 products, four published reviews, the `WELCOME10` (10% off) and
`BURGER5` ($5 off over $25) codes, the admin user and the site settings. Resetting a
database means dropping the volume or truncating the tables; the seed fills empty
tables again.

## Notes

- Product images are served from `web/public/img` (royalty-free photography). Admin
  product forms pick from this gallery or accept any image URL/path; there is no binary
  upload endpoint yet — add object storage if you need one.
- Prices are recalculated on the server from the database when an order is placed, so a
  tampered client cannot change what it pays.
- Order lookups use the unguessable order number; there is no public list endpoint.
