import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/db/schema.js';
import { createApp } from '../../src/app.js';

const getTestDatabaseUrl = () => {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  // si on est dans docker, db est joignable via host "db"
  // on teste si on peut résoudre db, sinon localhost
  const host = process.env.PG_HOST || (process.env.CI ? 'db' : 'localhost');
  // tente localhost par défaut pour run host, db pour CI/docker
  // on retourne une URL qui marche dans les deux cas en essayant
  return process.env.DATABASE_URL?.includes('babyfoot_test')
    ? process.env.DATABASE_URL
    : `postgres://babyfoot:babyfoot@${host}:5432/babyfoot_test`;
};

export const createTestApp = async () => {
  let url = getTestDatabaseUrl();

  const tryPool = async (connectionString) => {
    const pool = new pg.Pool({ connectionString });
    await pool.query('SELECT 1');
    return pool;
  };

  const ensureDbExists = async (targetUrl) => {
    // essaye de se connecter, si DB n'existe pas on la crée via DB postgres
    try {
      return await tryPool(targetUrl);
    } catch (e) {
      if (!e.message.includes('does not exist') && !e.message.includes('3D000')) throw e;
      // tente de créer la DB en se connectant à postgres
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
    // fallback autre host (localhost <-> db)
    const altHost = url.includes('@localhost:') ? 'db' : 'localhost';
    const altUrl = url.replace(/@[^:]+:/, `@${altHost}:`);
    try {
      pool = await ensureDbExists(altUrl);
      url = altUrl;
    } catch (e2) {
      throw new Error(`Impossible de se connecter à la test DB (${url} / ${altUrl}): ${e.message} / ${e2.message}`);
    }
  }

  const db = drizzle(pool, { schema });

  // on crée l'app avec la vraie DB de test (on passe users + ligues)
  const { app, initDb } = createApp({ db, pool, players: schema.players, matches: schema.matches, users: schema.users, ligues: schema.ligues, ligueMembers: schema.ligueMembers });
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
