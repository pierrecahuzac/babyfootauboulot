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
    if (!p) return { pseudo, poste };
    return { id: p.id, pseudo: p.pseudo, poste };
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
      setBleue1(picked[0].pseudo); setBleue2(picked[1].pseudo);
      setRouge1(picked[2].pseudo); setRouge2(picked[3].pseudo);
    }
    setIsRandom(true);
    setTimeout(() => setIsRandom(false), 600);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const team_bleue = format === '1v1' ? [toTeam(bleue1, 'Les 2')] : [toTeam(bleue1, 'Attaque'), toTeam(bleue2, 'Défense')];
    const team_rouge = format === '1v1' ? [toTeam(rouge1, 'Les 2')] : [toTeam(rouge1, 'Attaque'), toTeam(rouge2, 'Défense')];
    if (team_bleue.some(t=>!t.pseudo) || team_rouge.some(t=>!t.pseudo)) { setErr('Sélectionne tous les joueurs'); return; }
    const allPseudos = [...team_bleue, ...team_rouge].map(t=>t.pseudo);
    if (new Set(allPseudos).size !== allPseudos.length) { setErr('Un joueur ne peut pas être dans les deux équipes'); return; }
    if (!ligueId) { setErr('Choisis une ligue d’abord (en haut)'); return; }
    const res = await fetch(`${API}/api/matches`, {
      method:'POST', headers:{ 'Content-Type':'application/json', ...(() => { const t=localStorage.getItem('babyfoot_token'); return t?{Authorization:`Bearer ${t}`}:{}; })(), 'X-Ligue-Id': String(ligueId) },
      body: JSON.stringify({ format, team_bleue, team_rouge, score_bleue: Number(scoreBleue), score_rouge: Number(scoreRouge), ligue_id: ligueId })
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  };

  const sel = (val,setter, accent, posteLabel) => (
    <div className="space-y-1">
      {posteLabel && <p className={`text-[11px] font-black tracking-widest ${accent.includes('blue') ? 'text-blue-600' : 'text-red-600'}`}>{posteLabel}</p>}
      <select value={val} onChange={e=>setter(e.target.value)} className={`w-full border-2 rounded-2xl px-3 py-3 bg-white font-medium focus:outline-none shadow-sm ${accent} ${isRandom ? 'animate-pulse' : ''}`}>
        <option value="">{posteLabel ? `— ${posteLabel.toLowerCase()} —` : '— choisir joueur —'}</option>
        {players.map(p=><option key={p.id} value={p.pseudo}>{p.pseudo} • {p.poste}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="font-black text-xl text-zinc-900 flex items-center gap-2 dark:text-zinc-100">
        <span className="bg-gradient-to-r from-blue-500 to-red-500 text-white w-8 h-8 rounded-xl flex items-center justify-center text-sm">⚔️</span>
        Nouveau match
      </h2>

      <div className="flex gap-2 p-1.5 bg-zinc-100 rounded-2xl dark:bg-zinc-700">
        <button type="button" onClick={()=>setFormat('1v1')} className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-1 ${format==='1v1'?'bg-white shadow text-zinc-900 border': 'text-zinc-500'}`}>👤 1 vs 1</button>
        <button type="button" onClick={()=>setFormat('2v2')} className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-1 ${format==='2v2'?'bg-white shadow text-zinc-900 border': 'text-zinc-500'}`}>👥 2 vs 2</button>
      </div>

      <button type="button" onClick={randomize} className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 text-white py-3.5 rounded-2xl font-black shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 border-2 border-white dark:bg-zinc-800 dark:text-zinc-100">
        <span className={`text-lg ${isRandom ? 'animate-spin' : ''}`}>🎲</span> Tirage aléatoire {format}
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{format==='1v1' ? '2 joueurs' : '4 joueurs'}</span>
      </button>
      <p className="text-[11px] text-zinc-500 text-center -mt-3 dark:text-zinc-400">On choisit le format, ça mélange les joueurs distincts</p>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-4 space-y-3 shadow-sm">
        <p className="text-sm font-black flex items-center gap-2 text-blue-700"><span className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm">💙</span>Équipe Bleue</p>
        <div className="space-y-3">
          {format === '1v1' ? sel(bleue1,setBleue1,'border-blue-200 focus:border-blue-400') : (
            <>
              {sel(bleue1,setBleue1,'border-blue-200 focus:border-blue-400','⚡ Attaque')}
              {sel(bleue2,setBleue2,'border-blue-200 focus:border-blue-400','🛡️ Défense')}
            </>
          )}
        </div>
      </div>
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4 space-y-3 shadow-sm">
        <p className="text-sm font-black flex items-center gap-2 text-red-700"><span className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center text-sm">❤️</span>Équipe Rouge</p>
        <div className="space-y-3">
          {format === '1v1' ? sel(rouge1,setRouge1,'border-red-200 focus:border-red-400') : (
            <>
              {sel(rouge1,setRouge1,'border-red-200 focus:border-red-400','⚡ Attaque')}
              {sel(rouge2,setRouge2,'border-red-200 focus:border-red-400','🛡️ Défense')}
            </>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-4">
        <p className="text-sm font-black text-amber-800 flex items-center gap-2">🏁 Score final</p>
        <div className="flex gap-3 items-center mt-3">
          <div className="flex-1 bg-white border-2 border-blue-300 rounded-2xl p-2 flex items-center gap-2 shadow dark:bg-zinc-800 dark:text-zinc-100">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <input type="number" value={scoreBleue} onChange={e=>setScoreBleue(e.target.value)} className="w-full font-black text-xl text-blue-700 focus:outline-none text-center" />
          </div>
          <span className="font-black text-zinc-400 text-lg dark:text-zinc-400">—</span>
          <div className="flex-1 bg-white border-2 border-red-300 rounded-2xl p-2 flex items-center gap-2 shadow dark:bg-zinc-800 dark:text-zinc-100">
            <input type="number" value={scoreRouge} onChange={e=>setScoreRouge(e.target.value)} className="w-full font-black text-xl text-red-700 focus:outline-none text-center" />
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-700 bg-red-50 border-2 border-red-200 p-3 rounded-2xl font-bold dark:bg-zinc-800 dark:text-zinc-100">⚠️ {err}</p>}
      <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.01] transition text-base">✅ Valider le match</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 font-medium dark:text-zinc-400">← Retour</button>
    </form>
  );
};

export default CreateMatch;
