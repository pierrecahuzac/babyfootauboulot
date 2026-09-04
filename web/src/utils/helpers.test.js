import { describe, it, expect } from 'vitest';
import { posteColor, niveauColor, initials, avatarBg, shuffle, randomTeams, validateMatchPayload } from './helpers.js';

describe('helpers posteColor', () => {
  it('Attaque rouge', () => expect(posteColor('Attaque')).toMatch(/red/));
  it('Défense bleu', () => expect(posteColor('Défense')).toMatch(/blue/));
  it('Les 2 violet', () => expect(posteColor('Les 2')).toMatch(/violet/));
});

describe('niveauColor', () => {
  it('Confirmé amber', () => expect(niveauColor('Confirmé')).toMatch(/amber/));
  it('Intermédiaire emerald', () => expect(niveauColor('Intermédiaire')).toMatch(/emerald/));
  it('Débutant zinc', () => expect(niveauColor('Débutant')).toMatch(/zinc/));
});

describe('initials', () => {
  it('2 lettres maj', () => expect(initials('pierre_j')).toBe('PI'));
  it('sarah', () => expect(initials('sarah_l')).toBe('SA'));
});

describe('avatarBg', () => {
  it('déterministe', () => {
    expect(avatarBg('pierre')).toBe(avatarBg('pierre'));
    const hues = ['pierre','sarah','tom','lucas','bob','alice','carol'].map(avatarBg);
    expect(new Set(hues).size).toBeGreaterThan(1);
  });
  it('contient gradient', () => expect(avatarBg('x')).toMatch(/from-/));
});

describe('shuffle', () => {
  it('conserve éléments', () => {
    const a = [1,2,3,4,5];
    expect(shuffle(a).sort()).toEqual([1,2,3,4,5]);
  });
  it('ne mute pas original', () => {
    const a = [1,2,3];
    const b = shuffle(a);
    expect(a).toEqual([1,2,3]);
    expect(b).not.toBe(a);
  });
});

describe('randomTeams', () => {
  const ps = [{ pseudo: 'a' }, { pseudo: 'b' }, { pseudo: 'c' }, { pseudo: 'd' }, { pseudo: 'e' }];
  it('1v1 2 distinct', () => {
    const { team_bleue, team_rouge } = randomTeams(ps, '1v1');
    expect(team_bleue).toHaveLength(1);
    expect(team_rouge).toHaveLength(1);
    expect(team_bleue[0].pseudo).not.toBe(team_rouge[0].pseudo);
  });
  it('2v2 4 distinct', () => {
    const { team_bleue, team_rouge } = randomTeams(ps, '2v2');
    expect(team_bleue).toHaveLength(2);
    expect(team_rouge).toHaveLength(2);
    const all = [...team_bleue, ...team_rouge].map(p=>p.pseudo);
    expect(new Set(all).size).toBe(4);
  });
  it('erreur si pas assez', () => expect(() => randomTeams([{ pseudo: 'a' }], '1v1')).toThrow());
});

describe('validateMatchPayload', () => {
  it('ok', () => expect(validateMatchPayload({ format:'1v1', team_bleue:[{pseudo:'a'}], team_rouge:[{pseudo:'b'}]})).toBeNull());
  it('doublon', () => expect(validateMatchPayload({ format:'1v1', team_bleue:[{pseudo:'a'}], team_rouge:[{pseudo:'a'}]})).toMatch(/deux équipes/));
});
