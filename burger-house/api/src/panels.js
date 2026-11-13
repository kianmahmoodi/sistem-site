import { query } from './db.js';
import { loadSettings } from './pricing.js';
import { logActivity } from './logs.js';
import { broadcast } from './realtime.js';

export const PANELS = ['manager', 'cashier'];

export const PANEL_ROLE = { manager: 'manager', cashier: 'cashier' };

const DEFAULT_SCHEDULE = {
  manager: {
    panel_name: 'manager',
    is_enabled: true,
    schedule_enabled: true,
    lock_time: '08:00',
    unlock_time: '23:00',
    selected_days: [0, 1, 2, 3, 4, 5, 6],
    windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '08:00', end: '23:00' }],
  },
  cashier: {
    panel_name: 'cashier',
    is_enabled: true,
    schedule_enabled: true,
    lock_time: '09:00',
    unlock_time: '22:00',
    selected_days: [0, 1, 2, 3, 4, 5, 6],
    windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '09:00', end: '22:00' }],
  },
};

const MINUTE = 60 * 1000;

/* ------------------------- timezone helpers ---------------------------- */

function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    weekday: weekdays[parts.weekday] ?? 0,
  };
}

// Convert a wall-clock time in `timeZone` to a real instant (UTC Date).
function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const seen = zonedParts(new Date(guess), timeZone);
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
  const offset = seenAsUtc - guess;
  return new Date(guess - offset);
}

function minutesOfDay(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return Math.max(0, Math.min(23, hours || 0)) * 60 + Math.max(0, Math.min(59, minutes || 0));
}

function normalizeWindows(schedule) {
  const list = Array.isArray(schedule.windows) && schedule.windows.length
    ? schedule.windows
    : [{ days: schedule.selected_days || [0, 1, 2, 3, 4, 5, 6], start: schedule.lock_time, end: schedule.unlock_time }];

  return list
    .map((window) => ({
      days: Array.isArray(window.days) && window.days.length ? window.days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
      start: Number.isFinite(minutesOfDay(window.start)) ? minutesOfDay(window.start) : null,
      end: Number.isFinite(minutesOfDay(window.end)) ? minutesOfDay(window.end) : null,
    }))
    .filter((window) => window.start !== null && window.end !== null && window.start !== window.end);
}

/* -------------------------- schedule evaluation ------------------------- */

function evaluateSchedule(schedule, now, timeZone) {
  const windows = normalizeWindows(schedule);
  const local = zonedParts(now, timeZone);
  const nowMinutes = local.hour * 60 + local.minute;

  const isOpenAt = (minutes, weekday) =>
    windows.some((window) => {
      if (!window.days.includes(weekday)) return false;
      if (window.start < window.end) return minutes >= window.start && minutes < window.end;
      // window crossing midnight, e.g. 22:00 → 02:00
      return minutes >= window.start || minutes < window.end;
    });

  const open = isOpenAt(nowMinutes, local.weekday);

  // Next change: scan forward minute by minute for up to 8 days (cheap enough
  // since it only runs on panel state reads and the every-20s cron).
  let opensAt = null;
  let closesAt = null;
  for (let offset = 0; offset <= 8 * 24 * 60; offset += 1) {
    const probe = new Date(now.getTime() + offset * MINUTE);
    const part = zonedParts(probe, timeZone);
    const state = isOpenAt(part.hour * 60 + part.minute, part.weekday);
    if (state !== open) {
      if (state) opensAt = probe;
      else closesAt = probe;
      break;
    }
  }

  return { locked: !open, opensAt, closesAt };
}

function windowLabel(schedule, timeZone) {
  const windows = normalizeWindows(schedule);
  if (!windows.length) return null;
  const pad = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return windows.map((window) => `${pad(window.start)}–${pad(window.end)}`).join(', ');
}

/* -------------------------- persisted state ----------------------------- */

const cache = new Map();
const CACHE_MS = 3000;

