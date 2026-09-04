import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestApp } from '../helpers/testDb.js';

describe('API intégration DB réelle (babyfoot_test)', () => {
  let app;
  let clean;
  let close;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    clean = ctx.clean;
    close = ctx.close;
    await app.ready();
  });

  beforeEach(async () => {
    await clean();
  });

  afterAll(async () => {
    await close();
  });

  it('health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('POST /api/players + GET + 409 doublon (DB réelle)', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bob_test', poste: 'Attaque', niveau: 'Débutant' } });
    expect(r1.statusCode).toBe(201);
    expect(JSON.parse(r1.body).pseudo).toBe('bob_test');

    const r2 = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bob_test', poste: 'Défense', niveau: 'Confirmé' } });
    expect(r2.statusCode).toBe(409);
    expect(JSON.parse(r2.body).error).toMatch(/déjà pris/);

    const r3 = await app.inject({ method: 'GET', url: '/api/players' });
    const body = JSON.parse(r3.body);
    expect(body).toHaveLength(1);
    expect(body[0].niveau).toBe('Débutant');
  });

  it('POST /api/players 400 si champs manquants', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'a' } });
    expect(r.statusCode).toBe(400);
  });

  it('POST /api/players 500 si niveau invalide (CHECK)', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bad', poste: 'Attaque', niveau: 'Confirmé 🔥' } });
    // le CHECK en DB lève 23514 → Fastify le remonte en 500 (pas géré comme 400)
    expect([400, 500]).toContain(r.statusCode);
  });

  it('POST /api/matches 1v1 et 2v2 + validation (DB réelle)', async () => {
    for (const p of ['p1','p2','p3','p4']) {
      await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: p, poste: 'Attaque', niveau: 'Débutant' } });
    }
    const m1 = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'p1' }], team_rouge: [{ pseudo: 'p2' }], score_bleue: 10, score_rouge: 7 } });
    expect(m1.statusCode).toBe(201);
    const b1 = JSON.parse(m1.body);
    expect(b1.team_bleue).toEqual([{ pseudo: 'p1' }]);
    expect(b1.team_a).toEqual([{ pseudo: 'p1' }]); // legacy

    const bad = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'p1' }, { pseudo: 'p2' }], team_rouge: [{ pseudo: 'p3' }], score_bleue: 0, score_rouge: 0 } });
    expect(bad.statusCode).toBe(400);

    const m2 = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '2v2', team_bleue: [{ pseudo: 'p1' }, { pseudo: 'p2' }], team_rouge: [{ pseudo: 'p3' }, { pseudo: 'p4' }], score_bleue: 10, score_rouge: 10 } });
    expect(m2.statusCode).toBe(201);

    const all = await app.inject({ method: 'GET', url: '/api/matches' });
    expect(JSON.parse(all.body)).toHaveLength(2);
  });

  it('GET /api/stats calcule classement avec vraie DB', async () => {
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'alice', poste: 'Attaque', niveau: 'Confirmé' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'bob', poste: 'Défense', niveau: 'Débutant' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'carol', poste: 'Les 2', niveau: 'Intermédiaire' } });
    await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'alice' }], team_rouge: [{ pseudo: 'bob' }], score_bleue: 10, score_rouge: 5 } });
    await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'bob' }], team_rouge: [{ pseudo: 'alice' }], score_bleue: 10, score_rouge: 8 } });
    await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '1v1', team_bleue: [{ pseudo: 'alice' }], team_rouge: [{ pseudo: 'carol' }], score_bleue: 5, score_rouge: 10 } });

    const r = await app.inject({ method: 'GET', url: '/api/stats' });
    const body = JSON.parse(r.body);
    expect(body.matches).toHaveLength(3);
    const alice = body.classement.find(p=>p.pseudo==='alice');
    const bob = body.classement.find(p=>p.pseudo==='bob');
    const carol = body.classement.find(p=>p.pseudo==='carol');
    expect(alice.victoires).toBe(1);
    expect(alice.defaites).toBe(2);
    expect(bob.victoires).toBe(1);
    expect(carol.victoires).toBe(1);
    // tri: carol 100% > bob 50% > alice 33% (tous 1 victoire)
    expect(body.classement[0].pseudo).toBe('carol');
  });

  it('randomTeams via API: 2v2 nécessite 4 joueurs distincts', async () => {
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'x1', poste: 'Attaque', niveau: 'Débutant' } });
    await app.inject({ method: 'POST', url: '/api/players', payload: { pseudo: 'x2', poste: 'Attaque', niveau: 'Débutant' } });
    const bad = await app.inject({ method: 'POST', url: '/api/matches', payload: { format: '2v2', team_bleue: [{ pseudo: 'x1' }, { pseudo: 'x2' }], team_rouge: [{ pseudo: 'x1' }, { pseudo: 'x2' }], score_bleue: 0, score_rouge: 0 } });
    // notre validation détecte doublon
    expect(bad.statusCode).toBe(400);
    expect(JSON.parse(bad.body).error).toMatch(/deux équipes/);
  });
});
