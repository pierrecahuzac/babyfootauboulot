import { describe, it, expect } from 'vitest';

// E2E contre vraie API (si disponible sur localhost:33333), sinon skipped
const API = process.env.E2E_API_URL || 'http://localhost:33333';
const hasRealApi = process.env.RUN_E2E === '1';

const e2e = hasRealApi ? describe : describe.skip;

e2e('E2E API réelle', () => {
  let suffix;
  beforeEach(() => { suffix = Math.random().toString(36).slice(2,6); });

  it('flow complet: players -> match -> stats', async () => {
    const p1 = `e2e_a_${suffix}`;
    const p2 = `e2e_b_${suffix}`;
    const r1 = await fetch(`${API}/api/players`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ pseudo: p1, poste: 'Attaque', niveau: 'Débutant' }) });
    expect(r1.status).toBe(201);
    const r2 = await fetch(`${API}/api/players`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ pseudo: p2, poste: 'Défense', niveau: 'Confirmé' }) });
    expect(r2.status).toBe(201);

    const rm = await fetch(`${API}/api/matches`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ format:'1v1', team_bleue:[{pseudo:p1}], team_rouge:[{pseudo:p2}], score_bleue:10, score_rouge:7 }) });
    expect(rm.status).toBe(201);
    const body = await rm.json();
    expect(body.score_bleue).toBe(10);

    const rs = await fetch(`${API}/api/stats`);
    const stats = await rs.json();
    const pa = stats.classement.find(p=>p.pseudo===p1);
    const pb = stats.classement.find(p=>p.pseudo===p2);
    expect(pa.victoires).toBeGreaterThanOrEqual(1);
    expect(pb.defaites).toBeGreaterThanOrEqual(1);
  });

  it('health', async () => {
    const r = await fetch(`${API}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok:true });
  });
});
