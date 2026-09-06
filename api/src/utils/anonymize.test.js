import { describe, it, expect } from 'vitest';
import { ANONYMIZED_PSEUDO, anonymizeEntry, anonymizeTeam, anonymizeMatchesForUser } from './anonymize.js';

describe('anonymizeTeam', () => {
  it('remplace pseudo + id par Joueur supprimé (match par id)', () => {
    const { team, changed } = anonymizeTeam([{ id: 7, pseudo: 'alice', poste: 'Attaque' }, { id: 8, pseudo: 'bob' }], 7, 'alice');
    expect(changed).toBe(true);
    expect(team[0]).toMatchObject({ id: null, pseudo: ANONYMIZED_PSEUDO, poste: null, deleted: true });
    expect(team[1].pseudo).toBe('bob');
  });

  it('matche par pseudo insensible à la casse quand id absent', () => {
    const { team, changed } = anonymizeTeam([{ pseudo: 'Alice' }], 999, 'alice');
    expect(changed).toBe(true);
    expect(team[0].pseudo).toBe(ANONYMIZED_PSEUDO);
  });

  it('ne touche pas les autres joueurs ni les déjà-anonymisés', () => {
    const { team, changed } = anonymizeTeam([anonymizeEntry({ id: 1, pseudo: 'x' }), { id: 2, pseudo: 'bob' }], 1, 'x');
    expect(changed).toBe(false);
  });

  it('retourne unchanged si team non-tableau', () => {
    expect(anonymizeTeam(null, 1, 'x')).toEqual({ team: null, changed: false });
  });
});

describe('anonymizeMatchesForUser', () => {
  const mkPool = (rows, queries = []) => ({
    rows,
    queries,
    async query(sql, params) {
      this.queries.push({ sql, params });
      if (sql.startsWith('SELECT')) return { rows: this.rows };
      return { rows: [] };
    },
  });

  it('réécrit team_bleue/rouge + legacy team_a/b, garde scores', async () => {
    const rows = [
      { id: 1, team_bleue: [{ id: 7, pseudo: 'alice', poste: 'Attaque' }], team_rouge: [{ id: 8, pseudo: 'bob' }], team_a: null, team_b: null },
      { id: 2, team_bleue: [{ id: 8, pseudo: 'bob' }], team_rouge: [{ id: 9, pseudo: 'carol' }], team_a: null, team_b: null },
    ];
    const pool = mkPool(rows);
    const { anonymized } = await anonymizeMatchesForUser({ pool }, 7, 'alice');
    expect(anonymized).toBe(1);
    const upd = pool.queries.find((q) => q.sql.startsWith('UPDATE'));
    expect(upd.params[0]).toContain(ANONYMIZED_PSEUDO);
    expect(upd.params[1]).toContain('bob');
    expect(upd.params[2]).toBe(1);
  });

  it('ne throw jamais si pool HS', async () => {
    const pool = { query: async () => { throw new Error('down'); } };
    await expect(anonymizeMatchesForUser({ pool, db: null, matches: null }, 1, 'x')).resolves.toEqual({ anonymized: 0 });
  });
});
