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
  username TEXT,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT 'System',
  actor_role TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  change NUMERIC(12,2) NOT NULL,
  quantity_after NUMERIC(12,2) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_shifts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'cash',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  cashier_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS panel_schedules (
  id SERIAL PRIMARY KEY,
  panel_name TEXT UNIQUE NOT NULL,
  role_id INT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  lock_time TEXT NOT NULL DEFAULT '08:00',
  unlock_time TEXT NOT NULL DEFAULT '23:00',
  selected_days JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
  manual_override TEXT NOT NULL DEFAULT 'auto',
  override_expiration TIMESTAMPTZ,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS panel_access_states (
  panel_name TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'auto',
  override_expires_at TIMESTAMPTZ,
  reason TEXT,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_logs_item_idx ON inventory_logs (item_id);
`;

// Applied after SCHEMA so existing installations pick up the new columns too.
const MIGRATIONS = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (lower(username)) WHERE username IS NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'online';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
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
  timezone: 'Asia/Tehran',
  currency: '$',
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

  // The legacy single administrator account becomes a manager.
  await query(`UPDATE users SET role = 'manager' WHERE role = 'admin'`);

  // One-time creation of the initial super administrator. The bootstrap
  // credentials can be overridden with SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.
  const bootEmail = (process.env.SUPER_ADMIN_EMAIL || 'afshin51@gmail.com').trim().toLowerCase();
  const bootPassword = process.env.SUPER_ADMIN_PASSWORD || '1375Af';
  const { rows: superRows } = await query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
  if (superRows.length === 0) {
    await query(
      `INSERT INTO users (name, email, username, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'super_admin', 'active')
       ON CONFLICT (email) DO NOTHING`,
      ['Afshin', bootEmail, 'afshin', null, hashPassword(bootPassword)]
    );
    await query(
      `UPDATE users SET role = 'super_admin', status = 'active'
       WHERE lower(email) = $1
         AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin' AND lower(email) <> $1)`,
      [bootEmail]
    );
  }

  const { rows: inventoryRows } = await query('SELECT count(*)::int AS count FROM inventory');
  if (inventoryRows[0].count === 0) {
    for (const [name, unit, quantity, threshold] of [
      ['Beef patties', 'pcs', 180, 60],
      ['Brioche buns', 'pcs', 220, 80],
      ['Aged cheddar slices', 'pcs', 140, 60],
      ['Lettuce', 'kg', 9, 4],
      ['Tomatoes', 'kg', 12, 5],
      ['Potatoes', 'kg', 40, 15],
      ['Cola cans', 'pcs', 96, 48],
      ['House sauce', 'l', 6, 2],
    ]) {
      await query('INSERT INTO inventory (name, unit, quantity, threshold) VALUES ($1, $2, $3, $4)', [
        name,
        unit,
        quantity,
        threshold,
      ]);
    }
  }

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
      await query(MIGRATIONS);
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
