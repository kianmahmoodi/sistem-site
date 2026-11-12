import express from 'express';
import { pool, query, migrate } from './db.js';
import {
  clearSession,
  currentUser,
  hashPassword,
  requireAuth,
  setSession,
  verifyPassword,
} from './auth.js';
import {
  ORDER_STATUSES,
  computeTotals,
  customerUnitPrice,
  findCoupon,
  loadSettings,
  makeOrderNumber,
  publicSettings,
  serializeOrder,
  serializeProduct,
} from './pricing.js';
import adminRouter from './admin.js';

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(async (req, _res, next) => {
  try {
    req.user = await currentUser(req);
  } catch {
    req.user = null;
  }
  next();
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ------------------------------- auth ---------------------------------- */

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const phone = String(req.body?.phone || '').trim();

    if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (!emailPattern.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { rows } = await query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role',
      [name, email, phone || null, hashPassword(password), 'customer']
    );
    setSession(res, rows[0].id);
    res.status(201).json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    setSession(res, user.id);
    res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null });
});

/* ------------------------------ catalog --------------------------------- */

app.get('/api/categories', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT id, slug, name FROM categories ORDER BY sort_order, id');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/products', async (req, res, next) => {
  try {
    const { category, q, sort, ids, popular } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 8));

    const where = ['p.active = true'];
    const params = [];

    if (ids) {
      const list = String(ids)
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
      params.push(list);
      where.push(`p.id = ANY($${params.length})`);
    }
    if (category && category !== 'all') {
      params.push(String(category));
      where.push(`c.slug = $${params.length}`);
    }
    if (q) {
      params.push(`%${String(q).trim()}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
    if (popular === 'true') where.push('p.popular = true');

    const sortMap = {
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      popular: 'p.popular DESC, p.rating DESC',
      rating: 'p.rating DESC, p.name ASC',
      newest: 'p.created_at DESC',
    };
    const orderBy = sortMap[String(sort)] || 'p.sort_order ASC, p.id ASC';

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const baseFrom = 'FROM products p LEFT JOIN categories c ON c.id = p.category_id';

    const countResult = await query(`SELECT count(*)::int AS total ${baseFrom} ${whereSql}`, params);
    const total = countResult.rows[0].total;

    const rows = await query(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       ${baseFrom} ${whereSql}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({ items: rows.rows.map(serializeProduct), total, page, limit });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [Number(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(serializeProduct(rows[0]));
  } catch (error) {
    next(error);
  }
});

/* ------------------------------ settings -------------------------------- */

app.get('/api/settings', async (_req, res, next) => {
  try {
    const settings = await loadSettings();
    res.json(publicSettings(settings));
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- coupons -------------------------------- */

app.post('/api/coupons/validate', async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();
    const subtotal = Number(req.body?.subtotal) || 0;
    const coupon = await findCoupon(code);
    if (!coupon) return res.status(404).json({ error: 'That discount code is not valid.' });
    if (subtotal < Number(coupon.min_subtotal)) {
      return res.status(400).json({
        error: `Spend at least $${Number(coupon.min_subtotal).toFixed(2)} to use ${coupon.code}.`,
      });
    }
    const settings = await loadSettings();
    const totals = computeTotals({ items: [{ unitPrice: subtotal, quantity: 1 }], settings, coupon });
    res.json({ code: coupon.code, kind: coupon.kind, value: Number(coupon.value), discount: totals.discount });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- orders -------------------------------- */

app.post('/api/orders', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const address = String(body.address || '').trim();
    const notes = String(body.notes || '').trim().slice(0, 500);
    const paymentMethod = body.paymentMethod === 'online' ? 'online' : 'cash';
    const rawItems = Array.isArray(body.items) ? body.items : [];

    const phoneDigits = phone.replace(/\D/g, '');
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }
    if (!emailPattern.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (address.length < 10) return res.status(400).json({ error: 'Please enter a complete delivery address.' });
    if (rawItems.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });
    if (paymentMethod === 'online') {
      return res.status(400).json({ error: 'Online payment is not available yet. Please choose cash on delivery.' });
    }

    const quantities = new Map();
    for (const item of rawItems) {
      const id = Number(item?.id);
      const quantity = Math.min(20, Math.max(0, Math.floor(Number(item?.quantity) || 0)));
      if (!Number.isInteger(id) || id <= 0 || quantity <= 0) {
        return res.status(400).json({ error: 'One of the items in your cart is invalid.' });
      }
      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const productIds = [...quantities.keys()];
    const { rows: productRows } = await query(
      'SELECT id, name, image, price, discount_percent, active FROM products WHERE id = ANY($1)',
      [productIds]
    );
    if (productRows.length !== productIds.length) {
      return res.status(400).json({ error: 'One of the items in your cart is no longer available.' });
    }

    const items = productRows.map((product) => {
      const quantity = quantities.get(product.id);
      const unitPrice = customerUnitPrice(product);
      return {
        productId: product.id,
        name: product.name,
        image: product.image,
        quantity,
        unitPrice,
        lineTotal: round(unitPrice * quantity),
      };
    });

    const settings = await loadSettings();
    const coupon = body.couponCode ? await findCoupon(body.couponCode) : null;
    const totals = computeTotals({ items, settings, coupon });
    const orderNumber = await makeOrderNumber();

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO orders
         (order_number, user_id, customer_name, phone, email, address, notes, status, payment_method,
          coupon_code, subtotal, delivery_fee, discount, tax, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        orderNumber,
        req.user?.id || null,
        name,
        phone,
        email,
        address,
        notes,
        paymentMethod,
        coupon ? coupon.code : null,
        totals.subtotal,
        totals.deliveryFee,
        totals.discount,
        totals.tax,
        totals.total,
      ]
    );

    const order = inserted.rows[0];
    const savedItems = [];
    for (const item of items) {
      const row = await client.query(
        `INSERT INTO order_items (order_id, product_id, name, image, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [order.id, item.productId, item.name, item.image, item.unitPrice, item.quantity, item.lineTotal]
      );
      savedItems.push(row.rows[0]);
    }
    await client.query('COMMIT');

    res.status(201).json({ order: serializeOrder(order, savedItems) });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    next(error);
  } finally {
    client.release();
  }
});

