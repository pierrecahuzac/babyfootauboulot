import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import * as schema from '../../src/db/schema.js';
import { ANONYMIZED_PSEUDO } from '../../src/utils/anonymize.js';

// Mock léger en mémoire – couvre auth + matches + anonymisation.
// Pas de vraie DB, donc rapide (<500ms) et pas de flake.
const createQuickMock = () => {
  const users = [];
  const players = [];
  const matches = [];
  const ligues = [];
  const ligueMembers = [];
  let nextUserId = 1;
  let nextMatchId = 1;
  let nextLigueId = 1;

  const store = new Map([
    [schema.users, users],
    [schema.players, players],
    [schema.matches, matches],
    [schema.ligues, ligues],
    [schema.ligueMembers, ligueMembers],
  ]);

  const db = {
    select: () => ({
      from: (table) => {
        const arr = store.get(table) || [];
        // support orderBy/limit chaîné pour matches
        const base = [...arr];
        const result = {
          orderBy: () => {
            const sorted = [...arr].sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
            sorted.limit = (n) => sorted.slice(0, n);
            return sorted;
          },
          limit: (n) => base.slice(0, n),
          then: (resolve) => resolve([...arr]),
        };
        // allow await directly
        result.then = (resolve) => resolve([...arr]);
        return result;
      },
    }),
    insert: (table) => ({
      values: (vals) => ({
        returning: async () => {
          const arr = store.get(table);
          if (!arr) return [];
          if (table === schema.users) {
            if (users.some(u => u.email === vals.email)) { const e = new Error('duplicate email'); e.code = '23505'; e.detail = 'email'; throw e; }
            if (users.some(u => u.pseudo === vals.pseudo)) { const e = new Error('duplicate pseudo'); e.code = '23505'; e.detail = 'pseudo'; throw e; }
            const row = { id: nextUserId++, createdAt: new Date().toISOString(), created_at: new Date().toISOString(), ...vals };
            // drizzle camelCase -> keep both
            row.email_verified = row.emailVerified ?? row.email_verified ?? 1;
            row.password_hash = row.passwordHash ?? row.password_hash;
            users.push(row);
            return [row];
          }
          if (table === schema.matches) {
            const row = { id: nextMatchId++, createdAt: new Date().toISOString(), created_at: new Date().toISOString(), ...vals };
            // normalise clés pour pool
            row.team_bleue = vals.teamBleue ?? vals.team_bleue ?? vals.teamBleue;
            row.teamBleue = row.team_bleue;
            row.team_rouge = vals.teamRouge ?? vals.team_rouge;
            row.teamRouge = row.team_rouge;
            row.score_bleue = vals.scoreBleue ?? vals.score_bleue;
            row.scoreBleue = row.score_bleue;
            row.score_rouge = vals.scoreRouge ?? vals.score_rouge;
            row.scoreRouge = row.score_rouge;
            row.ligue_id = vals.ligueId ?? vals.ligue_id ?? null;
            row.ligueId = row.ligue_id;
            matches.push(row);
            return [row];
          }
          if (table === schema.ligues) {
            const row = { id: nextLigueId++, ...vals };
            ligues.push(row);
            return [row];
          }
          if (table === schema.players) {
            const row = { id: users.length + 100, ...vals };
            players.push(row);
            return [row];
          }
          const row = { id: Date.now(), ...vals };
          arr.push(row);
          return [row];
        },
      }),
    }),
    update: (table) => ({
      set: (data) => ({
        where: () => ({
          returning: async () => {
            const arr = store.get(table);
            if (!arr || arr.length === 0) return [];
            // naive: update first
            Object.assign(arr[0], data);
            return [arr[0]];
          },
        }),
      }),
    }),
    delete: (table) => ({
      where: () => {
        const arr = store.get(table);
        if (arr) arr.length = 0;
        return Promise.resolve();
      },
    }),
  };

  const pool = {
    query: async (sql, params = []) => {
      const s = sql.trim();
      if (s.startsWith('CREATE TABLE') || s.startsWith('ALTER TABLE') || s.startsWith('TRUNCATE') || s.startsWith('SELECT 1')) return { rows: [] };
      // initDb UPDATE users SET email_verified etc.
      if (s.includes('UPDATE users SET email_verified')) {
        users.forEach(u => { u.email_verified = 1; u.emailVerified = 1; });
        return { rows: [] };
      }
      if (s.includes('UPDATE users SET poste')) return { rows: [] };
      if (s.includes('UPDATE players SET poste')) return { rows: [] };
      if (s.includes('UPDATE users SET role')) return { rows: [] };
      if (s.includes('UPDATE matches SET ligue_id')) return { rows: [] };
      // anonymize: SELECT id, team_bleue, team_rouge, team_a, team_b FROM matches
      if (s.startsWith('SELECT id, team_bleue') || s.startsWith('SELECT id, team_bleue, team_rouge')) {
        return { rows: matches.map(m => ({
          id: m.id,
          team_bleue: m.team_bleue ?? m.teamBleue ?? m.team_a,
          team_rouge: m.team_rouge ?? m.teamRouge ?? m.team_b,
          team_a: m.team_a ?? m.team_bleue,
          team_b: m.team_b ?? m.team_rouge,
        })) };
      }
      if (s.startsWith('UPDATE matches SET team_bleue')) {
        const bleueJson = params[0], rougeJson = params[1], id = params[2];
        const m = matches.find(x => x.id === id);
        if (m) {
          try {
            const bleue = JSON.parse(bleueJson);
            const rouge = JSON.parse(rougeJson);
            m.team_bleue = bleue; m.teamBleue = bleue; m.team_a = bleue;
            m.team_rouge = rouge; m.teamRouge = rouge; m.team_b = rouge;
          } catch {}
        }
        return { rows: [] };
      }
      if (s.startsWith('SELECT id FROM ligues WHERE owner_id')) {
        const ownerId = params[0];
        return { rows: ligues.filter(l => Number(l.owner_id ?? l.ownerId) === Number(ownerId)).map(l => ({ id: l.id })) };
      }
      if (s.includes('FROM ligue_members WHERE ligue_id') && s.includes('user_id !=')) {
        const ligueId = params[0], userId = params[1];
        const cands = ligueMembers.filter(m => Number(m.ligue_id ?? m.ligueId ?? m.ligue_id) === Number(ligueId) && Number(m.user_id ?? m.userId) !== Number(userId));
        cands.sort((a,b)=> new Date(a.joined_at||a.joinedAt||0)-new Date(b.joined_at||b.joinedAt||0));
        return { rows: cands.slice(0,1).map(m=>({ user_id: m.user_id ?? m.userId })) };
      }
      if (s.startsWith('UPDATE ligues SET owner_id')) {
        const newOwner = params[0], ligId = params[1];
        const l = ligues.find(x=> x.id===ligId);
        if(l){ l.owner_id=newOwner; l.ownerId=newOwner; }
        return { rows: [] };
      }
      if (s.startsWith('UPDATE ligue_members SET role')) return { rows: [] };
      if (s.startsWith('DELETE FROM ligues WHERE id')) {
        const id=params[0]; const idx=ligues.findIndex(x=>x.id===id); if(idx!==-1) ligues.splice(idx,1); return { rows: [] };
      }
      if (s.startsWith('DELETE FROM ligue_members WHERE user_id')) {
        const uid=params[0]; for(let i=ligueMembers.length-1;i>=0;i--) if(Number(ligueMembers[i].user_id ?? ligueMembers[i].userId)===Number(uid)) ligueMembers.splice(i,1); return { rows: [] };
      }
      if (s.startsWith('DELETE FROM players WHERE pseudo')) {
        const pseudo=params[0]; for(let i=players.length-1;i>=0;i--) if(players[i].pseudo===pseudo) players.splice(i,1); return { rows: [] };
      }
      if (s.startsWith('SELECT id, pseudo FROM users WHERE id')) {
        const id=params[0]; const u=users.find(x=>x.id===id); return { rows: u?[{id:u.id,pseudo:u.pseudo}]:[] };
      }
      if (s.startsWith('DELETE FROM users WHERE id')) {
        const id=params[0]; const idx=users.findIndex(x=>x.id===id); if(idx!==-1) users.splice(idx,1); return { rows: [] };
      }
      if (s.startsWith('UPDATE users SET')) {
        // generic: last param is id
        const id=params[params.length-1];
        const u=users.find(x=>x.id===id);
        if(u && s.includes('email_verified')) { u.email_verified=1; u.emailVerified=1; }
        if(u && s.includes('password_hash')) { /* handled via drizzle fallback */ }
        return { rows: u?[u]:[] };
      }
      if (s.includes('FROM matches WHERE ligue_id')) {
        const ligId=params[0]; return { rows: matches.filter(m=> Number(m.ligue_id ?? m.ligueId)===Number(ligId)) };
      }
      if (s.includes('FROM matches')) return { rows: matches };
      if (s.includes('FROM users')) return { rows: users };
      return { rows: [] };
    },
  };

  return { db, pool, users, players, matches, ligues, ligueMembers };
};

