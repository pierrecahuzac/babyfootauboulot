export const normalizeMatch = (m) => {
  const teamBleue = m.teamBleue ?? m.team_bleue ?? m.teamA ?? m.team_a;
  const teamRouge = m.teamRouge ?? m.team_rouge ?? m.teamB ?? m.team_b;
  const scoreBleue = m.scoreBleue ?? m.score_bleue ?? m.scoreA ?? m.score_a;
  const scoreRouge = m.scoreRouge ?? m.score_rouge ?? m.scoreB ?? m.score_b;
  return {
    ...m,
    teamBleue, teamRouge, scoreBleue, scoreRouge,
    team_bleue: teamBleue, team_rouge: teamRouge, score_bleue: scoreBleue, score_rouge: scoreRouge,
    team_a: teamBleue, team_b: teamRouge, score_a: scoreBleue, score_b: scoreRouge,
    teamA: teamBleue, teamB: teamRouge, scoreA: scoreBleue, scoreB: scoreRouge,
  };
};

export const calculateClassement = (allPlayers, allMatches) => {
  const classement = allPlayers
    .filter(p => p.pseudo !== 'admin')
    .map(p => {
      let v = 0, d = 0;
      for (const raw of allMatches) {
        const m = normalizeMatch(raw);
        if (!m.teamBleue || !m.teamRouge) continue;
        const inBleue = m.teamBleue.some(x => x.pseudo === p.pseudo || x.id === p.id);
        const inRouge = m.teamRouge.some(x => x.pseudo === p.pseudo || x.id === p.id);
        if (!inBleue && !inRouge) continue;
        const winBleue = m.scoreBleue > m.scoreRouge;
        const winRouge = m.scoreRouge > m.scoreBleue;
        if ((inBleue && winBleue) || (inRouge && winRouge)) v++;
        else if ((inBleue && winRouge) || (inRouge && winBleue)) d++;
        // égalité = pas compté comme défaite/victoire (match nul ignoré ici)
      }
      const total = v + d;
      return { ...p, victoires: v, defaites: d, ratio: total ? Math.round((v / total) * 100) : 0, total };
    });
  classement.sort((a, b) => b.victoires - a.victoires || b.ratio - a.ratio);
  return classement;
};

export const validateMatchPayload = ({ format, team_bleue, team_rouge, score_bleue, score_rouge }) => {
  if (!format || !team_bleue || !team_rouge || score_bleue == null || score_rouge == null) {
    return 'format, team_bleue, team_rouge, score_bleue, score_rouge requis';
  }
  if (format === '1v1' && (team_bleue.length !== 1 || team_rouge.length !== 1)) {
    return '1v1 = 1 joueur par équipe';
  }
  if (format === '2v2' && (team_bleue.length !== 2 || team_rouge.length !== 2)) {
    return '2v2 = 2 joueurs par équipe';
  }
  const sb = Number(score_bleue), sr = Number(score_rouge);
  if (!Number.isInteger(sb) || !Number.isInteger(sr) || sb < 0 || sb > 10 || sr < 0 || sr > 10) {
    return 'scores 0-10 entiers requis';
  }
  const all = [...team_bleue, ...team_rouge].map(t => t.pseudo);
  if (new Set(all).size !== all.length) return 'Un joueur ne peut pas être dans les deux équipes';
  return null;
};

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const randomTeams = (players, format) => {
  const need = format === '1v1' ? 2 : 4;
  if (players.length < need) throw new Error(`Pas assez de joueurs: ${players.length}/${need}`);
  const picked = shuffle(players).slice(0, need);
  if (format === '1v1') return { team_bleue: [picked[0]], team_rouge: [picked[1]] };
  return { team_bleue: [picked[0], picked[1]], team_rouge: [picked[2], picked[3]] };
};
