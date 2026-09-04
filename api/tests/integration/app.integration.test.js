import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';

// Mock DB simple en mémoire – respecte l'API drizzle utilisée dans app.js
const createMockDb = () => {
  const players = [];
  const matches = [];
  let nextPlayerId = 1;
  let nextMatchId = 1;

  const mockPlayersTable = { _name: 'players' };
  const mockMatchesTable = { _name: 'matches' };

  const db = {
    select: () => ({
      from: (table) => {
        const base = table === mockPlayersTable ? players : matches;
        const fromResult = {
          orderBy: () => {
            const sorted = [...base].sort((a, b) => {
              if (table === mockPlayersTable) return new Date(a.createdAt) - new Date(b.createdAt);
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
            // pour chain .orderBy().limit(50) (matches)
            sorted.limit = (n) => sorted.slice(0, n);
            return sorted;
          },
          // pour await db.select().from(table) (stats)
          then: (resolve) => resolve([...base]),
        };
        return fromResult;
      },
    }),
  };

  db.insert = (table) => ({
    values: (vals) => ({
      returning: async () => {
        if (table === mockPlayersTable) {
          const row = { id: nextPlayerId++, createdAt: new Date().toISOString(), ...vals };
          // check unique pseudo
          if (players.some(p=>p.pseudo===row.pseudo)) {
            const e = new Error('duplicate'); e.code='23505'; throw e;
          }
          players.push(row);
          return [row];
        }
        if (table === mockMatchesTable) {
          const row = { id: nextMatchId++, createdAt: new Date().toISOString(), ...vals };
          // map teamBleue etc. pour cohérence avec schema
          // on garde les clés telles quelles, normalizeMatch s'en chargera
          matches.push(row);
          return [row];
        }
        return [];
      }
    })
  });

  db.update = (table) => ({
    set: (data) => ({
      where: () => ({
        returning: async () => {
          if (table === mockPlayersTable) {
            // eq est ignoré, on retourne premier match pour simplifier → on cherche par id si data contient
            // Pour test d'intégration, on va juste mettre à jour le premier joueur
            if (players.length===0) return [];
            Object.assign(players[0], data);
            return [players[0]];
          }
          return [];
        }
      })
    })
  });

  const pool = { query: async () => ({ rows: [] }) };

  return { db, pool, playersTable: mockPlayersTable, matchesTable: mockMatchesTable, _players: players, _matches: matches };
};

describe('API intégration (mock DB) - 3 types: intégration', () => {
  let app;
  let mock;

  beforeEach(async () => {
    mock = createMockDb();
    const { app: fastify } = createApp({ db: mock.db, pool: mock.pool, players: mock.playersTable, matches: mock.matchesTable });
    app = fastify;
    await app.ready();
  });

  it('health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('POST /api/players + GET + 409 doublon', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bob', poste: 'Attaque', niveau: 'Débutant' } });
    expect(r1.statusCode).toBe(201);
    const r2 = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bob', poste: 'Défense', niveau: 'Confirmé' } });
    expect(r2.statusCode).toBe(409);
    const r3 = await app.inject({ method: 'GET', url: '/api/players' });
    expect(JSON.parse(r3.body)).toHaveLength(1);
  });

  it('POST /api/players 400 si champs manquants', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'a' } });
    expect(r.statusCode).toBe(400);
  });

  it('POST /api/matches 1v1 et 2v2 + validation', async () => {
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'p1', poste: 'Attaque', niveau: 'Débutant' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'p2', poste: 'Défense', niveau: 'Débutant' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'p3', poste: 'Les 2', niveau: 'Confirmé' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'p4', poste: 'Attaque', niveau: 'Intermédiaire' } });

    const m1 = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'p1' }], team_rouge: [{ pseudo: 'p2' }], score_bleue: 10, score_rouge: 7 } });
    expect(m1.statusCode).toBe(201);
    expect(JSON.parse(m1.body).team_bleue).toEqual([{ pseudo: 'p1' }]);

    const bad = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'p1' }, { pseudo: 'p2' }], team_rouge: [{ pseudo: 'p3' }], score_bleue: 0, score_rouge: 0 } });
    expect(bad.statusCode).toBe(400);

    const m2 = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '2v2', team_bleue: [{ pseudo: 'p1' }, { pseudo: 'p2' }], team_rouge: [{ pseudo: 'p3' }, { pseudo: 'p4' }], score_bleue: 10, score_rouge: 10 } });
    expect(m2.statusCode).toBe(201);
  });

  it('GET /api/stats calcule classement', async () => {
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'alice', poste: 'Attaque', niveau: 'Confirmé' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bob', poste: 'Défense', niveau: 'Débutant' } });
    await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'alice' }], team_rouge: [{ pseudo: 'bob' }], score_bleue: 10, score_rouge: 5 } });
    const r = await app.inject({ method: 'GET', url: '/api/stats' });
    const body = JSON.parse(r.body);
    expect(body.classement.find(p=>p.pseudo==='alice').victoires).toBe(1);
    expect(body.classement.find(p=>p.pseudo==='bob').defaites).toBe(1);
    expect(body.matches).toHaveLength(1);
  });
});
