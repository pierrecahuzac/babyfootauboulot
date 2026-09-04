import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const getDatabaseUrl = () => process.env.DATABASE_URL || 'postgres://babyfoot:babyfoot@localhost:5432/babyfoot';
const tryPool = async (cs) => {
  const p = new pg.Pool({ connectionString: cs });
  await p.query('SELECT 1');
  return p;
};
const createPool = async () => {
  const url = getDatabaseUrl();
  try { return await tryPool(url); } catch (e) {
    const alt = url.includes('@localhost:') ? url.replace('@localhost:', '@db:') : url.replace('@db:', '@localhost:');
    try { return await tryPool(alt); } catch (e2) { console.error(`Connexion échouée ${url} / ${alt}`); throw e2; }
  }
};
let pool;
let db;

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'ligue';
const genInvite = () => crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
const genSlug = (name) => `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;

const prenoms = ['pierre','sarah','lucas','tom','lea','zoe','max','nina','hugo','chloe','alex','milo','jules','louis','emma','jade','theo','nathan','paul','yann','ines','luna','noah','adam','manon','camille','arthur','gabriel','sacha','maeva'];
const noms = ['dubois','martin','bernard','thomas','petit','robert','richard','durand','moreau','laurent','simon','michel','lefebvre','leroy','roux','david','blanc','garcia','chevalier','robin'];
const postes = ['Attaque','Défense','Les 2'];
const niveaux = ['Débutant','Intermédiaire','Confirmé'];
const ligueNames = ['Boulot','Boulot - Étage 1','Boulot - Étage 2','Afterwork Jeudi','Team Weekend'];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const randomDate = (daysAgo = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
};

const args = process.argv.slice(2);
const shouldClean = args.includes('--clean') || args.includes('-c');
const countUsers = 30;
const ligueCount = 5;

async function main() {
  pool = await createPool();
  db = drizzle(pool, { schema });
  const dbUrl = getDatabaseUrl();
  console.log(`→ Seed sur ${dbUrl.replace(/:([^@]+)@/, ':***@')} — ${countUsers} users, ${ligueCount} ligues`);
  if (shouldClean) {
    console.log('→ Nettoyage préalable...');
    await pool.query('TRUNCATE TABLE ligue_members RESTART IDENTITY CASCADE').catch(()=>{});
    await pool.query('TRUNCATE TABLE matches RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE players RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE ligues RESTART IDENTITY CASCADE').catch(()=>{});
  }

  // ensure tables exist (init)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      pseudo TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      poste TEXT NOT NULL CHECK (poste IN ('Attaque','Défense','Les 2')),
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
      email_verified INT DEFAULT 0,
      verification_token TEXT,
      verification_expires TIMESTAMPTZ,
      reset_token TEXT,
      reset_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin','user'))`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INT DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`);

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
      ligue_id INT REFERENCES ligues(id) ON DELETE CASCADE,
      team_a JSONB,
      team_b JSONB,
      score_a INT,
      score_b INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS ligue_id INT REFERENCES ligues(id) ON DELETE CASCADE`);

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const adminHash = await bcrypt.hash('admin1234', 10);
  const users = [];

  // admin de démo
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, pseudo, password_hash, poste, niveau, role, email_verified) VALUES ($1,$2,$3,$4,$5,'admin',1) ON CONFLICT (email) DO UPDATE SET role='admin' RETURNING id, pseudo`,
      ['admin@example.com', 'admin', adminHash, 'Les 2', 'Confirmé']
    );
    if (rows[0]) {
      users.push({ id: rows[0].id, pseudo: 'admin', poste: 'Les 2', niveau: 'Confirmé', email: 'admin@example.com', role: 'admin' });
      console.log(`  ✓ admin@example.com / admin1234 (admin système, pas joueur)`);
    }
  } catch (e) { console.error(`  ✗ admin: ${e.message}`); }

  // demo user (uniquement user, pas admin)
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, pseudo, password_hash, poste, niveau, role, email_verified) VALUES ($1,$2,$3,$4,$5,'user',1) ON CONFLICT (email) DO UPDATE SET role='user' RETURNING id, pseudo`,
      ['demo@example.com', 'demo', passwordHash, 'Attaque', 'Intermédiaire']
    );
    if (rows[0]) {
      users.push({ id: rows[0].id, pseudo: 'demo', poste: 'Attaque', niveau: 'Intermédiaire', email: 'demo@example.com', role: 'user' });
      console.log(`  ✓ demo@example.com / demo1234 (user démo)`);
      await pool.query(`INSERT INTO players (pseudo, poste, niveau) VALUES ($1,$2,$3) ON CONFLICT (pseudo) DO NOTHING`, ['demo', 'Attaque', 'Intermédiaire']);
    } else {
      const { rows: ex } = await pool.query(`SELECT id FROM users WHERE email='demo@example.com'`);
      if (ex[0]) users.push({ id: ex[0].id, pseudo: 'demo', poste: 'Attaque', niveau: 'Intermédiaire', email: 'demo@example.com', role: 'user' });
    }
  } catch (e) { console.error(`  ✗ demo: ${e.message}`); }

  console.log('→ Création users...');
  for (let i = 0; i < countUsers; i++) {
    const prenom = prenoms[i % prenoms.length];
    const nom = noms[Math.floor(Math.random() * noms.length)];
    const pseudo = `${prenom}_${nom}${i > noms.length ? i : ''}`.toLowerCase().slice(0, 20);
    if (pseudo === 'admin') continue;
    const email = `${pseudo}@example.com`;
    const poste = postes[Math.floor(Math.random() * postes.length)];
    const niveau = niveaux[Math.floor(Math.random() * niveaux.length)];
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, pseudo, password_hash, poste, niveau, role, email_verified) VALUES ($1,$2,$3,$4,$5,'user',1) ON CONFLICT (email) DO NOTHING RETURNING id, pseudo`,
        [email, pseudo, passwordHash, poste, niveau]
      );
      let userId = rows[0]?.id;
      if (!userId) {
        const { rows: existing } = await pool.query(`SELECT id, pseudo FROM users WHERE email=$1`, [email]);
        userId = existing[0]?.id;
      }
      if (userId) users.push({ id: userId, pseudo, poste, niveau, email });
      // sync players pour compat
      await pool.query(`INSERT INTO players (pseudo, poste, niveau) VALUES ($1,$2,$3) ON CONFLICT (pseudo) DO NOTHING`, [pseudo, poste, niveau]);
    } catch (e) {
      console.error(`  ✗ ${pseudo}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${users.length} users (pwd: demo1234, email_verified:1)`);

  console.log('→ Création ligues...');
  const ligues = [];
  for (let i = 0; i < ligueCount; i++) {
    const name = ligueNames[i % ligueNames.length] + (i >= ligueNames.length ? ` ${i+1}` : '');
    const slug = genSlug(name);
    const invite = genInvite();
    const owner = users[Math.floor(Math.random() * users.length)];
    try {
      const { rows } = await pool.query(
        `INSERT INTO ligues (name, slug, description, owner_id, invite_code) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [name, slug, `Ligue ${name} — démo`, owner.id, invite]
      );
      const ligueId = rows[0].id;
      ligues.push({ id: ligueId, name, invite, ownerId: owner.id });
      await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, [ligueId, owner.id]);

      // membres aléatoires 5-8 par ligue
      const shuffled = shuffle(users.filter(u => u.id !== owner.id));
      const memberCount = 5 + Math.floor(Math.random() * 4);
      for (let m = 0; m < memberCount && m < shuffled.length; m++) {
        await pool.query(`INSERT INTO ligue_members (ligue_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [ligueId, shuffled[m].id]);
      }
      console.log(`  ✓ ${name} (${invite}) owner ${owner.pseudo}`);
    } catch (e) {
      console.error(`  ✗ ligue ${name}: ${e.message}`);
    }
  }

  console.log('→ Génération matchs...');
  let totalMatches = 0;
  for (const lig of ligues) {
    const { rows: members } = await pool.query(`SELECT u.id, u.pseudo, u.poste FROM users u JOIN ligue_members m ON m.user_id=u.id WHERE m.ligue_id=$1`, [lig.id]);
    if (members.length < 2) continue;
    const matchCount = 24; // 24 par ligue → 120 total pour 5 ligues, scores serrés et larges
    for (let k = 0; k < matchCount; k++) {
      const format = Math.random() > 0.35 ? '2v2' : '1v1';
      const need = format === '1v1' ? 2 : 4;
      if (members.length < need) continue;
      const picked = shuffle(members).slice(0, need);
      let team_bleue, team_rouge;
      if (format === '1v1') {
        team_bleue = [{ id: picked[0].id, pseudo: picked[0].pseudo, poste: 'Les 2' }];
        team_rouge = [{ id: picked[1].id, pseudo: picked[1].pseudo, poste: 'Les 2' }];
      } else {
        team_bleue = [{ id: picked[0].id, pseudo: picked[0].pseudo, poste: 'Attaque' }, { id: picked[1].id, pseudo: picked[1].pseudo, poste: 'Défense' }];
        team_rouge = [{ id: picked[2].id, pseudo: picked[2].pseudo, poste: 'Attaque' }, { id: picked[3].id, pseudo: picked[3].pseudo, poste: 'Défense' }];
      }
      const score_bleue = 10;
      const score_rouge = Math.floor(Math.random() * 10); // 0-9, bleue gagne plus souvent mais pas toujours
      const wonRouge = Math.random() < 0.42;
      const sBleue = wonRouge ? score_rouge : score_bleue;
      const sRouge = wonRouge ? score_bleue : score_rouge;
      const createdAt = randomDate(30);
      await pool.query(
        `INSERT INTO matches (format, team_bleue, team_rouge, score_bleue, score_rouge, ligue_id, team_a, team_b, score_a, score_b, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [format, JSON.stringify(team_bleue), JSON.stringify(team_rouge), sBleue, sRouge, lig.id, JSON.stringify(team_bleue), JSON.stringify(team_rouge), sBleue, sRouge, createdAt]
      );
      totalMatches++;
    }
  }
  console.log(`  ✓ ${totalMatches} matchs générés`);

  const { rows: cUsers } = await pool.query(`SELECT COUNT(*) FROM users`);
  const { rows: cLigues } = await pool.query(`SELECT COUNT(*) FROM ligues`);
  const { rows: cMatches } = await pool.query(`SELECT COUNT(*) FROM matches`);
  console.log(`\n✅ Seed terminé — users: ${cUsers[0].count}, ligues: ${cLigues[0].count}, matchs: ${cMatches[0].count}`);
  console.log(`   Tous les users ont mdp: demo1234`);
  console.log(`   Ex: pierre_dubois@example.com / demo1234`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
