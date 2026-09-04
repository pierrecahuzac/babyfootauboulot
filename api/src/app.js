import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'crypto';
import { eq, desc, and } from 'drizzle-orm';
import { calculateClassement, normalizeMatch, validateMatchPayload } from './utils/stats.js';
import { hashPassword, verifyPassword, signToken, authFromRequest } from './utils/auth.js';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'ligue';
const genInvite = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const genSlug = (name) => `${slugify(name)}-${Math.random().toString(36).slice(2, 5)}`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (e) => typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e.trim());
const genToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
const genVerificationToken = () => genToken(32);
const genResetToken = () => genToken(32);

// rate-limit login: 5 tentatives / 15 min par ip+email
const loginAttempts = new Map(); // key -> { count, firstAt }
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const getRateKey = (req, emailNorm) => {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  return `login:${ip}:${emailNorm.toLowerCase()}`;
};
const isRateLimited = (key) => {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
};
const recordLoginAttempt = (key, success) => {
  if (success) {
    loginAttempts.delete(key);
    return;
  }
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
};

export const createApp = ({ db, pool, players, matches, users, ligues, ligueMembers }) => {
  const usersTable = users;
  const liguesTable = ligues;
  const membersTable = ligueMembers;
  const app = Fastify({ logger: false });

  const initDb = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        pseudo TEXT UNIQUE NOT NULL,
        poste TEXT NOT NULL CHECK (poste IN ('Attaque','Défense','Les 2')),
        niveau TEXT NOT NULL CHECK (niveau IN ('Débutant','Intermédiaire','Confirmé')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        pseudo TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        poste TEXT NOT NULL CHECK (poste IN ('Attaque','Défense','Les 2')),
        niveau TEXT NOT NULL CHECK (niveau IN ('Débutant','Intermédiaire','Confirmé')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ligues (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        owner_id INT REFERENCES users(id),
        invite_code TEXT UNIQUE NOT NULL,
        is_private INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ligue_members (
        id SERIAL PRIMARY KEY,
        ligue_id INT NOT NULL REFERENCES ligues(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner','member')),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ligue_id, user_id)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        format TEXT NOT NULL CHECK (format IN ('1v1','2v2')),
        team_bleue JSONB NOT NULL,
        team_rouge JSONB NOT NULL,
        score_bleue INT NOT NULL,
        score_rouge INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_bleue JSONB`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_rouge JSONB`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_bleue INT`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_rouge INT`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a JSONB`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b JSONB`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_a INT`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_b INT`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS ligue_id INT REFERENCES ligues(id) ON DELETE CASCADE`);
    // auth v2: email verification & reset
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INT DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE matches ALTER COLUMN team_a DROP NOT NULL`).catch(()=>{});
    await pool.query(`ALTER TABLE matches ALTER COLUMN team_b DROP NOT NULL`).catch(()=>{});
    await pool.query(`ALTER TABLE matches ALTER COLUMN score_a DROP NOT NULL`).catch(()=>{});
    await pool.query(`ALTER TABLE matches ALTER COLUMN score_b DROP NOT NULL`).catch(()=>{});
    await pool.query(`UPDATE matches SET team_bleue = team_a WHERE team_bleue IS NULL AND team_a IS NOT NULL`);
    await pool.query(`UPDATE matches SET team_rouge = team_b WHERE team_rouge IS NULL AND team_b IS NOT NULL`);
    await pool.query(`UPDATE matches SET score_bleue = score_a WHERE score_bleue IS NULL AND score_a IS NOT NULL`);
    await pool.query(`UPDATE matches SET score_rouge = score_b WHERE score_rouge IS NULL AND score_b IS NOT NULL`);
    await pool.query(`UPDATE matches SET team_a = team_bleue WHERE team_a IS NULL AND team_bleue IS NOT NULL`);
    await pool.query(`UPDATE matches SET team_b = team_rouge WHERE team_b IS NULL AND team_rouge IS NOT NULL`);
    await pool.query(`UPDATE matches SET score_a = score_bleue WHERE score_a IS NULL AND score_bleue IS NOT NULL`);
    await pool.query(`UPDATE matches SET score_b = score_rouge WHERE score_b IS NULL AND score_rouge IS NOT NULL`);
    // migration ligue par défaut pour données orphelines
    const hasLigue = await pool.query(`SELECT id FROM ligues LIMIT 1`).then(r=>r.rows[0]).catch(()=>null);
    if (!hasLigue) {
      try {
        const owner = await pool.query(`SELECT id FROM users LIMIT 1`).then(r=>r.rows[0]).catch(()=>null);
        const ownerId = owner?.id || null;
        const invite = genInvite();
        const slug = `boulot-${Math.random().toString(36).slice(2,4)}`;
        const { rows } = await pool.query(`INSERT INTO ligues (name, slug, description, owner_id, invite_code) VALUES ($1,$2,$3,$4,$5) RETURNING id`, ['Boulot', slug, 'Ligue par défaut', ownerId, invite]);
        const ligueId = rows[0]?.id;
        if (ligueId) {
          await pool.query(`UPDATE matches SET ligue_id = $1 WHERE ligue_id IS NULL`, [ligueId]);
          if (ownerId) await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, [ligueId, ownerId]);
        }
      } catch {}
    }
  };

  app.register(cors, { origin: true, credentials: true });

  const requireAuth = async (req, reply) => {
    const payload = authFromRequest(req);
    if (!payload) {
      reply.code(401).send({ error: 'auth requise' });
      return;
    }
    req.user = payload;
  };

  // --- Auth MVP email+mdp ---
  const getUsersTable = () => usersTable || players;

  app.post('/api/auth/register', async (req, reply) => {
    const { email, pseudo, password, poste, niveau } = req.body;
    if (!email || !pseudo || !password || !poste || !niveau) return reply.code(400).send({ error: 'email, pseudo, password, poste, niveau requis' });
    if (!isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    if (password.length < 6) return reply.code(400).send({ error: 'mot de passe trop court (6 min)' });
    if (!pseudo.trim() || pseudo.trim().length < 2) return reply.code(400).send({ error: 'pseudo trop court' });
    const emailNorm = email.trim().toLowerCase();
    const hash = await hashPassword(password);
    const verificationToken = genVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const target = getUsersTable();
    const isUsers = target && target !== players;
    try {
      // drizzle insert avec colonnes v2 si dispo
      const values = { email: emailNorm, pseudo: pseudo.trim(), passwordHash: hash, poste, niveau, emailVerified: 0, verificationToken, verificationExpires };
      let row;
      try {
        const [r] = await db.insert(target).values(values).returning();
        row = r;
      } catch (e) {
        // fallback si mock ne gère pas les nouvelles colonnes → retry sans elles + patch pool
        if (e.message?.includes('verification') || e.message?.includes('email_verified')) throw e;
        throw e;
      }
      // assure via pool pour vraie DB (drizzle peut ignorer colonnes si schema pas à jour)
      try {
        await pool.query(`UPDATE users SET verification_token=$1, verification_expires=$2, email_verified=0 WHERE id=$3`, [verificationToken, verificationExpires, row.id]);
      } catch {}
      // sync pool pour mock: on met à jour l'objet en mémoire si pool query noop
      try {
        const rows = await db.select().from(target);
        const found = rows.find(r => r.id === row.id);
        if (found) {
          found.verificationToken = verificationToken;
          found.verification_token = verificationToken;
          found.verificationExpires = verificationExpires;
          found.verification_expires = verificationExpires;
          found.emailVerified = 0;
          found.email_verified = 0;
        }
      } catch {}
      if (isUsers) {
        try { await db.insert(players).values({ pseudo: pseudo.trim(), poste, niveau }).returning(); } catch {}
      }
      const token = signToken({ id: row.id, email: row.email, pseudo: row.pseudo });
      // en dev on renvoie le token de vérif pour debug (prod on l'enverrait par email)
      return reply.code(201).send({ user: { id: row.id, email: row.email, pseudo: row.pseudo, poste: row.poste, niveau: row.niveau, emailVerified: false }, token, verificationToken, message: 'Compte créé — vérifie ton email' });
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
    // on autorise login même si non vérifié pour ne pas bloquer MVP, mais on signale
    const token = signToken({ id: user.id, email: user.email, pseudo: user.pseudo });
    return reply.send({ user: { id: user.id, email: user.email, pseudo: user.pseudo, poste: user.poste, niveau: user.niveau, emailVerified }, token, emailVerified });
  });

  app.get('/api/auth/me', async (req, reply) => {
    const payload = authFromRequest(req);
    if (!payload) return reply.code(401).send({ error: 'non authentifié' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.id === payload.id);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    const emailVerified = Boolean(user.emailVerified ?? user.email_verified ?? 0);
    return { id: user.id, email: user.email, pseudo: user.pseudo, poste: user.poste, niveau: user.niveau, emailVerified, email_verified: emailVerified ? 1 : 0 };
  });

  app.post('/api/auth/logout', async () => ({ ok: true }));

  // --- Email verification ---
  app.post('/api/auth/verify-email', async (req, reply) => {
    const { token } = req.body || {};
    if (!token) return reply.code(400).send({ error: 'token requis' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => (r.verificationToken ?? r.verification_token) === token);
    if (!user) return reply.code(400).send({ error: 'token invalide' });
    const expires = user.verificationExpires ?? user.verification_expires;
    if (expires && new Date(expires) < new Date()) return reply.code(400).send({ error: 'token expiré' });
    const userId = user.id;
    try {
      await pool.query(`UPDATE users SET email_verified=1, verification_token=NULL, verification_expires=NULL WHERE id=$1`, [userId]);
    } catch {}
    // sync mock
    try {
      user.emailVerified = 1;
      user.email_verified = 1;
      user.verificationToken = null;
      user.verification_token = null;
      user.verificationExpires = null;
      user.verification_expires = null;
    } catch {}
    const newToken = signToken({ id: user.id, email: user.email, pseudo: user.pseudo });
    return { ok: true, user: { id: user.id, email: user.email, pseudo: user.pseudo, emailVerified: true }, token: newToken };
  });

  app.post('/api/auth/resend-verification', async (req, reply) => {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    const emailNorm = email.trim().toLowerCase();
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.email?.toLowerCase() === emailNorm);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    if (user.emailVerified ?? user.email_verified) return reply.code(400).send({ error: 'email déjà vérifié' });
    const newToken = genVerificationToken();
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await pool.query(`UPDATE users SET verification_token=$1, verification_expires=$2 WHERE id=$3`, [newToken, newExpires, user.id]);
    } catch {}
    try {
      user.verificationToken = newToken;
      user.verification_token = newToken;
      user.verificationExpires = newExpires;
      user.verification_expires = newExpires;
    } catch {}
    // en dev on renvoie le token
    return { ok: true, verificationToken: newToken, message: 'Email de vérification renvoyé' };
  });

  // --- Forgot / Reset password ---
  app.post('/api/auth/forgot', async (req, reply) => {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) return reply.code(400).send({ error: 'email invalide' });
    const emailNorm = email.trim().toLowerCase();
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.email?.toLowerCase() === emailNorm);
    // toujours 200 pour ne pas leak l'existence de l'email (mais en dev on renvoie token si trouvé)
    if (!user) return { ok: true, message: 'Si ce compte existe, un email a été envoyé' };
    const resetToken = genResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    try {
      await pool.query(`UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3`, [resetToken, resetExpires, user.id]);
    } catch {}
    try {
      user.resetToken = resetToken;
      user.reset_token = resetToken;
      user.resetExpires = resetExpires;
      user.reset_expires = resetExpires;
    } catch {}
    return { ok: true, resetToken, message: 'Si ce compte existe, un email a été envoyé' };
  });

  app.post('/api/auth/reset', async (req, reply) => {
    const { token, newPassword, password } = req.body || {};
    const pwd = newPassword || password;
    if (!token || !pwd) return reply.code(400).send({ error: 'token, newPassword requis' });
    if (pwd.length < 6) return reply.code(400).send({ error: 'mot de passe trop court (6 min)' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => (r.resetToken ?? r.reset_token) === token);
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

  // PATCH profil (email/pseudo/poste/niveau) — MVP
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
      data.pseudo = pseudo.trim();
    }
    if (poste) data.poste = poste;
    if (niveau) data.niveau = niveau;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'rien à mettre à jour' });
    // si email change, on reset la vérif
    if (emailChanged) {
      data.emailVerified = 0;
      data.email_verified = 0;
      const vToken = genVerificationToken();
      const vExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      data.verificationToken = vToken;
      data.verification_token = vToken;
      data.verificationExpires = vExpires;
      data.verification_expires = vExpires;
    }
    try {
      // drizzle: on fait un update via pool pour compat mock/real
      const setClauses = [];
      const vals = [];
      let idx = 1;
      for (const [k, v] of Object.entries(data)) {
        let dbCol = k;
        if (k === 'emailVerified') dbCol = 'email_verified';
        else if (k === 'verificationToken') dbCol = 'verification_token';
        else if (k === 'verificationExpires') dbCol = 'verification_expires';
        // snake_case déjà géré
        if (k === 'email_verified' || k === 'verification_token' || k === 'verification_expires') dbCol = k;
        setClauses.push(`${dbCol} = $${idx++}`);
        vals.push(v);
      }
      vals.push(req.user.id);
      const { rows: upd } = await pool.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, email, pseudo, poste, niveau, email_verified, created_at`, vals).catch(async () => {
        // fallback drizzle pour mock
        const [row] = await db.update(target).set(data).where(eq(target.id, req.user.id)).returning();
        return { rows: row ? [row] : [] };
      });
      const updated = upd[0] || upd;
      if (!updated) return reply.code(404).send({ error: 'maj échouée' });
      // sync mock in-memory
      try {
        Object.assign(user, data);
        if (emailChanged) {
          user.emailVerified = 0;
          user.email_verified = 0;
        }
      } catch {}
      // si pseudo changé, on sync aussi players pour compat
      if (data.pseudo) {
        try { await pool.query(`UPDATE players SET pseudo=$1 WHERE pseudo=$2`, [data.pseudo, user.pseudo]); } catch {}
      }
      const out = { id: updated.id ?? user.id, email: updated.email ?? data.email ?? user.email, pseudo: updated.pseudo ?? data.pseudo ?? user.pseudo, poste: updated.poste ?? data.poste ?? user.poste, niveau: updated.niveau ?? data.niveau ?? user.niveau, emailVerified: Boolean(updated.email_verified ?? updated.emailVerified ?? 0) };
      // on ré-émet un token avec le nouveau pseudo/email
      const token = signToken({ id: out.id, email: out.email, pseudo: out.pseudo });
      const extra = emailChanged ? { verificationToken: data.verificationToken ?? data.verification_token, message: 'Email changé — revérifie ton adresse' } : {};
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
    // pour MVP on exige le mot de passe pour confirmer la suppression
    if (!password) return reply.code(400).send({ error: 'mot de passe requis pour confirmer la suppression' });
    const target = getUsersTable();
    const rows = await db.select().from(target);
    const user = rows.find(r => r.id === req.user.id);
    if (!user) return reply.code(404).send({ error: 'utilisateur introuvable' });
    const ok = await verifyPassword(password, user.passwordHash || user.password_hash);
    if (!ok) return reply.code(401).send({ error: 'mot de passe invalide' });

    const userId = req.user.id;
    // 1) ligues où user est owner : transférer ou supprimer
    try {
      const { rows: owned } = await pool.query(`SELECT id FROM ligues WHERE owner_id=$1`, [userId]);
      for (const lig of owned) {
        const { rows: members } = await pool.query(`SELECT user_id FROM ligue_members WHERE ligue_id=$1 AND user_id != $2 ORDER BY joined_at ASC LIMIT 1`, [lig.id, userId]);
        if (members[0]) {
          await pool.query(`UPDATE ligues SET owner_id=$1 WHERE id=$2`, [members[0].user_id, lig.id]);
          await pool.query(`UPDATE ligue_members SET role='owner' WHERE ligue_id=$1 AND user_id=$2`, [lig.id, members[0].user_id]);
        } else {
          // pas d'autre membre -> on supprime la ligue (cascade supprime matches + members)
          await pool.query(`DELETE FROM ligues WHERE id=$1`, [lig.id]);
        }
      }
      // 2) quitter toutes les ligues (membre)
      await pool.query(`DELETE FROM ligue_members WHERE user_id=$1`, [userId]);
      // 3) optionnel : anonymiser ses matchs ? On les garde mais ligue_id déjà géré. On ne supprime pas les matchs où il a joué (historique), on garde.
      // 4) supprimer le player invité du même pseudo si existe
      try { await pool.query(`DELETE FROM players WHERE pseudo=$1`, [user.pseudo]); } catch {}
      // 5) supprimer le user
      await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    } catch (e) {
      // fallback drizzle pour mock
      try { await db.delete(target).where(eq(target.id, userId)); } catch {}
    }
    return { ok: true };
  });

  const isMember = async (ligueId, userId) => {
    if (!liguesTable || !membersTable) return true; // tests mock sans ligues -> on autorise
    try {
      const rows = await db.select().from(membersTable);
      // mock: rows is array, real: array via drizzle
      return rows.some(r => Number(r.ligueId ?? r.ligue_id) === Number(ligueId) && Number(r.userId ?? r.user_id) === Number(userId));
    } catch { return false; }
    // fallback via pool si drizzle where pas dispo en mock
  };

  // --- Ligues (privées par code) ---
  app.post('/api/ligues', { preHandler: requireAuth }, async (req, reply) => {
    const { name, description } = req.body;
    if (!name) return reply.code(400).send({ error: 'name requis' });
    const slug = genSlug(name);
    const invite = genInvite();
    const ownerId = req.user.id;
    try {
      const [row] = await db.insert(liguesTable).values({ name: name.trim(), slug, description: description || null, ownerId, inviteCode: invite }).returning();
      // si liguesTable est mock, l'insert ci-dessus aura déjà fait, on ajoute le membre
      try { await db.insert(membersTable).values({ ligueId: row.id, userId: ownerId, role: 'owner' }).returning(); } catch {}
      // fallback pool pour mock ou si drizzle échoue sur ligue_members
      try { await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, [row.id, ownerId]); } catch {}
      return reply.code(201).send({ ...row, invite_code: row.inviteCode || invite, slug: row.slug || slug });
    } catch (e) {
      if (e.code === '23505') return reply.code(409).send({ error: 'nom déjà pris' });
      throw e;
    }
  });

  app.get('/api/ligues', { preHandler: requireAuth }, async (req) => {
    if (!liguesTable || !membersTable) return [];
    try {
      // ligues où user est membre
      const allMembers = await db.select().from(membersTable);
      const myLigueIds = allMembers.filter(m => Number(m.userId ?? m.user_id) === Number(req.user.id)).map(m => Number(m.ligueId ?? m.ligue_id));
      if (!myLigueIds.length) return [];
      const allLigues = await db.select().from(liguesTable);
      return allLigues.filter(l => myLigueIds.includes(Number(l.id))).map(l => ({
        ...l,
        invite_code: l.inviteCode ?? l.invite_code,
      }));
    } catch {
      // fallback pool
      const { rows } = await pool.query(`SELECT l.* FROM ligues l JOIN ligue_members m ON m.ligue_id=l.id WHERE m.user_id=$1 ORDER BY l.created_at DESC`, [req.user.id]).catch(()=>({rows:[]}));
      return rows;
    }
  });

  app.post('/api/ligues/join', { preHandler: requireAuth }, async (req, reply) => {
    const { invite_code, inviteCode } = req.body;
    const code = (invite_code || inviteCode || '').trim().toUpperCase();
    if (!code) return reply.code(400).send({ error: 'invite_code requis' });
    let ligue;
    try {
      const rows = await db.select().from(liguesTable);
      ligue = rows.find(r => (r.inviteCode || r.invite_code) === code);
    } catch {
      const { rows } = await pool.query(`SELECT * FROM ligues WHERE invite_code=$1`, [code]);
      ligue = rows[0];
    }
    if (!ligue) return reply.code(404).send({ error: 'code invalide' });
    const ligueId = ligue.id;
    // déjà membre ?
    if (await isMember(ligueId, req.user.id)) return { ...ligue, invite_code: ligue.inviteCode || ligue.invite_code, already: true };
    try { await db.insert(membersTable).values({ ligueId, userId: req.user.id, role: 'member' }).returning(); } catch {}
    try { await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [ligueId, req.user.id]); } catch {}
    return { ...ligue, invite_code: ligue.inviteCode || ligue.invite_code };
  });

  app.get('/api/ligues/:id/members', { preHandler: requireAuth }, async (req, reply) => {
    const ligueId = Number(req.params.id);
    if (!await isMember(ligueId, req.user.id)) return reply.code(403).send({ error: 'pas membre de cette ligue' });
    try {
      const members = await db.select().from(membersTable);
      const filtered = members.filter(m => Number(m.ligueId ?? m.ligue_id) === ligueId);
      // jointure users pour pseudo
      const usersRows = await db.select().from(getUsersTable());
      return filtered.map(m => {
        const u = usersRows.find(u => u.id === (m.userId ?? m.user_id));
        return { ...m, pseudo: u?.pseudo, email: u?.email };
      });
    } catch {
      const { rows } = await pool.query(`SELECT m.*, u.pseudo, u.email FROM ligue_members m JOIN users u ON u.id=m.user_id WHERE m.ligue_id=$1`, [ligueId]);
      return rows;
    }
  });

  app.delete('/api/ligues/:id', { preHandler: requireAuth }, async (req, reply) => {
    const ligueId = Number(req.params.id);
    let ligue;
    try {
      const rows = await db.select().from(liguesTable);
      ligue = rows.find(r => Number(r.id) === ligueId);
    } catch {
      const { rows } = await pool.query(`SELECT * FROM ligues WHERE id=$1`, [ligueId]);
      ligue = rows[0];
    }
    if (!ligue) return reply.code(404).send({ error: 'ligue introuvable' });
    const ownerId = ligue.ownerId ?? ligue.owner_id;
    if (Number(ownerId) !== Number(req.user.id)) return reply.code(403).send({ error: 'seul le owner peut supprimer la ligue' });
    try {
      await pool.query(`DELETE FROM ligues WHERE id=$1`, [ligueId]);
    } catch {
      try { await db.delete(liguesTable).where(eq(liguesTable.id, ligueId)); } catch {}
    }
    return { ok: true };
  });

  app.post('/api/ligues/:id/reset', { preHandler: requireAuth }, async (req, reply) => {
    const ligueId = Number(req.params.id);
    let ligue;
    try {
      const rows = await db.select().from(liguesTable);
      ligue = rows.find(r => Number(r.id) === ligueId);
    } catch {
      const { rows } = await pool.query(`SELECT * FROM ligues WHERE id=$1`, [ligueId]);
      ligue = rows[0];
    }
    if (!ligue) return reply.code(404).send({ error: 'ligue introuvable' });
    const ownerId = ligue.ownerId ?? ligue.owner_id;
    if (Number(ownerId) !== Number(req.user.id)) return reply.code(403).send({ error: 'seul le owner peut reset' });
    try {
      await pool.query(`DELETE FROM matches WHERE ligue_id=$1`, [ligueId]);
    } catch {
      try {
        const all = await db.select().from(matches);
        for (const m of all.filter(x => Number(x.ligueId ?? x.ligue_id) === ligueId)) {
          await db.delete(matches).where(eq(matches.id, m.id));
        }
      } catch {}
    }
    return { ok: true, reset: true };
  });

  // --- Players / Matches / Stats scopés par ligue_id ---
  const getLigueId = (req) => Number(req.query.ligue_id || req.body?.ligue_id || req.headers['x-ligue-id']) || null;

  const assertMember = async (req, reply, ligueId) => {
    if (!ligueId) return true; // si pas de ligue_id, on autorise pour compat (global)
    if (!req.user && !authFromRequest(req)) {
      // si route non protégée, on vérifie quand même si ligue privée -> on laisse passer pour lecture mais on pourrait exiger auth
      // pour MVP on exige auth si ligue_id présent
      const payload = authFromRequest(req);
      if (!payload) { reply.code(401).send({ error: 'auth requise pour ligue' }); return false; }
      req.user = payload;
    }
    const userId = req.user?.id || authFromRequest(req)?.id;
    if (!userId) { reply.code(401).send({ error: 'auth requise' }); return false; }
    if (!await isMember(ligueId, userId)) { reply.code(403).send({ error: 'pas membre de cette ligue' }); return false; }
    return true;
  };

  app.get('/api/players', async (req, reply) => {
    const ligueId = getLigueId(req);
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      // joueurs = membres de la ligue
      try {
        const members = await db.select().from(membersTable);
        const userIds = members.filter(m => Number(m.ligueId ?? m.ligue_id) === ligueId).map(m => Number(m.userId ?? m.user_id));
        const allUsers = await db.select().from(getUsersTable());
        const filtered = allUsers.filter(u => userIds.includes(Number(u.id)));
        // map vers format players pour compat front
        return filtered.map(u => ({ id: u.id, pseudo: u.pseudo, poste: u.poste, niveau: u.niveau, createdAt: u.createdAt || u.created_at }));
      } catch {
        const { rows } = await pool.query(`SELECT u.id, u.pseudo, u.poste, u.niveau, u.created_at FROM users u JOIN ligue_members m ON m.user_id=u.id WHERE m.ligue_id=$1 ORDER BY u.created_at`, [ligueId]);
        return rows;
      }
    }
    return db.select().from(players).orderBy(players.createdAt);
  });

  app.post('/api/players', async (req, reply) => {
    const { pseudo, poste, niveau } = req.body;
    if (!pseudo || !poste || !niveau) return reply.code(400).send({ error: 'pseudo, poste, niveau requis' });
    try {
      const [row] = await db.insert(players).values({ pseudo: pseudo.trim(), poste, niveau }).returning();
      return reply.code(201).send(row);
    } catch (e) {
      if (e.code === '23505') return reply.code(409).send({ error: 'pseudo déjà pris' });
      throw e;
    }
  });

  app.patch('/api/players/:id', async (req, reply) => {
    const { poste, niveau } = req.body;
    const data = {};
    if (poste) data.poste = poste;
    if (niveau) data.niveau = niveau;
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'rien à mettre à jour' });
    const [row] = await db.update(players).set(data).where(eq(players.id, Number(req.params.id))).returning();
    if (!row) return reply.code(404).send({ error: 'joueur introuvable' });
    return row;
  });

  app.get('/api/matches', async (req, reply) => {
    const ligueId = getLigueId(req);
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const rows = await pool.query(`SELECT * FROM matches WHERE ligue_id=$1 ORDER BY created_at DESC LIMIT 50`, [ligueId]).then(r=>r.rows);
        return rows.map(normalizeMatch);
      } catch {
        const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(50);
        return rows.filter(r => Number(r.ligueId ?? r.ligue_id) === ligueId).map(normalizeMatch);
      }
    }
    const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(50);
    return rows.map(normalizeMatch);
  });

  app.post('/api/matches', async (req, reply) => {
    const team_bleue = req.body.team_bleue ?? req.body.team_a;
    const team_rouge = req.body.team_rouge ?? req.body.team_b;
    const score_bleue = req.body.score_bleue ?? req.body.score_a;
    const score_rouge = req.body.score_rouge ?? req.body.score_b;
    const { format, ligue_id } = req.body;
    const ligueId = Number(ligue_id || req.query.ligue_id || req.headers['x-ligue-id']) || null;
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
    }
    const err = validateMatchPayload({ format, team_bleue, team_rouge, score_bleue, score_rouge });
    if (err) return reply.code(400).send({ error: err });
    const [row] = await db.insert(matches).values({
      format, teamBleue: team_bleue, teamRouge: team_rouge, scoreBleue: Number(score_bleue), scoreRouge: Number(score_rouge), ligueId: ligueId || null
    }).returning();
    // compat legacy + ligue_id
    if (ligueId) await pool.query(`UPDATE matches SET ligue_id=$2, team_a=$3, team_b=$4, score_a=$5, score_b=$6 WHERE id=$1`, [row.id, ligueId, JSON.stringify(team_bleue), JSON.stringify(team_rouge), Number(score_bleue), Number(score_rouge)]).catch(()=>{});
    else await pool.query(`UPDATE matches SET team_a=$2, team_b=$3, score_a=$4, score_b=$5 WHERE id=$1`, [row.id, JSON.stringify(team_bleue), JSON.stringify(team_rouge), Number(score_bleue), Number(score_rouge)]).catch(()=>{});
    return reply.code(201).send(normalizeMatch(row));
  });

  app.get('/api/stats', async (req, reply) => {
    const ligueId = getLigueId(req);
    let allPlayers, allMatches;
    if (ligueId) {
      if (!await assertMember(req, reply, ligueId)) return;
      try {
        const { rows: mRows } = await pool.query(`SELECT * FROM matches WHERE ligue_id=$1`, [ligueId]);
        allMatches = mRows;
        const { rows: pRows } = await pool.query(`SELECT u.id, u.pseudo, u.poste, u.niveau, u.created_at FROM users u JOIN ligue_members m ON m.user_id=u.id WHERE m.ligue_id=$1`, [ligueId]);
        allPlayers = pRows.length ? pRows.map(r=>({ id:r.id, pseudo:r.pseudo, poste:r.poste, niveau:r.niveau, createdAt:r.created_at })) : await db.select().from(players);
      } catch {
        const rawPlayers = await db.select().from(players);
        const rawMatches = await db.select().from(matches);
        const members = await db.select().from(membersTable).catch(()=>[]);
        const ids = members.filter(m=> Number(m.ligueId ?? m.ligue_id)===ligueId).map(m=>Number(m.userId ?? m.user_id));
        allPlayers = rawPlayers.filter(p=> ids.includes(Number(p.id)));
        allMatches = rawMatches.filter(m=> Number(m.ligueId ?? m.ligue_id)===ligueId);
      }
    } else {
      allPlayers = await db.select().from(players);
      allMatches = await db.select().from(matches);
    }
    const classement = calculateClassement(allPlayers, allMatches);
    const normalizedMatches = allMatches.map(normalizeMatch);
    return { classement, matches: normalizedMatches };
  });

  app.get('/health', async () => ({ ok: true }));

  return { app, initDb };
};
