import pg from 'pg';
import { hashPassword } from './auth.js';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || 'postgres://burger:burger@db:5432/burger';

export const pool = new Pool({ connectionString, max: 10 });

export const query = (text, params) => pool.query(text, params);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  badge TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  popular BOOLEAN NOT NULL DEFAULT false,
  discount_percent INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  coupon_code TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL,
  body TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  min_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
`;

const CATEGORIES = [
  ['beef', 'Beef Burgers', 1],
  ['chicken', 'Chicken Burgers', 2],
  ['special', 'Special Burgers', 3],
  ['combos', 'Combo Meals', 4],
  ['drinks', 'Drinks', 5],
  ['sides', 'Sides', 6],
];

const PRODUCTS = [
  ['burger-house-special', 'Burger House Special', 'Signature beef patty, aged cheddar, house sauce, crisp lettuce and vine tomatoes.', 9.5, '/img/burger-1.jpg', 'special', 'Most Popular', 5.0, true, 0],
  ['double-cheese-burger', 'Double Cheese Burger', 'Two smashed beef patties, double cheddar, pickles and our secret burger sauce.', 11.2, '/img/burger-2.jpg', 'beef', 'Hot Deal', 4.8, true, 10],
  ['bbq-bacon-burger', 'BBQ Bacon Burger', 'Flame-grilled beef, smoked bacon, crispy onions and a rich hickory BBQ glaze.', 11.2, '/img/burger-3.jpg', 'beef', '', 4.9, true, 0],
  ['chicken-avocado-burger', 'Chicken Avocado Burger', 'Buttermilk chicken fillet, creamy avocado, baby spinach and lime aioli.', 10.5, '/img/burger-4.jpg', 'chicken', 'New', 4.7, false, 0],
  ['classic-beef-burger', 'Classic Beef Burger', 'The original — juicy beef, melted cheese, lettuce, tomato and house pickles.', 8.9, '/img/burger-5.jpg', 'beef', '', 4.6, false, 0],
  ['crispy-chicken-burger', 'Crispy Chicken Burger', 'Golden crunchy chicken, slaw, dill pickles and a whisper of spicy mayo.', 9.8, '/img/burger-6.jpg', 'chicken', '', 4.6, false, 0],
  ['spicy-jalapeno-burger', 'Spicy Jalapeno Burger', 'Beef patty, pepper jack, fresh jalapenos and chipotle sauce for real heat.', 10.9, '/img/burger-7.jpg', 'special', 'Hot Deal', 4.8, true, 0],
  ['mushroom-swiss-burger', 'Mushroom Swiss Burger', 'Garlic butter mushrooms, nutty Swiss cheese and truffle mayo on brioche.', 11.5, '/img/burger-8.jpg', 'beef', '', 4.7, false, 0],
  ['truffle-smash-burger', 'Truffle Smash Burger', 'Double smash patties, caramelised onions and truffle aioli. A house legend.', 12.9, '/img/burger-9.jpg', 'special', 'New', 4.9, true, 0],
  ['bacon-double-stack', 'Bacon Double Stack', 'Two patties stacked with bacon, aged cheddar and smoky burger relish.', 12.4, '/img/burger-10.jpg', 'beef', '', 4.8, false, 0],
  ['burger-house-combo', 'Burger House Combo', 'Two signature burgers, golden crisp fries and two ice-cold drinks.', 16.9, '/img/combo-pack.jpg', 'combos', 'Combo Pack', 5.0, true, 25],
  ['crispy-chicken-combo', 'Crispy Chicken Combo', 'Crispy chicken burger with fries and a soft drink — the lunch favourite.', 15.4, '/img/burger-6.jpg', 'combos', '', 4.7, false, 0],
  ['golden-crisp-fries', 'Golden Crisp Fries', 'Hand-cut potatoes, twice fried and lightly sea-salted. Served with dip.', 3.2, '/img/side-fries.jpg', 'sides', '', 4.7, true, 0],
  ['loaded-cheese-fries', 'Loaded Cheese Fries', 'Crispy fries smothered in molten cheddar, bacon bits and spring onion.', 4.9, '/img/side-fries-2.jpg', 'sides', '', 4.8, false, 0],
  ['fizzy-cola', 'Fizzy Cola', 'Ice-cold classic cola, served in a chilled glass with fresh lime.', 2.5, '/img/drink-cola.jpg', 'drinks', '', 4.5, false, 0],
  ['fresh-lemonade', 'Fresh Lemonade', 'Hand-pressed lemons, a hint of mint and just enough sweetness.', 3.0, '/img/drink-cola.jpg', 'drinks', 'New', 4.6, false, 0],
];

const REVIEWS = [
  ['Sophie Miller', 5.0, 'Burgers are always delicious and fresh!'],
  ['Jake Johnson', 5.0, 'Great customer service and amazing flavors!'],
  ['Emma Watson', 4.5, 'Best burger joint in town!'],
  ['Liam Brown', 4.0, 'Tasty burgers and crispy fries!'],
];

export const DEFAULT_SETTINGS = {
  name: 'Burger House',
  tagline: 'Delicious Burgers Made Fresh',
  phone: '(555) 123-4567',
  email: 'contact@burgerhouse.com',
  address: '1200 Sunset Boulevard, Los Angeles, CA 90026',
  hours: 'Mon – Sun · 11:00 AM – 11:00 PM',
  deliveryFee: 3.5,
  freeDeliveryOver: 30,
  taxRate: 0.08,
  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    twitter: 'https://x.com',
    tiktok: 'https://tiktok.com',
  },
  hero: [
    {
      eyebrow: 'Fresh & Juicy',
      title: 'Burger House',
      subtitle: 'Delicious Burgers Made Fresh',
      note: 'Flame-grilled every morning with 100% prime beef and baked-daily brioche.',
      price: 9.5,
      image: '/img/hero-burger.jpg',
    },
    {
      eyebrow: 'Double The Cheese',
      title: 'Double Cheese Burger',
      subtitle: 'Two Patties. Twice The Flavour.',
      note: 'Smashed on the grill, layered with aged cheddar and our secret burger sauce.',
      price: 11.2,
      image: '/img/burger-2.jpg',
    },
    {
      eyebrow: 'Smokehouse Favourite',
      title: 'BBQ Bacon Burger',
      subtitle: 'Smoked Bacon & Hickory Glaze',
      note: 'Crispy onions, smoky bacon and a sticky BBQ glaze you will crave again.',
      price: 11.2,
      image: '/img/burger-3.jpg',
    },
    {
      eyebrow: 'New On The Menu',
      title: 'Crispy Chicken',
      subtitle: 'Golden Crunch In Every Bite',
      note: 'Buttermilk marinated chicken with slaw, pickles and spicy mayo.',
      price: 9.8,
      image: '/img/burger-6.jpg',
    },
    {
      eyebrow: 'Feed The Family',
      title: 'Combo Pack',
      subtitle: 'Two Burgers, Fries & Drinks',
      note: 'Our best value bundle — free delivery on every combo order today.',
      price: 16.9,
      image: '/img/combo-pack.jpg',
    },
  ],
  deal: {
    title: 'Hot Deals',
    subtitle: 'Combo Pack For Two',
    description:
      'Two flame-grilled burgers, a generous basket of golden crisp fries and two ice-cold drinks — bundled at our best price of the week.',
    comboPrice: 16.9,
    originalPrice: 22.5,
    freeDelivery: true,
    endsAt: '',
  },
};

async function seed() {
  for (const [slug, name, order] of CATEGORIES) {
    await query(
      'INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
      [slug, name, order]
    );
  }

  const { rows: categoryRows } = await query('SELECT id, slug FROM categories');
  const categoryIds = Object.fromEntries(categoryRows.map((row) => [row.slug, row.id]));

  for (let index = 0; index < PRODUCTS.length; index += 1) {
    const [slug, name, description, price, image, category, badge, rating, popular, discount] =
      PRODUCTS[index];
    await query(
      `INSERT INTO products
         (slug, name, description, price, image, category_id, badge, rating, popular, discount_percent, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (slug) DO NOTHING`,
      [
        slug,
        name,
        description,
        price,
        image,
        categoryIds[category] || null,
        badge || null,
        rating,
        popular,
        discount,
        index + 1,
      ]
    );
  }

  const { rows: reviewRows } = await query('SELECT count(*)::int AS count FROM reviews');
  if (reviewRows[0].count === 0) {
    for (const [name, rating, body] of REVIEWS) {
      await query('INSERT INTO reviews (name, rating, body, approved) VALUES ($1, $2, $3, true)', [
        name,
        rating,
        body,
      ]);
    }
  }

  for (const [code, kind, value, minSubtotal] of [
    ['WELCOME10', 'percent', 10, 0],
    ['BURGER5', 'fixed', 5, 25],
  ]) {
    await query(
      'INSERT INTO coupons (code, kind, value, min_subtotal) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING',
      [code, kind, value, minSubtotal]
    );
  }

  await query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    ['Burger House Admin', 'admin@burgerhouse.com', hashPassword('admin123')]
  );

  const { rows: settingsRows } = await query('SELECT id FROM settings WHERE id = 1');
  if (settingsRows.length === 0) {
    const data = {
      ...DEFAULT_SETTINGS,
      deal: { ...DEFAULT_SETTINGS.deal, endsAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString() },
    };
    await query('INSERT INTO settings (id, data) VALUES (1, $1)', [JSON.stringify(data)]);
  }
}

export async function migrate() {
  let attempt = 0;
  for (;;) {
    try {
      await query(SCHEMA);
      await seed();
      return;
    } catch (error) {
      attempt += 1;
      if (attempt > 20) throw error;
      console.log(`[db] not ready yet (${error.code || error.message}); retrying in 2s`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
