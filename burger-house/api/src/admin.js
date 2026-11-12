import express from 'express';
import { query } from './db.js';
import { requireAdmin } from './auth.js';
import {
  ORDER_STATUSES,
  loadSettings,
  serializeOrder,
  serializeProduct,
} from './pricing.js';

const router = express.Router();

router.use(requireAdmin);

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `item-${Date.now()}`;

/* ------------------------------ dashboard -------------------------------- */

router.get('/stats', async (_req, res, next) => {
  try {
    const sales = await query(
      `SELECT coalesce(sum(total), 0)::float AS revenue, count(*)::int AS orders
       FROM orders WHERE status <> 'cancelled'`
    );
    const pending = await query(
      `SELECT count(*)::int AS count FROM orders WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')`
    );
    const customers = await query(`SELECT count(*)::int AS count FROM users WHERE role = 'customer'`);
    const bestSellers = await query(
      `SELECT oi.name, sum(oi.quantity)::int AS quantity, sum(oi.line_total)::float AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled'
       GROUP BY oi.name ORDER BY quantity DESC LIMIT 5`
    );
    const recent = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 6');
    const reviews = await query(`SELECT count(*)::int AS count FROM reviews WHERE approved = false`);

    res.json({
      revenue: round(sales.rows[0].revenue),
      orders: sales.rows[0].orders,
      pendingOrders: pending.rows[0].count,
      customers: customers.rows[0].count,
      pendingReviews: reviews.rows[0].count,
      bestSellers: bestSellers.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      recentOrders: recent.rows.map((row) => serializeOrder(row)),
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- products -------------------------------- */

router.get('/products', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE p.name ILIKE $1 OR p.description ILIKE $1`;
    }
    const { rows } = await query(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ${where} ORDER BY p.sort_order, p.id`,
      params
    );
    const categories = await query('SELECT id, slug, name FROM categories ORDER BY sort_order, id');
    res.json({ items: rows.map(serializeProduct), categories: categories.rows });
  } catch (error) {
    next(error);
  }
});

async function categoryIdFor(slug) {
  if (!slug) return null;
  const { rows } = await query('SELECT id FROM categories WHERE slug = $1', [slug]);
  return rows[0]?.id || null;
}

router.post('/products', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const price = Number(body.price);
    if (name.length < 2) return res.status(400).json({ error: 'Product name is required.' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Enter a valid price.' });

    const slug = body.slug ? slugify(body.slug) : slugify(name);
    const exists = await query('SELECT 1 FROM products WHERE slug = $1', [slug]);
    const finalSlug = exists.rows.length ? `${slug}-${Date.now().toString(36)}` : slug;

    const { rows } = await query(
      `INSERT INTO products (slug, name, description, price, image, category_id, badge, rating, popular, discount_percent, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        finalSlug,
        name,
        String(body.description || '').trim(),
        round(price),
        String(body.image || '/img/burger-1.jpg'),
        await categoryIdFor(body.category),
        String(body.badge || '').trim() || null,
        Math.min(5, Math.max(0, Number(body.rating) || 5)),
        Boolean(body.popular),
        Math.min(90, Math.max(0, Number(body.discountPercent) || 0)),
        body.active === undefined ? true : Boolean(body.active),
        Number(body.sortOrder) || 0,
      ]
    );
    res.status(201).json(serializeProduct(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const fields = [];
    const params = [];

    const push = (sql, value) => {
      params.push(value);
      fields.push(`${sql} = $${params.length}`);
    };

    if (body.name !== undefined) push('name', String(body.name).trim());
    if (body.description !== undefined) push('description', String(body.description).trim());
    if (body.price !== undefined) push('price', round(Number(body.price) || 0));
    if (body.image !== undefined) push('image', String(body.image));
    if (body.badge !== undefined) push('badge', String(body.badge || '').trim() || null);
    if (body.rating !== undefined) push('rating', Math.min(5, Math.max(0, Number(body.rating) || 0)));
    if (body.popular !== undefined) push('popular', Boolean(body.popular));
    if (body.active !== undefined) push('active', Boolean(body.active));
    if (body.discountPercent !== undefined) {
      push('discount_percent', Math.min(90, Math.max(0, Number(body.discountPercent) || 0)));
    }
    if (body.sortOrder !== undefined) push('sort_order', Number(body.sortOrder) || 0);
    if (body.category !== undefined) push('category_id', await categoryIdFor(body.category));

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(id);
    const { rows } = await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });

    const withCategory = await query(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [id]
    );
    res.json(serializeProduct(withCategory.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [Number(req.params.id)]);
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- orders --------------------------------- */

router.get('/orders', async (req, res, next) => {
  try {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;

    const where = [];
    const params = [];
    if (status && status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = await query(`SELECT count(*)::int AS total FROM orders ${whereSql}`, params);
    const rows = await query(
      `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );

    const ids = rows.rows.map((row) => row.id);
    let grouped = new Map();
    if (ids.length) {
      const items = await query('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id', [ids]);
      for (const item of items.rows) {
        if (!grouped.has(item.order_id)) grouped.set(item.order_id, []);
        grouped.get(item.order_id).push(item);
      }
    }

    res.json({
      items: rows.rows.map((row) => serializeOrder(row, grouped.get(row.id) || [])),
      total: total.rows[0].total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '');
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Unknown order status.' });
    }
    const { rows } = await query(
      'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
    res.json(serializeOrder(rows[0], items.rows));
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- reviews -------------------------------- */

router.get('/reviews', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/reviews/:id', async (req, res, next) => {
  try {
    const { rows } = await query('UPDATE reviews SET approved = $1 WHERE id = $2 RETURNING *', [
      Boolean(req.body?.approved),
      Number(req.params.id),
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Review not found.' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/reviews/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [Number(req.params.id)]);
    if (rowCount === 0) return res.status(404).json({ error: 'Review not found.' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- customers ------------------------------- */

router.get('/customers', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              count(o.id)::int AS order_count,
              coalesce(sum(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0)::float AS spent
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    res.json({ items: rows.map((row) => ({ ...row, spent: round(row.spent) })) });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- settings ------------------------------- */

router.get('/settings', async (_req, res, next) => {
  try {
    res.json(await loadSettings());
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const current = await loadSettings();
    const body = req.body || {};
    const next_ = { ...current };

    for (const key of ['name', 'tagline', 'phone', 'email', 'address', 'hours']) {
      if (body[key] !== undefined) next_[key] = String(body[key]);
    }
    for (const key of ['deliveryFee', 'freeDeliveryOver', 'taxRate']) {
      if (body[key] !== undefined && Number.isFinite(Number(body[key]))) next_[key] = Number(body[key]);
    }
    if (body.social) next_.social = { ...current.social, ...body.social };
    if (Array.isArray(body.hero)) next_.hero = body.hero;
    if (body.deal) next_.deal = { ...current.deal, ...body.deal };

    await query('UPDATE settings SET data = $1 WHERE id = 1', [JSON.stringify(next_)]);
    res.json(next_);
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- coupons -------------------------------- */

router.get('/coupons', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM coupons ORDER BY id DESC');
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/coupons', async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const kind = req.body?.kind === 'fixed' ? 'fixed' : 'percent';
    const value = Number(req.body?.value);
    if (!code) return res.status(400).json({ error: 'Coupon code is required.' });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Enter a valid discount value.' });
    const { rows } = await query(
      `INSERT INTO coupons (code, kind, value, min_subtotal) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code, kind, value, Number(req.body?.minSubtotal) || 0]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That coupon code already exists.' });
    next(error);
  }
});

router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM coupons WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------ newsletter ------------------------------- */

router.get('/newsletter', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 200');
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
});

export default router;
