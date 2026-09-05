import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, signToken, authFromRequest, hashToken, verifyToken } from '../utils/auth.js';
import { isValidEmail, genVerificationToken, genResetToken } from '../utils/helpers.js';
import { isBlocked, blockedReason } from '../utils/moderation.js';
import { createAuthMiddleware, getRateKey, isRateLimited, recordLoginAttempt, getIpKey, isGenericRateLimited, recordGenericAttempt } from '../middleware/auth.js';

export default async function authRoutes(app, { db, pool, users, players }) {
  const getUsersTable = () => users || players;
  const { requireAuth } = createAuthMiddleware();
  const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 };

  app.post('/api/auth/register', async (req, reply) => {
    const rateKeyReg = getIpKey(req, 'register');
    if (isGenericRateLimited(rateKeyReg)) return reply.code(429).send({ error: 'trop de créations, réessaie dans 15 minutes' });
    recordGenericAttempt(rateKeyReg);
    const { email, pseudo, password, poste, niveau } = req.body;
    if (!email || !pseudo || !password || !poste || !niveau) return reply.code(400).send({ error: 'email, pseudo, password, poste, niveau requis' });
    if (!isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    if (password.length < 6) return reply.code(400).send({ error: 'mot de passe trop court (6 min)' });
    if (!pseudo.trim() || pseudo.trim().length < 2) return reply.code(400).send({ error: 'pseudo trop court' });
    if (pseudo.trim().length > 24) return reply.code(400).send({ error: 'pseudo trop long (24 max)' });
    if (!/^[a-zA-Z0-9._-]+$/.test(pseudo.trim())) return reply.code(400).send({ error: 'pseudo: caractères autorisés a-z 0-9 . _ -' });
    if (isBlocked(pseudo.trim())) return reply.code(400).send({ error: blockedReason(pseudo.trim()) });
    const emailNorm = email.trim().toLowerCase();
    const hash = await hashPassword(password);
    const verificationTokenRaw = genVerificationToken();
    const verificationTokenHash = hashToken(verificationTokenRaw);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    const initialRole = adminEmails.includes(emailNorm) ? 'admin' : 'user';
    const target = getUsersTable();
    const isUsers = target && target !== players;
    try {
      const values = { email: emailNorm, pseudo: pseudo.trim(), passwordHash: hash, poste, niveau, role: initialRole, emailVerified: 0, verificationToken: verificationTokenHash, verificationExpires };
      let row;
      try {
        const [r] = await db.insert(target).values(values).returning();
        row = r;
      } catch (e) {
        if (e.message?.includes('verification') || e.message?.includes('email_verified')) throw e;
        throw e;
      }
      try {
        await pool.query(`UPDATE users SET verification_token=$1, verification_expires=$2, email_verified=0, role=$3 WHERE id=$4`, [verificationTokenHash, verificationExpires, initialRole, row.id]);
      } catch {}
      try {
        const rows = await db.select().from(target);
        const found = rows.find(r => r.id === row.id);
        if (found) {
          found.verificationToken = verificationTokenHash;
          found.verification_token = verificationTokenHash;
          found.verificationExpires = verificationExpires;
          found.verification_expires = verificationExpires;
          found.emailVerified = 0;
          found.email_verified = 0;
          found.role = initialRole;
        }
      } catch {}
      if (isUsers && initialRole !== 'admin') {
        try { await db.insert(players).values({ pseudo: pseudo.trim(), poste, niveau }).returning(); } catch {}
      }
      const token = signToken({ id: row.id, email: row.email, pseudo: row.pseudo, role: initialRole });
      reply.setCookie('token', token, cookieOpts);
      const userOut = { id: row.id, email: row.email, pseudo: row.pseudo, poste: row.poste, niveau: row.niveau, role: initialRole, emailVerified: false };
      if (process.env.NODE_ENV === 'production') {
        return reply.code(201).send({ user: userOut, token, message: 'Compte créé — vérifie ton email' });
      }
      return reply.code(201).send({ user: userOut, token, verificationToken: verificationTokenRaw, message: 'Compte créé — vérifie ton email' });
    } catch (e) {
      if (e.code === '23505') {
        const msg = e.detail?.includes('email') ? 'email déjà pris' : 'pseudo déjà pris';
        return reply.code(409).send({ error: msg });
      }
      throw e;
    }
  });

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password) return reply.code(400).send({ error: 'email, password requis' });
    if (!isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    const emailNorm = email.trim().toLowerCase();
    const rateKey = getRateKey(req, emailNorm);
    if (isRateLimited(rateKey)) return reply.code(429).send({ error: 'trop de tentatives, réessaie dans 15 minutes' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.email?.toLowerCase() === emailNorm);
    if (!user) {
      recordLoginAttempt(rateKey, false);
      return reply.code(401).send({ error: 'identifiants invalides' });
    }
    const ok = await verifyPassword(password, user.passwordHash || user.password_hash);
    if (!ok) {
      recordLoginAttempt(rateKey, false);
      return reply.code(401).send({ error: 'identifiants invalides' });
    }
    recordLoginAttempt(rateKey, true);
    const emailVerified = Boolean(user.emailVerified ?? user.email_verified);
    const role = user.role || 'user';
    const token = signToken({ id: user.id, email: user.email, pseudo: user.pseudo, role });
    reply.setCookie('token', token, cookieOpts);
    return reply.send({ user: { id: user.id, email: user.email, pseudo: user.pseudo, poste: user.poste, niveau: user.niveau, role, emailVerified }, token, emailVerified, role });
  });

  app.get('/api/auth/me', async (req, reply) => {
    let payload = authFromRequest(req);
    if (!payload && req.cookies?.token) {
      try { payload = verifyToken(req.cookies.token); } catch {}
    }
    if (!payload) return reply.code(401).send({ error: 'non authentifié' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.id === payload.id);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    const emailVerified = Boolean(user.emailVerified ?? user.email_verified ?? 0);
    const role = user.role || 'user';
    return { id: user.id, email: user.email, pseudo: user.pseudo, poste: user.poste, niveau: user.niveau, role, emailVerified, email_verified: emailVerified ? 1 : 0 };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    reply.clearCookie('token', { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return { ok: true };
  });

  app.post('/api/auth/verify-email', async (req, reply) => {
    const { token } = req.body || {};
    if (!token) return reply.code(400).send({ error: 'token requis' });
    const hash = hashToken(token);
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => (r.verificationToken ?? r.verification_token) === hash);
    if (!user) return reply.code(400).send({ error: 'token invalide' });
    const expires = user.verificationExpires ?? user.verification_expires;
    if (expires && new Date(expires) < new Date()) return reply.code(400).send({ error: 'token expiré' });
    const userId = user.id;
    try {
      await pool.query(`UPDATE users SET email_verified=1, verification_token=NULL, verification_expires=NULL WHERE id=$1`, [userId]);
    } catch {}
    try {
      user.emailVerified = 1;
      user.email_verified = 1;
      user.verificationToken = null;
      user.verification_token = null;
      user.verificationExpires = null;
      user.verification_expires = null;
    } catch {}
    const role = user.role || 'user';
    const newToken = signToken({ id: user.id, email: user.email, pseudo: user.pseudo, role });
    reply.setCookie('token', newToken, cookieOpts);
    return { ok: true, user: { id: user.id, email: user.email, pseudo: user.pseudo, role, emailVerified: true }, token: newToken };
  });

  app.post('/api/auth/resend-verification', async (req, reply) => {
    const rateKeyResend = getIpKey(req, 'resend');
    if (isGenericRateLimited(rateKeyResend)) return reply.code(429).send({ error: 'trop de demandes, réessaie dans 15 minutes' });
    recordGenericAttempt(rateKeyResend);
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    const emailNorm = email.trim().toLowerCase();
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.email?.toLowerCase() === emailNorm);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    if (user.emailVerified ?? user.email_verified) return reply.code(400).send({ error: 'email déjà vérifié' });
    const newTokenRaw = genVerificationToken();
    const newTokenHash = hashToken(newTokenRaw);
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await pool.query(`UPDATE users SET verification_token=$1, verification_expires=$2 WHERE id=$3`, [newTokenHash, newExpires, user.id]);
    } catch {}
    try {
      user.verificationToken = newTokenHash;
      user.verification_token = newTokenHash;
      user.verificationExpires = newExpires;
      user.verification_expires = newExpires;
    } catch {}
    if (process.env.NODE_ENV === 'production') {
      return { ok: true, message: 'Email de vérification renvoyé' };
    }
    return { ok: true, verificationToken: newTokenRaw, message: 'Email de vérification renvoyé' };
  });

  app.post('/api/auth/forgot', async (req, reply) => {
    const rateKeyForgot = getIpKey(req, 'forgot');
    if (isGenericRateLimited(rateKeyForgot)) return reply.code(429).send({ error: 'trop de demandes, réessaie dans 15 minutes' });
    recordGenericAttempt(rateKeyForgot);
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    const emailNorm = email.trim().toLowerCase();
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.email?.toLowerCase() === emailNorm);
    if (!user) return { ok: true, message: 'Si ce compte existe, un email a été envoyé' };
    const resetTokenRaw = genResetToken();
    const resetTokenHash = hashToken(resetTokenRaw);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    try {
      await pool.query(`UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3`, [resetTokenHash, resetExpires, user.id]);
    } catch {}
    try {
      user.resetToken = resetTokenHash;
      user.reset_token = resetTokenHash;
      user.resetExpires = resetExpires;
      user.reset_expires = resetExpires;
    } catch {}
    if (process.env.NODE_ENV === 'production') {
      return { ok: true, message: 'Si ce compte existe, un email a été envoyé' };
    }
    return { ok: true, resetToken: resetTokenRaw, message: 'Si ce compte existe, un email a été envoyé' };
  });

  app.post('/api/auth/reset', async (req, reply) => {
    const { token, newPassword, password } = req.body || {};
    const pwd = newPassword || password;
    if (!token || !pwd) return reply.code(400).send({ error: 'token, newPassword requis' });
    if (pwd.length < 6) return reply.code(400).send({ error: 'mot de passe trop court (6 min)' });
    const hashTok = hashToken(token);
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => (r.resetToken ?? r.reset_token) === hashTok);
    if (!user) return reply.code(400).send({ error: 'token invalide' });
    const expires = user.resetExpires ?? user.reset_expires;
    if (expires && new Date(expires) < new Date()) return reply.code(400).send({ error: 'token expiré' });
    const hash = await hashPassword(pwd);
    try {
      await pool.query(`UPDATE users SET password_hash=$1, reset_token=NULL, reset_expires=NULL WHERE id=$2`, [hash, user.id]);
    } catch {
      try { await db.update(target).set({ passwordHash: hash }).where(eq(target.id, user.id)); } catch {}
    }
    try {
      user.passwordHash = hash;
      user.password_hash = hash;
      user.resetToken = null;
      user.reset_token = null;
      user.resetExpires = null;
      user.reset_expires = null;
    } catch {}
    return { ok: true, message: 'Mot de passe réinitialisé' };
  });

  app.patch('/api/auth/me', { preHandler: requireAuth }, async (req, reply) => {
    const { email, pseudo, poste, niveau } = req.body;
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.id === req.user.id);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    const data = {};
    let emailChanged = false;
    if (email && email.trim().toLowerCase() !== user.email) {
      const norm = email.trim().toLowerCase();
      if (!isValidEmail(norm)) return reply.code(400).send({ error: 'email invalide' });
      data.email = norm;
      emailChanged = true;
    }
    if (pseudo && pseudo.trim() !== user.pseudo) {
      if (pseudo.trim().length < 2) return reply.code(400).send({ error: 'pseudo trop court' });
      if (pseudo.trim().length > 24) return reply.code(400).send({ error: 'pseudo trop long (24 max)' });
      if (!/^[a-zA-Z0-9._-]+$/.test(pseudo.trim())) return reply.code(400).send({ error: 'pseudo: caractères autorisés a-z 0-9 . _ -' });
      if (isBlocked(pseudo.trim())) return reply.code(400).send({ error: blockedReason(pseudo.trim()) });
      data.pseudo = pseudo.trim();
    }
    if (poste) data.poste = poste;
    if (niveau) data.niveau = niveau;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'rien à mettre à jour' });
    if (emailChanged) {
      data.emailVerified = 0;
      data.email_verified = 0;
      const vTokenRaw = genVerificationToken();
      const vTokenHash = hashToken(vTokenRaw);
      const vExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      data.verificationToken = vTokenHash;
      data.verification_token = vTokenHash;
      data.verificationExpires = vExpires;
      data.verification_expires = vExpires;
      data._verificationTokenRaw = vTokenRaw;
    }
    try {
      const ALLOWED_COLS = new Set(['email','pseudo','poste','niveau','email_verified','verification_token','verification_expires']);
      const setClauses = [];
      const vals = [];
      let idx = 1;
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith('_')) continue;
        let dbCol = k;
        if (k === 'emailVerified') dbCol = 'email_verified';
        else if (k === 'verificationToken') dbCol = 'verification_token';
        else if (k === 'verificationExpires') dbCol = 'verification_expires';
        if (k === 'email_verified' || k === 'verification_token' || k === 'verification_expires') dbCol = k;
        if (!ALLOWED_COLS.has(dbCol)) return reply.code(400).send({ error: `colonne non autorisée: ${dbCol}` });
        setClauses.push(`${dbCol} = $${idx++}`);
        vals.push(v);
      }
      if (!setClauses.length) return reply.code(400).send({ error: 'rien à mettre à jour' });
      vals.push(req.user.id);
      const filteredData = Object.fromEntries(Object.entries(data).filter(([k])=>!k.startsWith('_')));
      const { rows: upd } = await pool.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, email, pseudo, poste, niveau, role, email_verified, created_at`, vals).catch(async () => {
        const [row] = await db.update(target).set(filteredData).where(eq(target.id, req.user.id)).returning();
        return { rows: row ? [row] : [] };
      });
      const updated = upd[0] || upd;
      if (!updated) return reply.code(404).send({ error: 'maj échouée' });
      try {
        Object.assign(user, data);
        if (emailChanged) {
          user.emailVerified = 0;
          user.email_verified = 0;
        }
      } catch {}
      if (data.pseudo) {
        try { await pool.query(`UPDATE players SET pseudo=$1 WHERE pseudo=$2`, [data.pseudo, user.pseudo]); } catch {}
      }
      const out = { id: updated.id ?? user.id, email: updated.email ?? data.email ?? user.email, pseudo: updated.pseudo ?? data.pseudo ?? user.pseudo, poste: updated.poste ?? data.poste ?? user.poste, niveau: updated.niveau ?? data.niveau ?? user.niveau, role: user.role || 'user', emailVerified: Boolean(updated.email_verified ?? updated.emailVerified ?? 0) };
      const token = signToken({ id: out.id, email: out.email, pseudo: out.pseudo, role: out.role });
      reply.setCookie('token', token, cookieOpts);
      let extra = {};
      if (emailChanged) {
        extra.message = 'Email changé — revérifie ton adresse';
        if (process.env.NODE_ENV !== 'production' && data._verificationTokenRaw) extra.verificationToken = data._verificationTokenRaw;
      }
      return { user: out, token, ...extra };
    } catch (e) {
      if (e.code === '23505') {
        const msg = e.detail?.includes('email') ? 'email déjà pris' : 'pseudo déjà pris';
        return reply.code(409).send({ error: msg });
      }
      throw e;
    }
  });

  app.post('/api/auth/change-password', { preHandler: requireAuth }, async (req, reply) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return reply.code(400).send({ error: 'oldPassword, newPassword requis' });
    if (newPassword.length < 6) return reply.code(400).send({ error: 'nouveau mot de passe trop court (6 min)' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.id === req.user.id);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    const ok = await verifyPassword(oldPassword, user.passwordHash || user.password_hash);
    if (!ok) return reply.code(401).send({ error: 'ancien mot de passe invalide' });
    const hash = await hashPassword(newPassword);
    await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, req.user.id]).catch(async () => {
      await db.update(target).set({ passwordHash: hash }).where(eq(target.id, req.user.id));
    });
    return { ok: true };
  });

  app.delete('/api/auth/me', { preHandler: requireAuth }, async (req, reply) => {
    const { password } = req.body || {};
    if (!password) return reply.code(400).send({ error: 'mot de passe requis pour confirmer la suppression' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.id === req.user.id);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    const ok = await verifyPassword(password, user.passwordHash || user.password_hash);
    if (!ok) return reply.code(401).send({ error: 'mot de passe invalide' });
    const userId = req.user.id;
    try {
      const { rows: owned } = await pool.query(`SELECT id FROM ligues WHERE owner_id=$1`, [userId]);
      for (const lig of owned) {
        const { rows: members } = await pool.query(`SELECT user_id FROM ligue_members WHERE ligue_id=$1 AND user_id != $2 ORDER BY joined_at ASC LIMIT 1`, [lig.id, userId]);
        if (members[0]) {
          await pool.query(`UPDATE ligues SET owner_id=$1 WHERE id=$2`, [members[0].user_id, lig.id]);
          await pool.query(`UPDATE ligue_members SET role='owner' WHERE ligue_id=$1 AND user_id=$2`, [lig.id, members[0].user_id]);
        } else {
          await pool.query(`DELETE FROM ligues WHERE id=$1`, [lig.id]);
        }
      }
      await pool.query(`DELETE FROM ligue_members WHERE user_id=$1`, [userId]);
      try { await pool.query(`DELETE FROM players WHERE pseudo=$1`, [user.pseudo]); } catch {}
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    } catch (e) {
      try { await db.delete(target).where(eq(target.id, userId)); } catch {}
    }
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });
}
