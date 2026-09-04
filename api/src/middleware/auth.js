import { authFromRequest, verifyToken } from '../utils/auth.js';

export const createAuthMiddleware = () => {
  const requireAuth = async (req, reply) => {
    const payload = authFromRequest(req);
    if (payload) {
      req.user = payload;
      return;
    }
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      try {
        const p = verifyToken(cookieToken);
        req.user = p;
        return;
      } catch {}
    }
    reply.code(401).send({ error: 'auth requise' });
  };

  const isAdmin = (user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const envAdmins = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    if (envAdmins.includes((user.email||'').toLowerCase())) return true;
    return false;
  };

  const requireAdmin = async (req, reply) => {
    const payload = authFromRequest(req);
    let user = payload;
    if (!payload) {
      const cookieToken = req.cookies?.token;
      if (cookieToken) {
        try { user = verifyToken(cookieToken); } catch {}
      }
    }
    if (!user) { reply.code(401).send({ error: 'auth requise' }); return; }
    req.user = user;
    if (!isAdmin(user)) { reply.code(403).send({ error: 'admin requis' }); return; }
  };

  return { requireAuth, requireAdmin, isAdmin };
};

// rate-limit login: 5 tentatives / 15 min par ip+email
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const getRateKey = (req, emailNorm) => {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  return `login:${ip}:${emailNorm.toLowerCase()}`;
};
export const isRateLimited = (key) => {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
};
export const recordLoginAttempt = (key, success) => {
  if (success) { loginAttempts.delete(key); return; }
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
};