app.get('/api/orders/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM orders WHERE user_id = $1 OR lower(email) = lower($2) ORDER BY created_at DESC LIMIT 50',
      [req.user.id, req.user.email]
    );
    if (rows.length === 0) return res.json({ orders: [] });
    const ids = rows.map((row) => row.id);
    const { rows: itemRows } = await query(
      'SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id',
      [ids]
    );
    const grouped = new Map();
    for (const item of itemRows) {
      if (!grouped.has(item.order_id)) grouped.set(item.order_id, []);
      grouped.get(item.order_id).push(item);
    }
    res.json({ orders: rows.map((row) => serializeOrder(row, grouped.get(row.id) || [])) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:orderNumber', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM orders WHERE order_number = $1', [
      String(req.params.orderNumber).toUpperCase(),
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [
      rows[0].id,
    ]);
    res.json({ order: serializeOrder(rows[0], items) });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- reviews -------------------------------- */

app.get('/api/reviews', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, rating, body, created_at FROM reviews
       WHERE approved = true ORDER BY created_at DESC LIMIT 30`
    );
    res.json({ items: rows, average: rows.length ? round(rows.reduce((sum, row) => sum + Number(row.rating), 0) / rows.length) : 0, count: rows.length });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reviews', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const body = String(req.body?.body || '').trim();
    const rating = Number(req.body?.rating);
    if (name.length < 2) return res.status(400).json({ error: 'Please tell us your name.' });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please choose a rating between 1 and 5 stars.' });
    }
    if (body.length < 10) return res.status(400).json({ error: 'Your review should be at least 10 characters.' });
    if (body.length > 600) return res.status(400).json({ error: 'Reviews are limited to 600 characters.' });

    await query('INSERT INTO reviews (name, rating, body, approved) VALUES ($1, $2, $3, false)', [
      name.slice(0, 80),
      Math.round(rating * 2) / 2,
      body,
    ]);
    res.status(201).json({ message: 'Thanks! Your review will appear after a quick check by our team.' });
  } catch (error) {
    next(error);
  }
});

/* ----------------------------- newsletter ------------------------------- */

app.post('/api/newsletter', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!emailPattern.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    await query('INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
    res.status(201).json({ message: 'You are on the list — fresh offers are on their way!' });
  } catch (error) {
    next(error);
  }
});

app.use('/api/admin', adminRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((error, _req, res, _next) => {
  console.error('[api]', error);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

async function start() {
  await migrate();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Burger House API listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});

export { ORDER_STATUSES };
