import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/db/schema.js';
import { createApp } from '../../src/app.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let fs;
try { fs = require('fs'); } catch { fs = null; }

const getTestDatabaseUrl = () => {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  if (process.env.DATABASE_URL?.includes('babyfoot_test')) return process.env.DATABASE_URL;
  // tente de lire .env pour récupérer le bon password / URL
  if (fs) {
    const candidates = ['/home/thaliios/Dev/Babyfoot/.env', '.env', '../.env', '../../.env', '../../../.env'];
    // aussi via cwd
    try {
      const cwdEnv = `${process.cwd()}/.env`;
      if (!candidates.includes(cwdEnv)) candidates.unshift(cwdEnv);
      // babyfoot root .env (2 niveaux au-dessus de api/tests/helpers)
      const rootEnv = `${process.cwd()}/../.env`;
      if (!candidates.includes(rootEnv)) candidates.unshift(rootEnv);
    } catch {}
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          const m = content.match(/DATABASE_URL_TEST\s*=\s*(.+)/);
          if (m) return m[1].trim().replace(/^["']|["']$/g, '');
          const pw = content.match(/POSTGRES_PASSWORD\s*=\s*(.+)/);
          if (pw) {
            const host = process.env.PG_HOST || (process.env.CI ? 'db' : 'localhost');
            return `postgres://babyfoot:${pw[1].trim().replace(/^["']|["']$/g, '')}@${host}:5432/babyfoot_test`;
          }
        }
      } catch {}
    }
  }
  const host = process.env.PG_HOST || (process.env.CI ? 'db' : 'localhost');
  return `postgres://babyfoot:babyfoot@${host}:5432/babyfoot_test`;
};

export const createTestApp = async () => {
  let url = getTestDatabaseUrl();

  const tryPool = async (connectionString) => {
    const pool = new pg.Pool({ connectionString });
    await pool.query('SELECT 1');
    return pool;
  };

  const ensureDbExists = async (targetUrl) => {
    try {
      return await tryPool(targetUrl);
    } catch (e) {
      if (!e.message.includes('does not exist') && !e.message.includes('3D000')) throw e;
      const adminUrl = targetUrl.replace(/\/babyfoot_test$/, '/postgres');
      const adminPool = new pg.Pool({ connectionString: adminUrl });
      try {
        await adminPool.query('CREATE DATABASE babyfoot_test');
      } catch (createErr) {
        if (!createErr.message.includes('already exists')) throw createErr;
      } finally {
        await adminPool.end();
      }
      return await tryPool(targetUrl);
    }
  };

  let pool;
  try {
    pool = await ensureDbExists(url);
  } catch (e) {
    const isAuthError = e.message.includes('password authentication failed');
    // si auth failed, tente de reconstruire l'URL avec password du .env et retry
    if (isAuthError && fs) {
      try {
        for (const p of ['/home/thaliios/Dev/Babyfoot/.env', `${process.cwd()}/.env`, `${process.cwd()}/../.env`]) {
          if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            const pw = content.match(/POSTGRES_PASSWORD\s*=\s*(.+)/);
            if (pw) {
              const pwd = pw[1].trim().replace(/^["']|["']$/g, '');
              const candidates = [
                `postgres://babyfoot:${pwd}@localhost:5432/babyfoot_test`,
                `postgres://babyfoot:${pwd}@db:5432/babyfoot_test`,
              ];
              for (const cand of candidates) {
                try {
                  pool = await ensureDbExists(cand);
                  url = cand;
                  break;
                } catch {}
              }
              if (pool) break;
            }
          }
        }
      } catch {}
    }
    if (!pool) {
      const altHost = url.includes('@localhost:') ? 'db' : 'localhost';
      const altUrl = url.replace(/@[^:]+:/, `@${altHost}:`);
      try {
        pool = await ensureDbExists(altUrl);
        url = altUrl;
      } catch (e2) {
        throw new Error(`Impossible de se connecter à la test DB (${url} / ${altUrl}): ${e.message} / ${e2.message}`);
      }
    }
  }

  const db = drizzle(pool, { schema });

  const { app, initDb } = await createApp({ db, pool, players: schema.players, matches: schema.matches, users: schema.users, ligues: schema.ligues, ligueMembers: schema.ligueMembers });
  await initDb();

  const clean = async () => {
    await pool.query('TRUNCATE TABLE ligue_members RESTART IDENTITY CASCADE').catch(()=>{});
    await pool.query('TRUNCATE TABLE matches RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE players RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE ligues RESTART IDENTITY CASCADE').catch(()=>{});
  };

  const close = async () => {
    await pool.end();
  };

  return { app, db, pool, clean, close, url };
};
