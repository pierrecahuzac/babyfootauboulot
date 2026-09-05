import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import crypto from 'crypto';
import authRoutes from './routes/auth.js';
import liguesRoutes from './routes/ligues.js';
import playersRoutes from './routes/players.js';
import matchesRoutes from './routes/matches.js';
import adminRoutes from './routes/admin.js';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'ligue';
const genInvite = () => crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
const genSlug = (name) => `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;

export const createApp = async ({ db, pool, players, matches, users, ligues, ligueMembers }) => {
  const app = Fastify({ logger: false, trustProxy: 1 });

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
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
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
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS poste TEXT CHECK (poste IN ('Attaque','Défense','Les 2'))`).catch(()=>{});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS niveau TEXT CHECK (niveau IN ('Débutant','Intermédiaire','Confirmé'))`).catch(()=>{});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INT DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin','user'))`);
    try {
      const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
      for (const em of adminEmails) {
        await pool.query(`UPDATE users SET role='admin' WHERE LOWER(email)=$1`, [em]);
      }
    } catch {}
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
    const hasLigue = await pool.query(`SELECT id FROM ligues LIMIT 1`).then(r=>r.rows[0]).catch(()=>null);
    if (!hasLigue) {
      try {
        const owner = await pool.query(`SELECT id FROM users LIMIT 1`).then(r=>r.rows[0]).catch(()=>null);
        const ownerId = owner?.id || null;
        const invite = genInvite();
        const slug = genSlug('boulot');
        const { rows } = await pool.query(`INSERT INTO ligues (name, slug, description, owner_id, invite_code) VALUES ($1,$2,$3,$4,$5) RETURNING id`, ['Boulot', slug, 'Ligue par défaut', ownerId, invite]);
        const ligueId = rows[0]?.id;
        if (ligueId) {
          await pool.query(`UPDATE matches SET ligue_id = $1 WHERE ligue_id IS NULL`, [ligueId]);
          if (ownerId) await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, [ligueId, ownerId]);
        }
      } catch {}
    }
  };

  const corsOriginsForCsp = (process.env.CORS_ORIGIN || 'https://babyfoot-app.vercel.app,https://babyfoot-landing.vercel.app').split(',').map(s=>s.trim()).filter(Boolean);
  app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...corsOriginsForCsp],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  });
  app.register(cookie);
  const corsOrigins = (process.env.CORS_ORIGIN || 'https://babyfoot-app.vercel.app,https://babyfoot-landing.vercel.app,http://localhost:55174,http://localhost:55175').split(',').map(s=>s.trim()).filter(Boolean);
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      // dev: autorise réseau local (vite 0.0.0.0) — localhost + LAN 192.168/10./172.16.
      if (process.env.NODE_ENV !== 'production') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || /^http:\/\/192\.168\.\d+\.\d+:\d+/.test(origin) || /^http:\/\/10\.\d+\.\d+\.\d+:\d+/.test(origin) || /^http:\/\/172\.1[6-9]\.\d+\.\d+\.\d+:\d+/.test(origin) || /^http:\/\/172\.2\d\.\d+\.\d+\.\d+:\d+/.test(origin) || /^http:\/\/172\.3[0-1]\.\d+\.\d+\.\d+:\d+/.test(origin)) return cb(null, true);
      }
      return cb(new Error('CORS bloqué'), false);
    },
    credentials: true,
    methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Ligue-Id','X-Requested-With'],
  });

  await authRoutes(app, { db, pool, users, players });
  await liguesRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers });
  await playersRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers });
  await matchesRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers });
  await adminRoutes(app, { db, pool, players, matches, users, ligues, ligueMembers });

  app.get('/health', async () => ({ ok: true }));

  return { app, initDb };
};