export async function ensurePanelRows() {
  for (const panel of PANELS) {
    await query(
      `INSERT INTO panel_schedules (panel_name, is_enabled, schedule_enabled, lock_time, unlock_time, selected_days, windows, timezone)
       VALUES ($1, true, true, $2, $3, $4, $5, 'Asia/Tehran')
       ON CONFLICT (panel_name) DO NOTHING`,
      [
        panel,
        DEFAULT_SCHEDULE[panel].lock_time,
        DEFAULT_SCHEDULE[panel].unlock_time,
        JSON.stringify(DEFAULT_SCHEDULE[panel].selected_days),
        JSON.stringify(DEFAULT_SCHEDULE[panel].windows),
      ]
    );
    await query(
      `INSERT INTO panel_access_states (panel_name, mode) VALUES ($1, 'auto')
       ON CONFLICT (panel_name) DO NOTHING`,
      [panel]
    );
  }
}

async function readPanel(panel) {
  const scheduleResult = await query('SELECT * FROM panel_schedules WHERE panel_name = $1', [panel]);
  const stateResult = await query('SELECT * FROM panel_access_states WHERE panel_name = $1', [panel]);
  return {
    schedule: scheduleResult.rows[0] || { ...DEFAULT_SCHEDULE[panel], windows: DEFAULT_SCHEDULE[panel].windows },
    override: stateResult.rows[0] || { panel_name: panel, mode: 'auto' },
  };
}

export async function getPanelState(panel, { fresh = false } = {}) {
  const cached = cache.get(panel);
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const { schedule, override } = await readPanel(panel);
  const settings = await loadSettings();
  const timeZone = schedule.timezone || settings.timezone || 'Asia/Tehran';
  const now = new Date();

  let mode = override.mode || 'auto';
  const expires = override.override_expires_at ? new Date(override.override_expires_at) : null;

  if ((mode === 'locked' || mode === 'unlocked') && expires && expires.getTime() <= now.getTime()) {
    await query(
      `UPDATE panel_access_states SET mode = 'auto', override_expires_at = NULL, updated_at = now() WHERE panel_name = $1`,
      [panel]
    );
    mode = 'auto';
  }

  const scheduleEval = evaluateSchedule(schedule, now, timeZone);
  let locked;
  let reason;
  let opensAt = null;

  if (mode === 'emergency') {
    locked = true;
    reason = override.reason || 'Emergency lock activated by the administrator.';
  } else if (mode === 'locked') {
    locked = true;
    reason = override.reason || 'Locked manually by the administrator.';
  } else if (mode === 'unlocked') {
    locked = false;
    reason = override.reason || 'Unlocked manually by the administrator.';
  } else if (!schedule.is_enabled) {
    locked = true;
    reason = 'This panel has been disabled by the administrator.';
  } else if (schedule.schedule_enabled) {
    locked = scheduleEval.locked;
    reason = locked ? 'Closed outside the panel working hours.' : null;
    opensAt = scheduleEval.opensAt ? scheduleEval.opensAt.toISOString() : null;
  } else {
    locked = false;
    reason = null;
  }

  const value = {
    panel,
    locked,
    mode,
    reason,
    timezone: timeZone,
    scheduleEnabled: Boolean(schedule.schedule_enabled),
    enabled: Boolean(schedule.is_enabled),
    opensAt: locked ? opensAt : null,
    closesAt: scheduleEval.closesAt ? scheduleEval.closesAt.toISOString() : null,
    hours: windowLabel(schedule, timeZone),
    updatedAt: override.updated_at || schedule.updated_at || null,
  };
  cache.set(panel, { at: Date.now(), value });
  return value;
}

export function clearPanelCache(panel) {
  if (panel) cache.delete(panel);
  else cache.clear();
}

export async function requirePanelAccess(req, res, next) {
  const role = req.user?.role;
  if (!role || role === 'super_admin' || role === 'customer') return next();
  const state = await getPanelState(role, { fresh: true });
  if (state.locked) {
    return res.status(423).json({
      error: state.reason || 'This panel is currently locked.',
      panelLocked: true,
      panel: state.panel,
      opensAt: state.opensAt,
      mode: state.mode,
    });
  }
  next();
}

/* ----------------------------- the cron --------------------------------- */

let timer = null;
let lastStates = {};

