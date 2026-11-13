import express from 'express';
import { query } from './db.js';
import { hashPassword, requireAdmin } from './auth.js';
import { logActivity } from './logs.js';
import { listPanelSchedules, setPanelMode, updatePanelSchedule } from './panels.js';
import { broadcast } from './realtime.js';
import { loadSettings, serializeOrder } from './pricing.js';

const router = express.Router();

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ASSIGNABLE_ROLES = ['manager', 'cashier', 'customer'];
const USER_COLUMNS = `id, name, email, username, phone, role, status, last_login_at, created_at, two_factor_enabled`;

router.use(requireAdmin);

/* ------------------------------- overview -------------------------------- */

router.get('/overview', async (_req, res, next) => {
  try {
    const settings = await loadSettings();
    const tz = settings.timezone || 'Asia/Tehran';
    const summary = await query(
      `SELECT
         coalesce(sum(total) FILTER (WHERE status <> 'cancelled' AND created_at >= (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1)), 0)::float AS revenue_today,
         coalesce(sum(total) FILTER (WHERE status <> 'cancelled' AND created_at >= now() - interval '7 days'), 0)::float AS revenue_week,
         coalesce(sum(total) FILTER (WHERE status <> 'cancelled' AND created_at >= now() - interval '30 days'), 0)::float AS revenue_month,
         count(*)::int AS total_orders,
         count(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing', 'ready'))::int AS active_orders,
         count(*) FILTER (WHERE status IN ('completed', 'delivered'))::int AS completed_orders,
         count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders
       FROM orders`,
      [tz]
    );
    const customers = await query(`SELECT count(*)::int AS count FROM users WHERE role = 'customer'`);
    const staff = await query(
      `SELECT role, count(*)::int AS count FROM users WHERE role IN ('manager', 'cashier', 'super_admin') GROUP BY role`
    );
    const series = await query(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE $1), 'YYYY-MM-DD') AS day,
              coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue,
              count(*)::int AS orders
       FROM orders WHERE created_at >= now() - interval '29 days' GROUP BY 1 ORDER BY 1`,
      [tz]
    );
    const recent = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8');
    const logs = await query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10');
    const lowStock = await query(
      `SELECT id, name, quantity::float, threshold::float FROM inventory WHERE quantity <= threshold ORDER BY quantity LIMIT 6`
    );

    res.json({
      revenue: {
        today: round(summary.rows[0].revenue_today),
        week: round(summary.rows[0].revenue_week),
        month: round(summary.rows[0].revenue_month),
      },
      orders: {
        total: summary.rows[0].total_orders,
        active: summary.rows[0].active_orders,
        completed: summary.rows[0].completed_orders,
        cancelled: summary.rows[0].cancelled_orders,
      },
      customers: customers.rows[0].count,
      staff: staff.rows,
      series: series.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      recentOrders: recent.rows.map((row) => serializeOrder(row)),
      activity: logs.rows,
      lowStock: lowStock.rows,
      timezone: tz,
    });
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- users --------------------------------- */

router.get('/users', async (req, res, next) => {
  try {
    const role = String(req.query.role || '');
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const where = [];
    const params = [];
    if (role && role !== 'all') {
      params.push(role);
      where.push(`role = $${params.length}`);
    } else {
      where.push(`role <> 'customer'`);
    }
    if (status && status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(name ILIKE $${params.length} OR email ILIKE $${params.length} OR coalesce(username, '') ILIKE $${params.length} OR coalesce(phone, '') ILIKE $${params.length})`
      );
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const { rows } = await query(
      `SELECT ${USER_COLUMNS} FROM users ${whereSql} ORDER BY
         CASE role WHEN 'super_admin' THEN 0 WHEN 'manager' THEN 1 WHEN 'cashier' THEN 2 ELSE 3 END, name`,
      params
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || '').trim().toLowerCase() || null;
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim() || null;
    const role = String(body.role || 'cashier');
    const status = body.status === 'locked' || body.status === 'disabled' ? body.status : 'active';

    if (name.length < 2) return res.status(400).json({ error: 'Enter the full name.' });
    if (!emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!['manager', 'cashier'].includes(role)) {
      return res.status(403).json({ error: 'Only manager and cashier accounts can be created here.' });
    }
    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username can use letters, numbers, dots, dashes and underscores (3–30).' });
    }

    const exists = await query(
      'SELECT 1 FROM users WHERE lower(email) = $1 OR ($2::text IS NOT NULL AND lower(username) = $2)',
      [email, username]
    );
    if (exists.rows.length) return res.status(409).json({ error: 'That email or username is already taken.' });

    const { rows } = await query(
      `INSERT INTO users (name, email, username, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${USER_COLUMNS}`,
      [name, email, username, phone, hashPassword(password), role, status]
    );
    await logActivity({
      actor: req.user,
      action: 'user.created',
      detail: `${role} account for ${email}`,
      ip: req.ip,
    });
    broadcast('users', { action: 'created', role });
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid user.' });
    const target = await query('SELECT * FROM users WHERE id = $1', [id]);
    const user = target.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const body = req.body || {};
    const isSelf = user.id === req.user.id;

    if (user.role === 'super_admin' && !isSelf) {
      return res.status(403).json({ error: 'Super administrator accounts cannot be edited here.' });
    }
    if (isSelf && (body.role !== undefined || body.status !== undefined)) {
      return res.status(403).json({ error: 'You cannot change your own role or account status.' });
    }
    if (body.role !== undefined && body.role !== user.role) {
      if (!ASSIGNABLE_ROLES.includes(body.role) || user.role === 'super_admin') {
        return res.status(403).json({ error: 'Only manager, cashier and customer roles can be assigned.' });
      }
    }

    const fields = [];
    const params = [];
    const push = (sql, value) => {
      params.push(value);
      fields.push(`${sql} = $${params.length}`);
    };

    if (body.name !== undefined) {
      if (String(body.name).trim().length < 2) return res.status(400).json({ error: 'Enter the full name.' });
      push('name', String(body.name).trim());
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      const clash = await query('SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2', [email, id]);
      if (clash.rows.length) return res.status(409).json({ error: 'That email is already used.' });
      push('email', email);
    }
    if (body.username !== undefined) {
      const username = String(body.username).trim().toLowerCase() || null;
      if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
        return res.status(400).json({ error: 'Username can use letters, numbers, dots, dashes and underscores (3–30).' });
      }
      if (username) {
        const clash = await query('SELECT 1 FROM users WHERE lower(username) = $1 AND id <> $2', [username, id]);
        if (clash.rows.length) return res.status(409).json({ error: 'That username is already used.' });
      }
      push('username', username);
    }
    if (body.phone !== undefined) push('phone', String(body.phone || '').trim() || null);
    if (body.role !== undefined) push('role', String(body.role));
    if (body.status !== undefined) {
      if (!['active', 'disabled', 'locked'].includes(body.status)) {
        return res.status(400).json({ error: 'Unknown account status.' });
      }
      push('status', body.status);
    }
    if (body.password !== undefined && String(body.password)) {
      if (String(body.password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      push('password_hash', hashPassword(String(body.password)));
      await query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    params.push(id);
    const { rows } = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING ${USER_COLUMNS}`,
      params
    );

    if ((body.status && body.status !== 'active') || (body.role && body.role !== user.role)) {
      await query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    }

    await logActivity({
      actor: req.user,
      action: 'user.updated',
      detail: `${user.email}: ${Object.keys(body).filter((key) => key !== 'password').join(', ')}`,
      ip: req.ip,
    });
    broadcast('users', { action: 'updated', id });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await query('SELECT id, email, role FROM users WHERE id = $1', [id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: 'The super administrator account cannot be deleted.' });
    }
    if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });

    await query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);
    await logActivity({ actor: req.user, action: 'user.deleted', detail: user.email, ip: req.ip });
    broadcast('users', { action: 'deleted', id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/activity', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [Number(req.params.id)]
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------ activity log ----------------------------- */

router.get('/activity-logs', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE action ILIKE $1 OR detail ILIKE $1 OR actor_name ILIKE $1`;
    }
    const { rows } = await query(
      `SELECT a.*, u.email AS user_email FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id ${where}
       ORDER BY a.created_at DESC LIMIT 200`,
      params
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

/* ----------------------------- panel control ----------------------------- */

router.get('/panels', async (_req, res, next) => {
  try {
    res.json(await listPanelSchedules());
  } catch (error) {
    next(error);
  }
});

router.put('/panels/:panel/schedule', async (req, res, next) => {
  try {
    const panel = String(req.params.panel);
    if (!['manager', 'cashier'].includes(panel)) return res.status(404).json({ error: 'Unknown panel.' });
    const state = await updatePanelSchedule(panel, req.body || {}, req.user);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

router.post('/panels/:panel/mode', async (req, res, next) => {
  try {
    const panel = String(req.params.panel);
    if (!['manager', 'cashier'].includes(panel)) return res.status(404).json({ error: 'Unknown panel.' });
    const mode = String(req.body?.mode || '');
    const state = await setPanelMode(panel, {
      mode,
      minutes: req.body?.minutes,
      reason: String(req.body?.reason || '').trim().slice(0, 200),
      actor: req.user,
    });
    if (!state) return res.status(400).json({ error: 'Unknown panel mode.' });
    res.json(state);
  } catch (error) {
    next(error);
  }
});

router.post('/panels/action', async (req, res, next) => {
  try {
    const action = String(req.body?.action || '');
    const reason = String(req.body?.reason || '').trim().slice(0, 200);
    const modes = {
      lock_all: { mode: 'locked', label: 'All staff panels locked' },
      unlock_all: { mode: 'unlocked', label: 'All staff panels unlocked' },
      emergency: { mode: 'emergency', label: 'Emergency lock activated' },
      auto: { mode: 'auto', label: 'Panels returned to automatic mode' },
    };
    if (!modes[action]) return res.status(400).json({ error: 'Unknown panel action.' });

    const results = {};
    for (const panel of ['manager', 'cashier']) {
      results[panel] = await setPanelMode(panel, {
        mode: modes[action].mode,
        reason: reason || modes[action].label,
        actor: req.user,
      });
    }
    res.json({ states: results });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- reports -------------------------------- */

router.get('/reports/financial', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const settings = await loadSettings();
    const tz = settings.timezone || 'Asia/Tehran';
    const summary = await query(
      `SELECT coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::float AS revenue,
              count(*)::int AS orders,
              coalesce(sum(discount) FILTER (WHERE status <> 'cancelled'), 0)::float AS discounts,
              coalesce(sum(tax) FILTER (WHERE status <> 'cancelled'), 0)::float AS tax,
              coalesce(sum(delivery_fee) FILTER (WHERE status <> 'cancelled'), 0)::float AS delivery
       FROM orders WHERE created_at >= now() - ($1 || ' days')::interval`,
      [String(days)]
    );
    const methods = await query(
      `SELECT payment_method, count(*)::int AS orders, coalesce(sum(total), 0)::float AS revenue
       FROM orders WHERE status <> 'cancelled' AND created_at >= now() - ($1 || ' days')::interval
       GROUP BY payment_method ORDER BY revenue DESC`,
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
    res.json({
      days,
      summary: {
        revenue: round(summary.rows[0].revenue),
        orders: summary.rows[0].orders,
        discounts: round(summary.rows[0].discounts),
        tax: round(summary.rows[0].tax),
        delivery: round(summary.rows[0].delivery),
      },
      methods: methods.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
      series: series.rows.map((row) => ({ ...row, revenue: round(row.revenue) })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
