import express from 'express';
import { pool, query, migrate } from './db.js';
import {
  clearSession,
  currentUser,
  generateTotpSecret,
  hashPassword,
  isStaff,
  otpauthUrl,
  rateLimit,
  requireAuth,
  requireStaff,
  resetRateLimit,
  revokeRequestSession,
  setSession,
  verifyPassword,
  verifyTotp,
} from './auth.js';
import { logActivity } from './logs.js';
import { ensurePanelRows, getPanelState, requirePanelAccess, startPanelScheduler } from './panels.js';
import { broadcast, sseHandler } from './realtime.js';
import staffRouter from './staff.js';
import posRouter from './pos.js';
import superRouter from './superadmin.js';
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

export function redirectForRole(role) {
  if (role === 'super_admin') return '/admin';
  if (role === 'manager') return '/manager';
  if (role === 'cashier') return '/cashier';
  return '/account';
}

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
      `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'customer', 'active') RETURNING id, name, email, phone, role`,
      [name, email, phone || null, hashPassword(password)]
    );
    await setSession(req, res, rows[0].id);
    await logActivity({ actor: rows[0], action: 'auth.register', detail: 'New customer account', ip: req.ip });
    res.status(201).json({ user: rows[0], redirect: '/account' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', rateLimit(), async (req, res, next) => {
  try {
    const identifier = String(req.body?.email || req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const remember = Boolean(req.body?.remember);

    const { rows } = await query(
      `SELECT * FROM users WHERE lower(email) = $1 OR lower(username) = $1 ORDER BY id LIMIT 1`,
      [identifier]
    );
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      await logActivity({ actorName: identifier || 'unknown', action: 'auth.login_failed', detail: 'Bad credentials', ip: req.ip });
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        error:
          user.status === 'locked'
            ? 'This account has been locked. Please contact the administrator.'
            : 'This account has been disabled. Please contact the administrator.',
      });
    }
    if (user.two_factor_enabled && user.two_factor_secret) {
      const code = String(req.body?.code || '');
      if (!code) {
        return res.status(200).json({ requires2fa: true, message: 'Enter the 6-digit code from your authenticator app.' });
      }
      if (!verifyTotp(user.two_factor_secret, code)) {
        return res.status(401).json({ error: 'That verification code is not valid.' });
      }
    }

    await setSession(req, res, user.id, { remember });
    resetRateLimit(req);
    await logActivity({ actor: user, action: 'auth.login', detail: `Signed in as ${user.role}`, ip: req.ip });

    const redirect = redirectForRole(user.role);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
      redirect,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', async (req, res) => {
  await revokeRequestSession(req);
  if (req.user) await logActivity({ actor: req.user, action: 'auth.logout', detail: 'Signed out', ip: req.ip });
  clearSession(res);
  res.json({ ok: true });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  await logActivity({ actorName: email || 'unknown', action: 'auth.password_reset_requested', detail: 'Reset requested', ip: req.ip });
  res.json({
    message: 'If that account exists, a password reset request has been sent to the administrators.',
  });
});

app.get('/api/auth/me', async (req, res, next) => {
  try {
    let panel = null;
    if (req.user && isStaff(req.user.role) && req.user.role !== 'super_admin') {
      panel = await getPanelState(req.user.role);
    }
    res.json({ user: req.user || null, panel });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/password', requireAuth, async (req, res, next) => {
  try {
    const current = String(req.body?.currentPassword || '');
    const nextPassword = String(req.body?.newPassword || '');
    if (nextPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0] || !verifyPassword(current, rows[0].password_hash)) {
      return res.status(400).json({ error: 'Your current password is not correct.' });
    }
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
      hashPassword(nextPassword),
      req.user.id,
    ]);
    // Changing a password ends every other session.
    await query(
      `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.user.id]
    );
    await setSession(req, res, req.user.id, { remember: true });
    await logActivity({ actor: req.user, action: 'auth.password_changed', detail: 'Password updated', ip: req.ip });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/2fa', requireAuth, (req, res) => {
  res.json({ enabled: Boolean(req.user.two_factor_enabled) });
});

app.post('/api/auth/2fa/setup', requireAuth, async (req, res, next) => {
  try {
    if (req.user.two_factor_enabled) {
      return res.status(400).json({ error: 'Two-factor authentication is already enabled.' });
    }
    const secret = generateTotpSecret();
    await query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, req.user.id]);
    res.json({ secret, otpauth: otpauthUrl(secret, req.user.email) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/2fa/enable', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT two_factor_secret FROM users WHERE id = $1', [req.user.id]);
    const secret = rows[0]?.two_factor_secret;
    if (!secret) return res.status(400).json({ error: 'Start the setup again to receive a secret.' });
    if (!verifyTotp(secret, req.body?.code)) {
      return res.status(400).json({ error: 'That code is not valid. Please try the next one.' });
    }
    await query('UPDATE users SET two_factor_enabled = true WHERE id = $1', [req.user.id]);
    await logActivity({ actor: req.user, action: 'auth.2fa_enabled', detail: 'Two-factor enabled', ip: req.ip });
    res.json({ ok: true, enabled: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/2fa/disable', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT password_hash, two_factor_secret FROM users WHERE id = $1', [req.user.id]);
    const record = rows[0];
    if (!record || !verifyPassword(String(req.body?.password || ''), record.password_hash)) {
      return res.status(400).json({ error: 'Your password is not correct.' });
    }
    if (record.two_factor_secret && !verifyTotp(record.two_factor_secret, req.body?.code)) {
      return res.status(400).json({ error: 'That verification code is not valid.' });
    }
    await query(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
      [req.user.id]
    );
    await logActivity({ actor: req.user, action: 'auth.2fa_disabled', detail: 'Two-factor disabled', ip: req.ip });
    res.json({ ok: true, enabled: false });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------- live updates ------------------------------ */

app.get('/api/events', sseHandler);

app.get('/api/staff/me', requireStaff, async (req, res, next) => {
  try {
    const panel =
      req.user.role === 'super_admin' ? null : await getPanelState(req.user.role, { fresh: true });
    res.json({ user: req.user, panel, redirect: redirectForRole(req.user.role) });
  } catch (error) {
    next(error);
  }
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

    await logActivity({
      actor: req.user || null,
      actorName: name,
      actorRole: req.user?.role || 'guest',
      action: 'order.created',
      detail: `Online order ${orderNumber} · ${totals.total.toFixed(2)}`,
      ip: req.ip,
    });
    broadcast('orders', { action: 'created', orderId: order.id, orderNumber });

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
app.use('/api/staff', staffRouter);
app.use('/api/pos', posRouter);
app.use('/api/super', superRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((error, _req, res, _next) => {
  console.error('[api]', error);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

async function start() {
  await migrate();
  await ensurePanelRows();
  startPanelScheduler();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Burger House API listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});

export { ORDER_STATUSES };
