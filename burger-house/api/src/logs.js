import { query } from './db.js';

export async function logActivity({ actor, actorName, actorRole, action, detail, ip }) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, actor_name, actor_role, action, detail, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actor?.id || null,
        actorName || actor?.name || 'System',
        actorRole || actor?.role || 'system',
        String(action || 'unknown').slice(0, 80),
        String(detail || '').slice(0, 500),
        ip || null,
      ]
    );
  } catch (error) {
    console.error('[logs] could not record activity', error.message);
  }
}
