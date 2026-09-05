import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const CreateMatch = ({ players, ligueId, onDone, onBack }) => {
  const [format, setFormat] = useState('1v1');
  const [bleue1, setBleue1] = useState(''); const [bleue2, setBleue2] = useState('');
  const [rouge1, setRouge1] = useState(''); const [rouge2, setRouge2] = useState('');
  const [scoreBleue, setScoreBleue] = useState(10); const [scoreRouge, setScoreRouge] = useState(7);
  const [err, setErr] = useState('');
  const [isRandom, setIsRandom] = useState(false);

  const toTeam = (pseudo, poste) => {
    const p = players.find(x => x.pseudo === pseudo);
    if (!p) return poste ? { pseudo, poste } : { pseudo };
    return poste ? { id: p.id, pseudo: p.pseudo, poste } : { id: p.id, pseudo: p.pseudo };
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const randomize = () => {
    setErr('');
    const need = format === '1v1' ? 2 : 4;
    if (players.length < need) {
      setErr(`Pas assez de joueurs : ${players.length}/${need} (inscris-en d'autres)`);
      return;
    }
    const picked = shuffle(players).slice(0, need);
    if (format === '1v1') {
      setBleue1(picked[0].pseudo); setRouge1(picked[1].pseudo);
      setBleue2(''); setRouge2('');
    } else {
      // Joueurs ET postes aléatoires : chaque équipe a 1 Attaque + 1 Défense, tirage qui prend qui
      const bleue = [picked[0], picked[1]];
      const rouge = [picked[2], picked[3]];
      if (Math.random() < 0.5) bleue.reverse();
      if (Math.random() < 0.5) rouge.reverse();
      setBleue1(bleue[0].pseudo); setBleue2(bleue[1].pseudo);
      setRouge1(rouge[0].pseudo); setRouge2(rouge[1].pseudo);
    }
    setIsRandom(true);
    setTimeout(() => setIsRandom(false), 600);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const team_bleue = format === '1v1' ? [toTeam(bleue1)] : [toTeam(bleue1, 'Attaque'), toTeam(bleue2, 'Défense')];
    const team_rouge = format === '1v1' ? [toTeam(rouge1)] : [toTeam(rouge1, 'Attaque'), toTeam(rouge2, 'Défense')];
    if (team_bleue.some(t=>!t.pseudo) || team_rouge.some(t=>!t.pseudo)) { setErr('Sélectionne tous les joueurs'); return; }
    const allPseudos = [...team_bleue, ...team_rouge].map(t=>t.pseudo);
    if (new Set(allPseudos).size !== allPseudos.length) { setErr('Un joueur ne peut pas être dans les deux équipes'); return; }
    if (!ligueId) { setErr('Choisis une ligue d’abord (en haut)'); return; }
    const res = await fetch(`${API}/api/matches`, {
      method:'POST', headers:{ 'Content-Type':'application/json', ...(() => { const t=localStorage.getItem('babyfoot_token'); return t?{Authorization:`Bearer ${t}`}:{}; })(), 'X-Ligue-Id': String(ligueId) }, credentials: 'include',
      body: JSON.stringify({ format, team_bleue, team_rouge, score_bleue: Number(scoreBleue), score_rouge: Number(scoreRouge), ligue_id: ligueId })
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  };

  const sel = (val,setter, posteLabel) => (
    <div className="space-y-1">
      {posteLabel && <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">{posteLabel}</p>}
      <select value={val} onChange={e=>setter(e.target.value)} className={`w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 ${isRandom ? 'animate-pulse' : ''}`}>
        <option value="">{posteLabel ? `— ${posteLabel.toLowerCase()} —` : '— choisir joueur —'}</option>
        {players.map(p=><option key={p.id} value={p.pseudo}>{p.pseudo} · {p.poste}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm">⚔️</span>
        Nouveau match
      </h2>

      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
        <button type="button" onClick={()=>setFormat('1v1')} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${format==='1v1'?'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600': 'text-zinc-500'}`}>1 vs 1</button>
        <button type="button" onClick={()=>setFormat('2v2')} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${format==='2v2'?'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600': 'text-zinc-500'}`}>2 vs 2</button>
      </div>

      <button type="button" onClick={randomize} className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-3 rounded-xl font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2">
        <span className={isRandom ? 'animate-spin' : ''}>🎲</span> Tirage aléatoire {format}
        <span className="bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full text-xs font-medium">{format==='1v1' ? '2 joueurs' : '4 joueurs'}</span>
      </button>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-500"></span>Équipe Bleue</p>
        <div className="space-y-3">
          {format === '1v1' ? sel(bleue1,setBleue1) : (
            <>
              {sel(bleue1,setBleue1,'Attaque')}
              {sel(bleue2,setBleue2,'Défense')}
            </>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Équipe Rouge</p>
        <div className="space-y-3">
          {format === '1v1' ? sel(rouge1,setRouge1) : (
            <>
              {sel(rouge1,setRouge1,'Attaque')}
              {sel(rouge2,setRouge2,'Défense')}
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Score final</p>
        <div className="flex gap-3 items-center mt-3">
          <div className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 flex items-center gap-2 bg-white dark:bg-zinc-800">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <input type="number" min="0" max="10" value={scoreBleue} onChange={e=>setScoreBleue(e.target.value)} className="w-full font-semibold text-center focus:outline-none bg-transparent" />
          </div>
          <span className="font-medium text-zinc-400">—</span>
          <div className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 flex items-center gap-2 bg-white dark:bg-zinc-800">
            <input type="number" min="0" max="10" value={scoreRouge} onChange={e=>setScoreRouge(e.target.value)} className="w-full font-semibold text-center focus:outline-none bg-transparent" />
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded-xl">{err}</p>}
      <button type="submit" className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-medium hover:bg-violet-700">Valider le match</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 hover:text-zinc-700">← Retour</button>
    </form>
  );
};

export default CreateMatch;
