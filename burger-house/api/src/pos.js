import express from 'express';
import { pool, query } from './db.js';
import { requirePanelAccess } from './panels.js';
import { requireRole, requireStaff } from './auth.js';
import { logActivity } from './logs.js';
import { broadcast } from './realtime.js';
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

const router = express.Router();

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

router.use(requireStaff);
router.use(requireRole('cashier', 'manager', 'super_admin'));
router.use(requirePanelAccess);

const PAYMENT_METHODS = ['cash', 'card', 'online'];

/* -------------------------------- catalog -------------------------------- */

router.get('/catalog', async (_req, res, next) => {
  try {
    const products = await query(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = true ORDER BY c.sort_order, p.sort_order, p.id`
    );
    const categories = await query('SELECT id, slug, name FROM categories ORDER BY sort_order, id');
    const settings = publicSettings(await loadSettings());
    res.json({
      items: products.rows.map(serializeProduct),
      categories: categories.rows,
      settings: {
        name: settings.name,
        taxRate: settings.taxRate,
        currency: settings.currency,
        timezone: settings.timezone,
      },
    });
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- orders -------------------------------- */

router.get('/orders', async (req, res, next) => {
  try {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const scope = String(req.query.scope || 'today');
    const where = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR phone ILIKE $${params.length})`
      );
    }
    if (scope === 'today') {
      where.push(`created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Tehran') AT TIME ZONE 'Asia/Tehran')`);
    }
    if (scope === 'mine') {
      params.push(req.user.id);
      where.push(`created_by = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT 60`,
      params
    );
    const ids = rows.rows.map((row) => row.id);
    const grouped = new Map();
    if (ids.length) {
      const items = await query('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id', [ids]);
      for (const item of items.rows) {
        if (!grouped.has(item.order_id)) grouped.set(item.order_id, []);
        grouped.get(item.order_id).push(item);
      }
    }
    res.json({ items: rows.rows.map((row) => serializeOrder(row, grouped.get(row.id) || [])) });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', async (req, res, next) => {
  try {
    const body = req.body || {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const customerName = String(body.customerName || '').trim() || 'Walk-in guest';
    const phone = String(body.phone || '').trim();
    const notes = String(body.notes || '').trim().slice(0, 500);
    const channel = body.channel === 'phone' ? 'phone' : 'pos';
    const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash';

    if (rawItems.length === 0) return res.status(400).json({ error: 'Add at least one product to the order.' });

    const quantities = new Map();
    for (const item of rawItems) {
      const id = Number(item?.id ?? item?.productId);
      const quantity = Math.min(50, Math.max(0, Math.floor(Number(item?.quantity) || 0)));
      if (!Number.isInteger(id) || id <= 0 || quantity <= 0) {
        return res.status(400).json({ error: 'One of the items is invalid.' });
      }
      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const productIds = [...quantities.keys()];
    const products = await query(
      'SELECT id, name, image, price, discount_percent, active FROM products WHERE id = ANY($1)',
      [productIds]
    );
    if (products.rows.length !== productIds.length) {
      return res.status(400).json({ error: 'One of the products is no longer available.' });
    }

    const items = products.rows.map((product) => {
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
    const totals = computeTotals({ items, settings: { ...settings, deliveryFee: 0 }, coupon });
    const orderNumber = await makeOrderNumber();
    const paymentStatus = paymentMethod === 'online' ? 'pending' : 'paid';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO orders
           (order_number, user_id, customer_name, phone, email, address, notes, status, payment_method,
            coupon_code, subtotal, delivery_fee, discount, tax, total, channel, created_by, cashier_name,
            payment_status, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          orderNumber,
          null,
          customerName,
          phone || '—',
          'pos@burgerhouse.local',
          channel === 'phone' ? 'Phone order' : 'In-store order',
          notes,
          paymentMethod,
          coupon ? coupon.code : null,
          totals.subtotal,
          0,
          totals.discount,
          totals.tax,
          totals.total,
          channel,
          req.user.id,
          req.user.name,
          paymentStatus,
          paymentStatus === 'paid' ? new Date() : null,
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
      await client.query(
        `INSERT INTO payments (order_id, method, amount, status, cashier_id) VALUES ($1, $2, $3, $4, $5)`,
        [order.id, paymentMethod, totals.total, paymentStatus, req.user.id]
      );
      await client.query('COMMIT');

      await logActivity({
        actor: req.user,
        action: 'pos.order_created',
        detail: `${orderNumber} · ${totals.total.toFixed(2)} · ${paymentMethod}`,
        ip: req.ip,
      });
      broadcast('orders', { action: 'created', orderId: order.id, orderNumber, channel });

      res.status(201).json({ order: serializeOrder(order, savedItems) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '');
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown order status.' });
    const { rows } = await query(
      `UPDATE orders SET status = $1, updated_at = now(),
         paid_at = CASE WHEN $1 IN ('completed', 'delivered') AND paid_at IS NULL THEN now() ELSE paid_at END,
         payment_status = CASE WHEN $1 IN ('completed', 'delivered') AND payment_method <> 'online' THEN 'paid' ELSE payment_status END
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
    await logActivity({
      actor: req.user,
      action: 'pos.order_status',
      detail: `${rows[0].order_number} → ${status}`,
      ip: req.ip,
    });
    broadcast('orders', { action: 'status', orderId: id, status });
    res.json(serializeOrder(rows[0], items.rows));
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- shifts -------------------------------- */

router.get('/shift', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM employee_shifts WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [req.user.id]
    );
    const shift = rows[0] || null;
    const since = shift ? shift.started_at : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await query(
      `SELECT count(*)::int AS orders, coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue
       FROM orders WHERE created_by = $1 AND created_at >= $2`,
      [req.user.id, since]
    );
    const history = await query(
      `SELECT s.*, 
              (SELECT count(*)::int FROM orders o WHERE o.created_by = s.user_id AND o.created_at BETWEEN s.started_at AND coalesce(s.ended_at, now())) AS orders,
              (SELECT coalesce(sum(o.total), 0)::float FROM orders o WHERE o.created_by = s.user_id AND o.status <> 'cancelled'
                 AND o.created_at BETWEEN s.started_at AND coalesce(s.ended_at, now())) AS revenue
       FROM employee_shifts s WHERE s.user_id = $1 ORDER BY s.started_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json({
      openShift: shift,
      stats: { orders: stats.rows[0].orders, revenue: round(stats.rows[0].revenue) },
      history: history.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/shift/start', async (req, res, next) => {
  try {
    const open = await query(
      'SELECT id FROM employee_shifts WHERE user_id = $1 AND ended_at IS NULL',
      [req.user.id]
    );
    if (open.rows.length) return res.status(409).json({ error: 'You already have an open shift.' });
    const { rows } = await query(
      'INSERT INTO employee_shifts (user_id, note) VALUES ($1, $2) RETURNING *',
      [req.user.id, String(req.body?.note || '').slice(0, 200)]
    );
    await logActivity({ actor: req.user, action: 'shift.started', detail: 'Shift started' });
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/shift/end', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE employee_shifts SET ended_at = now()
       WHERE user_id = $1 AND ended_at IS NULL RETURNING *`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No open shift found.' });
    await logActivity({ actor: req.user, action: 'shift.ended', detail: 'Shift ended' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