async function tick() {
  for (const panel of PANELS) {
    try {
      const state = await getPanelState(panel, { fresh: true });
      const previous = lastStates[panel];
      if (previous && previous.locked !== state.locked) {
        if (state.locked) {
          // Locking a panel invalidates every active session of its role.
          await query(
            `UPDATE sessions SET revoked_at = now()
             WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM users WHERE role = $1)`,
            [PANEL_ROLE[panel]]
          );
        }
        await logActivity({
          actorRole: 'system',
          actorName: 'Panel scheduler',
          action: state.locked ? 'panel.locked' : 'panel.unlocked',
          detail: `${panel} panel ${state.locked ? 'locked' : 'unlocked'} (${state.mode})`,
        });
        broadcast('panel', { panel, locked: state.locked, opensAt: state.opensAt });
      }
      lastStates[panel] = { locked: state.locked };
    } catch (error) {
      console.error('[panels] scheduler tick failed', error.message);
    }
  }
}

export function startPanelScheduler() {
  if (timer) return;
  tick().catch(() => {});
  timer = setInterval(tick, 20000);
  if (typeof timer.unref === 'function') timer.unref();
}

export async function setPanelMode(panel, { mode, minutes, reason, actor }) {
  if (!PANELS.includes(panel)) return null;
  if (!['auto', 'locked', 'unlocked', 'emergency'].includes(mode)) return null;

  const expires =
    Number.isFinite(Number(minutes)) && Number(minutes) > 0
      ? new Date(Date.now() + Number(minutes) * MINUTE)
      : null;

  await query(
    `INSERT INTO panel_access_states (panel_name, mode, override_expires_at, reason, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (panel_name)
     DO UPDATE SET mode = EXCLUDED.mode, override_expires_at = EXCLUDED.override_expires_at,
                   reason = EXCLUDED.reason, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [panel, mode, expires, reason || null, actor?.id || null]
  );

  if (mode === 'locked' || mode === 'emergency') {
    await query(
      `UPDATE sessions SET revoked_at = now()
       WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM users WHERE role = $1 AND id <> $2)`,
      [PANEL_ROLE[panel], actor?.id || 0]
    );
  }

  clearPanelCache(panel);
  const state = await getPanelState(panel, { fresh: true });
  await logActivity({
    actor: actor || null,
    action: `panel.${mode}`,
    detail: `${panel} panel → ${mode}${expires ? ` until ${expires.toISOString()}` : ''}${reason ? ` · ${reason}` : ''}`,
  });
  broadcast('panel', { panel, locked: state.locked, opensAt: state.opensAt, mode });
  return state;
}

export async function updatePanelSchedule(panel, body, actor) {
  if (!PANELS.includes(panel)) return null;
  const windows = Array.isArray(body.windows)
    ? body.windows
        .map((window) => ({
          days: Array.isArray(window.days) ? window.days.map(Number).filter((day) => day >= 0 && day <= 6) : [0, 1, 2, 3, 4, 5, 6],
          start: String(window.start || '00:00'),
          end: String(window.end || '00:00'),
        }))
        .filter((window) => /^\d{2}:\d{2}$/.test(window.start) && /^\d{2}:\d{2}$/.test(window.end))
    : [];

  const first = windows[0] || { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] };

  await query(
    `INSERT INTO panel_schedules
       (panel_name, is_enabled, schedule_enabled, lock_time, unlock_time, selected_days, windows, timezone, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (panel_name) DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       schedule_enabled = EXCLUDED.schedule_enabled,
       lock_time = EXCLUDED.lock_time,
       unlock_time = EXCLUDED.unlock_time,
       selected_days = EXCLUDED.selected_days,
       windows = EXCLUDED.windows,
       timezone = EXCLUDED.timezone,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [
      panel,
      body.isEnabled === undefined ? true : Boolean(body.isEnabled),
      Boolean(body.scheduleEnabled),
      first.start,
      first.end,
      JSON.stringify(first.days),
      JSON.stringify(windows),
      String(body.timezone || 'Asia/Tehran'),
      actor?.id || null,
    ]
  );

  clearPanelCache(panel);
  const state = await getPanelState(panel, { fresh: true });
  await logActivity({
    actor: actor || null,
    action: 'panel.schedule_updated',
    detail: `Schedule for ${panel}: ${windows.length} window(s), ${body.scheduleEnabled ? 'enabled' : 'disabled'}`,
  });
  broadcast('panel', { panel, locked: state.locked, opensAt: state.opensAt, mode: state.mode });
  return state;
}

export async function listPanelSchedules() {
  await ensurePanelRows();
  const { rows } = await query('SELECT * FROM panel_schedules ORDER BY panel_name');
  const states = {};
  for (const panel of PANELS) states[panel] = await getPanelState(panel);
  return { schedules: rows, states };
}