describe('Intégration rapide (mock DB) – auth & anonymisation', () => {
  let app;
  let mock;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-quick-1234567890123456';
    mock = createQuickMock();
    const { app: fastify } = await createApp({
      db: mock.db, pool: mock.pool,
      players: schema.players, matches: schema.matches, users: schema.users, ligues: schema.ligues, ligueMembers: schema.ligueMembers,
    });
    app = fastify;
    await app.ready();
  });

  it('health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('register + login', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'a@test.com', pseudo: 'alice', password: 'secret123', poste: 'Attaque', niveau: 'Débutant' } });
    expect(reg.statusCode).toBe(201);
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@test.com', password: 'secret123' } });
    expect(login.statusCode).toBe(200);
    expect(JSON.parse(login.body).token).toBeTruthy();
  });

  it('DELETE /api/auth/me exige mot de passe (400 sans, 401 mauvais)', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'b@test.com', pseudo: 'bob', password: 'goodpass', poste: 'Défense', niveau: 'Débutant' } });
    const token = JSON.parse(reg.body).token;
    const noPwd = await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { cookie: `token=${token}` }, payload: {} });
    expect(noPwd.statusCode).toBe(400);
    expect(JSON.parse(noPwd.body).error).toMatch(/mot de passe requis/);

    const bad = await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { cookie: `token=${token}` }, payload: { password: 'wrong' } });
    expect(bad.statusCode).toBe(401);

    // bon mdp → supprimé, cookie clear + login impossible
    const ok = await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { cookie: `token=${token}` }, payload: { password: 'goodpass' } });
    expect(ok.statusCode).toBe(200);
    const relog = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'b@test.com', password: 'goodpass' } });
    expect(relog.statusCode).toBe(401);
  });

  it('suppression anonymise ses matchs (Joueur supprimé, scores conservés)', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'c@test.com', pseudo: 'cara', password: 'pass1234', poste: 'Attaque', niveau: 'Confirmé' } });
    const token = JSON.parse(reg.body).token;
    const me = JSON.parse(reg.body).user;

    // 2 matchs avec cara (1v1 + 2v2)
    const m1 = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'cara', poste: null }], team_rouge: [{ pseudo: 'bob' }], score_bleue: 10, score_rouge: 7 } });
    expect(m1.statusCode).toBe(201);
    const m2 = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '2v2', team_bleue: [{ pseudo: 'cara', poste: 'Attaque' }, { pseudo: 'x2', poste: 'Défense' }], team_rouge: [{ pseudo: 'y1' }, { pseudo: 'y2' }], score_bleue: 5, score_rouge: 10 } });
    expect(m2.statusCode).toBe(201);

    const del = await app.inject({ method: 'DELETE', url: '/api/auth/me', headers: { cookie: `token=${token}` }, payload: { password: 'pass1234' } });
    expect(del.statusCode).toBe(200);

    const list = await app.inject({ method: 'GET', url: '/api/matches' });
    const ms = JSON.parse(list.body);
    expect(ms).toHaveLength(2);
    // cara n'apparait plus nulle part
    const flat = ms.flatMap(m => [...(m.team_bleue||[]), ...(m.team_rouge||[])]);
    expect(flat.some(p=> p.pseudo==='cara')).toBe(false);
    expect(flat.some(p=> p.pseudo===ANONYMIZED_PSEUDO && p.deleted===true)).toBe(true);
    // scores intacts
    const first = ms.find(m=> m.id===JSON.parse(m1.body).id);
    expect(first.score_bleue).toBe(10);
    expect(first.score_rouge).toBe(7);
    // 1v1 : poste reste null (anonymisé), pas de FK cassée
    expect(first.team_bleue[0].id).toBeNull();
  });

  it('admin DELETE anonymise aussi', async () => {
    process.env.ADMIN_EMAILS = 'admin@test.com';
    const adminReg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'admin@test.com', pseudo: 'admin', password: 'adminpass', poste: 'Attaque', niveau: 'Débutant' } });
    const adminTok = JSON.parse(adminReg.body).token;
    const victim = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'victim@test.com', pseudo: 'victim', password: 'victimpass', poste: 'Défense', niveau: 'Débutant' } });
    const victimId = JSON.parse(victim.body).user.id;
    await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'victim' }], team_rouge: [{ pseudo: 'other' }], score_bleue: 3, score_rouge: 10 } });

    const del = await app.inject({ method: 'DELETE', url: `/api/admin/users/${victimId}`, headers: { cookie: `token=${adminTok}` } });
    expect(del.statusCode).toBe(200);

    const ms = JSON.parse((await app.inject({ method: 'GET', url: '/api/matches' })).body);
    expect(ms[0].team_bleue[0].pseudo).toBe(ANONYMIZED_PSEUDO);
    delete process.env.ADMIN_EMAILS;
  });
});
