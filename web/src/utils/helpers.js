export const posteColor = (poste) => {
  if (poste === 'Attaque') return 'bg-red-100 text-red-700 border-red-200';
  if (poste === 'Défense') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gradient-to-r from-blue-100 to-red-100 text-violet-700 border-violet-200';
};

export const niveauColor = (niveau) => {
  if (niveau === 'Confirmé') return 'bg-amber-400 text-amber-900';
  if (niveau === 'Intermédiaire') return 'bg-emerald-400 text-emerald-900';
  return 'bg-zinc-200 text-zinc-700';
};

export const initials = (pseudo) => pseudo.slice(0,2).toUpperCase();

export const avatarBg = (pseudo) => {
  const hues = ['from-violet-500 to-purple-500','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-orange-500 to-amber-500','from-pink-500 to-rose-500','from-indigo-500 to-blue-500'];
  let h=0; for(let i=0;i<pseudo.length;i++) h=(h*31+pseudo.charCodeAt(i))%hues.length;
  return hues[h];
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

export const validateMatchPayload = ({ format, team_bleue, team_rouge }) => {
  if (format === '1v1' && (team_bleue.length !== 1 || team_rouge.length !== 1)) return '1v1 = 1 joueur par équipe';
  if (format === '2v2' && (team_bleue.length !== 2 || team_rouge.length !== 2)) return '2v2 = 2 joueurs par équipe';
  const all = [...team_bleue, ...team_rouge].map(t => t.pseudo);
  if (new Set(all).size !== all.length) return 'Un joueur ne peut pas être dans les deux équipes';
  return null;
};
