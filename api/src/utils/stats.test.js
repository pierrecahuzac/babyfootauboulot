import { describe, it, expect } from 'vitest';
import { calculateClassement, normalizeMatch, validateMatchPayload, shuffle, randomTeams } from './stats.js';

describe('normalizeMatch', () => {
  it('normalise team_bleue/rouge depuis teamA/team_a legacy', () => {
    const m = { teamA: [{ pseudo: 'a' }], teamB: [{ pseudo: 'b' }], scoreA: 10, scoreB: 5 };
    const n = normalizeMatch(m);
    expect(n.team_bleue).toEqual([{ pseudo: 'a' }]);
    expect(n.team_rouge).toEqual([{ pseudo: 'b' }]);
    expect(n.score_bleue).toBe(10);
    expect(n.team_a).toEqual([{ pseudo: 'a' }]);
  });

  it('priorise teamBleue sur legacy', () => {
    const m = { teamBleue: [{ pseudo: 'x' }], team_a: [{ pseudo: 'y' }], scoreBleue: 3, score_a: 9 };
    const n = normalizeMatch(m);
    expect(n.team_bleue).toEqual([{ pseudo: 'x' }]);
  });
});

describe('calculateClassement', () => {
  const players = [
    { id: 1, pseudo: 'alice' },
    { id: 2, pseudo: 'bob' },
    { id: 3, pseudo: 'carol' },
  ];

  it('calcule victoires/défaites/ratio', () => {
    const matches = [
      { team_bleue: [{ pseudo: 'alice' }], team_rouge: [{ pseudo: 'bob' }], score_bleue: 10, score_rouge: 7 },
      { team_bleue: [{ pseudo: 'bob' }], team_rouge: [{ pseudo: 'alice' }], score_bleue: 10, score_rouge: 8 },
      { team_bleue: [{ pseudo: 'alice' }], team_rouge: [{ pseudo: 'carol' }], score_bleue: 5, score_rouge: 10 },
    ];
    const c = calculateClassement(players, matches);
    const alice = c.find(p => p.pseudo === 'alice');
    const bob = c.find(p => p.pseudo === 'bob');
    const carol = c.find(p => p.pseudo === 'carol');
    expect(alice.victoires).toBe(1);
    expect(alice.defaites).toBe(2);
    expect(alice.ratio).toBe(33);
    expect(bob.victoires).toBe(1);
    expect(bob.defaites).toBe(1);
    expect(carol.victoires).toBe(1);
    expect(c[0].pseudo).toBe('carol'); // tri par victoires puis ratio (carol 100% > bob 50% > alice 33%)
  });

  it('supporte id matching et legacy fields', () => {
    const matches = [
      { teamA: [{ id: 1, pseudo: 'alice' }], teamB: [{ id: 2, pseudo: 'bob' }], scoreA: 10, scoreB: 0 },
    ];
    const c = calculateClassement(players, matches);
    expect(c.find(p => p.pseudo === 'alice').victoires).toBe(1);
  });

  it('0 match => 0 ratio', () => {
    const c = calculateClassement(players, []);
    expect(c.every(p => p.ratio === 0)).toBe(true);
  });
});

describe('validateMatchPayload', () => {
  it('requiert champs', () => {
    expect(validateMatchPayload({})).toMatch(/requis/);
  });
  it('1v1 valide', () => {
    expect(validateMatchPayload({ format: '1v1', team_bleue: [{ pseudo: 'a' }], team_rouge: [{ pseudo: 'b' }], score_bleue: 10, score_rouge: 5 })).toBeNull();
  });
  it('1v1 refuse 2 joueurs', () => {
    expect(validateMatchPayload({ format: '1v1', team_bleue: [{},{}], team_rouge: [{}], score_bleue: 0, score_rouge: 0 })).toMatch(/1 joueur/);
  });
  it('détecte doublon', () => {
    expect(validateMatchPayload({ format: '1v1', team_bleue: [{ pseudo: 'a' }], team_rouge: [{ pseudo: 'a' }], score_bleue: 0, score_rouge: 0 })).toMatch(/deux équipes/);
  });
});

describe('shuffle / randomTeams', () => {
  it('shuffle conserve éléments', () => {
    const arr = [1,2,3,4];
    const s = shuffle(arr);
    expect(s.sort()).toEqual([1,2,3,4]);
    expect(s).not.toBe(arr);
  });
  it('randomTeams 1v1', () => {
    const ps = [{ pseudo: 'a' }, { pseudo: 'b' }, { pseudo: 'c' }];
    const { team_bleue, team_rouge } = randomTeams(ps, '1v1');
    expect(team_bleue).toHaveLength(1);
    expect(team_rouge).toHaveLength(1);
    expect(team_bleue[0].pseudo).not.toBe(team_rouge[0].pseudo);
  });
  it('randomTeams 2v2 lance erreur si pas assez', () => {
    expect(() => randomTeams([{ pseudo: 'a' }], '2v2')).toThrow(/Pas assez/);
  });
});
