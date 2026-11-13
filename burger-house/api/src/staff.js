import express from 'express';
import { query } from './db.js';
import { requirePanelAccess } from './panels.js';
import { requireRole, requireStaff } from './auth.js';
import { logActivity } from './logs.js';
import { broadcast } from './realtime.js';
import { ORDER_STATUSES, loadSettings, serializeOrder } from './pricing.js';

const router = express.Router();

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

router.use(requireStaff);
router.use(requireRole('manager', 'super_admin'));
router.use(requirePanelAccess);

export async function assertActor() {
  return true;
}

/* ------------------------------ dashboard -------------------------------- */

router.get('/overview', async (_req, res, next) => {
  try {
    const settings = await loadSettings();
    const tz = settings.timezone || 'Asia/Tehran';

    const summary = await query(
      `SELECT
         coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue_today,
         count(*) FILTER (WHERE status <> 'cancelled')::int AS orders_today,
         count(*) FILTER (WHERE status = 'pending')::int AS pending,
         count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
         count(*) FILTER (WHERE status = 'preparing')::int AS preparing,
         count(*) FILTER (WHERE status = 'ready')::int AS ready,
         count(*) FILTER (WHERE status IN ('completed', 'delivered'))::int AS completed,
         count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
       FROM orders
       WHERE created_at >= (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1)`,
      [tz]
    );

    const series = await query(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE $1), 'YYYY-MM-DD') AS day,
              coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue,
              count(*)::int AS orders
       FROM orders
       WHERE created_at >= now() - interval '13 days'
       GROUP BY 1 ORDER BY 1`,
      [tz]
    );

    const bestSellers = await query(
      `SELECT oi.name, sum(oi.quantity)::int AS quantity, sum(oi.line_total)::float AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled' AND o.created_at >= now() - interval '7 days'
       GROUP BY oi.name ORDER BY quantity DESC LIMIT 6`
    );

    const cashiers = await query(
      `SELECT coalesce(o.cashier_name, u.name, 'Storefront') AS name,
              count(*)::int AS orders, coalesce(sum(o.total), 0)::float AS revenue
       FROM orders o LEFT JOIN users u ON u.id = o.created_by
       WHERE o.status <> 'cancelled' AND o.created_at >= now() - interval '7 days'
         AND o.channel IN ('pos', 'phone')
       GROUP BY 1 ORDER BY revenue DESC LIMIT 8`
    );

    const lowStock = await query(
      `SELECT id, name, unit, quantity::float, threshold::float FROM inventory
       WHERE quantity <= threshold ORDER BY quantity ASC LIMIT 6`
    );

    const recent = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8');

    res.json({
      today: {
        revenue: round(summary.rows[0].revenue_today),
        orders: summary.rows[0].orders_today,
        pending: summary.rows[0].pending,
        confirmed: summary.rows[0].confirmed,
        preparing: summary.rows[0].preparing,
        ready: summary.rows[0].ready,
        completed: summary.rows[0].completed,
        cancelled: summary.rows[0].cancelled,
      },
      series: series.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      bestSellers: bestSellers.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      cashiers: cashiers.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      lowStock: lowStock.rows,
      recentOrders: recent.rows.map((row) => serializeOrder(row)),
      timezone: tz,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- orders --------------------------------- */

router.get('/orders', async (req, res, next) => {
  try {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const channel = String(req.query.channel || '');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));

    const where = [];
    const params = [];
    if (status && status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (channel && channel !== 'all') {
      params.push(channel);
      where.push(`channel = $${params.length}`);
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
    const grouped = new Map();
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
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown order status.' });

    const { rows } = await query(
      `UPDATE orders SET status = $1, updated_at = now(),
         paid_at = CASE WHEN $1 IN ('completed', 'delivered') AND paid_at IS NULL THEN now() ELSE paid_at END,
         payment_status = CASE WHEN $1 IN ('completed', 'delivered') THEN 'paid' ELSE payment_status END
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);

    await logActivity({
      actor: req.user,
      action: 'order.status',
      detail: `${rows[0].order_number} → ${status}`,
      ip: req.ip,
    });
    broadcast('orders', { action: 'status', orderId: id, status });
    res.json(serializeOrder(rows[0], items.rows));
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/cancel', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 3) return res.status(400).json({ error: 'Please give a reason for the cancellation.' });
    const { rows } = await query(
      `UPDATE orders SET status = 'cancelled', cancel_reason = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [reason.slice(0, 300), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
    await logActivity({
      actor: req.user,
      action: 'order.cancelled',
      detail: `${rows[0].order_number} · ${reason}`,
      ip: req.ip,
    });
    broadcast('orders', { action: 'cancelled', orderId: id });
    res.json(serializeOrder(rows[0], items.rows));
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- inventory ------------------------------- */

router.get('/inventory', async (_req, res, next) => {
  try {
    const items = await query('SELECT * FROM inventory ORDER BY name');
    const logs = await query(
      `SELECT l.*, i.name AS item_name, u.name AS user_name
       FROM inventory_logs l JOIN inventory i ON i.id = l.item_id
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC LIMIT 40`
    );
    res.json({
      items: items.rows.map((row) => ({ ...row, quantity: Number(row.quantity), threshold: Number(row.threshold) })),
      logs: logs.rows.map((row) => ({ ...row, change: Number(row.change), quantity_after: Number(row.quantity_after) })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/inventory', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const unit = String(req.body?.unit || 'pcs').trim();
    const quantity = Number(req.body?.quantity) || 0;
    const threshold = Number(req.body?.threshold) || 0;
    if (name.length < 2) return res.status(400).json({ error: 'Enter an item name.' });

    const { rows } = await query(
      'INSERT INTO inventory (name, unit, quantity, threshold) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, unit, quantity, threshold]
    );
    await query(
      'INSERT INTO inventory_logs (item_id, change, quantity_after, note, user_id) VALUES ($1, $2, $3, $4, $5)',
      [rows[0].id, quantity, quantity, 'Initial stock', req.user.id]
    );
    await logActivity({ actor: req.user, action: 'inventory.created', detail: `${name} (${quantity} ${unit})` });
    broadcast('inventory', { action: 'created' });
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/inventory/:id', async (req, res, next) => {
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
    if (body.unit !== undefined) push('unit', String(body.unit).trim());
    if (body.threshold !== undefined) push('threshold', Number(body.threshold) || 0);
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    params.push(id);
    const { rows } = await query(
      `UPDATE inventory SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    await logActivity({ actor: req.user, action: 'inventory.updated', detail: rows[0].name });
    broadcast('inventory', { action: 'updated' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/inventory/:id/adjust', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const change = Number(req.body?.change);
    const note = String(req.body?.note || '').trim() || 'Stock adjustment';
    if (!Number.isFinite(change) || change === 0) {
      return res.status(400).json({ error: 'Enter a non-zero amount.' });
    }
    const current = await query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    const quantityAfter = Math.max(0, Number(current.rows[0].quantity) + change);

    const { rows } = await query(
      'UPDATE inventory SET quantity = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [quantityAfter, id]
    );
    await query(
      'INSERT INTO inventory_logs (item_id, change, quantity_after, note, user_id) VALUES ($1, $2, $3, $4, $5)',
      [id, change, quantityAfter, note, req.user.id]
    );
    await logActivity({
      actor: req.user,
      action: 'inventory.adjusted',
      detail: `${current.rows[0].name}: ${change > 0 ? '+' : ''}${change} → ${quantityAfter}`,
    });
    broadcast('inventory', { action: 'adjusted', itemId: id });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/inventory/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM inventory WHERE id = $1', [Number(req.params.id)]);
    if (rowCount === 0) return res.status(404).json({ error: 'Item not found.' });
    await logActivity({ actor: req.user, action: 'inventory.deleted', detail: `Item #${req.params.id}` });
    broadcast('inventory', { action: 'deleted' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- employees ------------------------------- */

router.get('/employees', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.username, u.phone, u.role, u.status, u.last_login_at,
              count(o.id)::int AS order_count,
              coalesce(sum(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0)::float AS revenue,
              max(o.created_at) AS last_order_at
       FROM users u
       LEFT JOIN orders o ON o.created_by = u.id
       WHERE u.role IN ('manager', 'cashier')
       GROUP BY u.id ORDER BY u.role, u.name`
    );
    const shifts = await query(
      `SELECT s.*, u.name AS user_name FROM employee_shifts s JOIN users u ON u.id = s.user_id
       ORDER BY s.started_at DESC LIMIT 30`
    );
    res.json({
      employees: rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      shifts: shifts.rows,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- reports -------------------------------- */

async function reportData({ days = 7, timezone } = {}) {
  const tz = timezone || (await loadSettings()).timezone || 'Asia/Tehran';
  const summary = await query(
    `SELECT coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue,
            count(*)::int AS orders,
            count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
            coalesce(sum(tax) FILTER (WHERE status <> 'cancelled'), 0)::float AS tax,
            coalesce(sum(discount) FILTER (WHERE status <> 'cancelled'), 0)::float AS discount,
            coalesce(sum(delivery_fee) FILTER (WHERE status <> 'cancelled'), 0)::float AS delivery,
            coalesce(avg(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS average
     FROM orders WHERE created_at >= now() - ($1 || ' days')::interval`,
    [String(days)]
  );
  const series = await query(
    `SELECT to_char(date_trunc('day', created_at AT TIME ZONE $1), 'YYYY-MM-DD') AS day,
            coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue,
            count(*)::int AS orders
     FROM orders WHERE created_at >= now() - ($2 || ' days')::interval
     GROUP BY 1 ORDER BY 1`,
    [tz, String(days)]
  );
  const bestSellers = await query(
    `SELECT oi.name, sum(oi.quantity)::int AS quantity, sum(oi.line_total)::float AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status <> 'cancelled' AND o.created_at >= now() - ($1 || ' days')::interval
     GROUP BY oi.name ORDER BY quantity DESC LIMIT 10`,
    [String(days)]
  );
  const cancelled = await query(
    `SELECT order_number, customer_name, total::float, cancel_reason, created_at
     FROM orders WHERE status = 'cancelled' AND created_at >= now() - ($1 || ' days')::interval
     ORDER BY created_at DESC LIMIT 50`,
    [String(days)]
  );
  const cashiers = await query(
    `SELECT coalesce(o.cashier_name, u.name, 'Storefront') AS name,
            count(*)::int AS orders, coalesce(sum(o.total), 0)::float AS revenue
     FROM orders o LEFT JOIN users u ON u.id = o.created_by
     WHERE o.status <> 'cancelled' AND o.created_at >= now() - ($1 || ' days')::interval
       AND o.channel IN ('pos', 'phone')
     GROUP BY 1 ORDER BY revenue DESC`,
    [String(days)]
  );

  return {
    days,
    timezone: tz,
    summary: {
      revenue: round(summary.rows[0].revenue),
      orders: summary.rows[0].orders,
      cancelled: summary.rows[0].cancelled,
      tax: round(summary.rows[0].tax),
      discount: round(summary.rows[0].discount),
      delivery: round(summary.rows[0].delivery),
      average: round(summary.rows[0].average),
    },
    series: series.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
    bestSellers: bestSellers.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
    cancelledOrders: cancelled.rows.map((row) => ({ ...row, total: round(row.total) })),
    cashiers: cashiers.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
  };
}

router.get('/reports', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 7));
    res.json(await reportData({ days }));
  } catch (error) {
    next(error);
  }
});

router.get('/reports/export.csv', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 7));
    const data = await reportData({ days });
    const lines = ['Day,Revenue,Orders'];
    for (const row of data.series) lines.push(`${row.day},${row.revenue.toFixed(2)},${row.orders}`);
    lines.push('');
    lines.push('Product,Units sold,Revenue');
    for (const row of data.bestSellers) lines.push(`"${row.name.replace(/"/g, '""')}",${row.quantity},${row.revenue.toFixed(2)}`);
    lines.push('');
    lines.push('Cashier,Orders,Revenue');
    for (const row of data.cashiers) lines.push(`"${row.name.replace(/"/g, '""')}",${row.orders},${row.revenue.toFixed(2)}`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="burger-house-report-${days}d.csv"`);
    res.send(lines.join('\n'));
  } catch (error) {
    next(error);
  }
});

export default router;
