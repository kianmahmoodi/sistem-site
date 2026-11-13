import crypto from 'node:crypto';
import { query } from './db.js';

const SECRET = process.env.SESSION_SECRET || 'burger-house-local-development-secret';
const COOKIE_NAME = 'bh_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const STAFF_ROLES = ['super_admin', 'manager', 'cashier'];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const known = Buffer.from(expected, 'hex');
  if (known.length !== candidate.length) return false;
  return crypto.timingSafeEqual(known, candidate);
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

export function createToken(userId, sessionId) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, sid: sessionId, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export async function setSession(req, res, userId, { remember = false } = {}) {
  const maxAge = remember ? REMEMBER_MAX_AGE_SECONDS : MAX_AGE_SECONDS;
  const { rows } = await query(
    `INSERT INTO sessions (user_id, token_hash, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval) RETURNING id`,
    [
      userId,
      crypto.randomBytes(24).toString('hex'),
      req.ip || null,
      String(req.headers?.['user-agent'] || '').slice(0, 250),
      String(maxAge),
    ]
  );
  const token = createToken(userId, rows[0].id);
  await query('UPDATE sessions SET token_hash = $1 WHERE id = $2', [tokenHash(token), rows[0].id]);
  res.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
  return token;
}

export function clearSession(res) {
  res.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function sessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  const data = readToken(token);
  if (!data) return null;
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.username, u.phone, u.role, u.status, u.last_login_at,
            u.two_factor_enabled, s.id AS session_id
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.token_hash = $2 AND s.revoked_at IS NULL AND s.expires_at > now()
       AND u.status = 'active' AND u.id = $3`,
    [data.sid || 0, tokenHash(token || ''), data.uid]
  );
  return rows[0] || null;
}

export async function currentUser(req) {
  return sessionFromRequest(req);
}

export async function revokeRequestSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return;
  await query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [tokenHash(token)]);
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
}

/** Any staff member (super admin, manager or cashier). */
export function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  if (!isStaff(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required.' });
  }
  next();
}

/* ------------------------------ two-factor ------------------------------ */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (const byte of bytes) secret += BASE32[byte % 32];
  return secret;
}

function base32Decode(input) {
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of String(input).toUpperCase().replace(/=+$/, '')) {
    const index = BASE32.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totpCode(secret, counter) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

export function verifyTotp(secret, code) {
  const clean = String(code || '').replace(/\D/g, '');
  if (!secret || clean.length !== 6) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (let offset = -1; offset <= 1; offset += 1) {
    if (totpCode(secret, counter + offset) === clean) return true;
  }
  return false;
}

export function otpauthUrl(secret, email) {
  const label = encodeURIComponent(`Burger House:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Burger%20House&digits=6&period=30`;
}

/* ---------------------------- rate limiting ----------------------------- */

const attempts = new Map();

export function rateLimit({ windowMs = 10 * 60 * 1000, max = 12 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${String(req.body?.email || req.body?.username || '').toLowerCase()}`;
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || entry.resetAt < now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    next();
  };
}

export function resetRateLimit(req) {
  const key = `${req.ip}:${String(req.body?.email || req.body?.username || '').toLowerCase()}`;
  attempts.delete(key);
}
