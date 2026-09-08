import { useState } from 'react';
import Spinner, { ButtonSpinner } from '../components/Spinner.jsx';

const API = import.meta.env.VITE_API_URL || '';

const CreateMatch = ({ players, loading, leagueId, ligueId, leagues, ligues, league, ligue, onLeagueChange, onLigueChange, onLeagues, onLigues, onDone, onBack }) => {
  const effectiveLeagueId = leagueId ?? ligueId;
  const leaguesData = leagues ?? ligues ?? [];
  const currentLeague = league ?? ligue ?? leaguesData.find(l => Number(l.id) === Number(effectiveLeagueId)) ?? null;
  const handleLeagueChange = onLeagueChange ?? onLigueChange;
  const handleLeagues = onLeagues ?? onLigues;
  const [format, setFormat] = useState('1v1');
  const [bleue1, setBleue1] = useState(''); const [bleue2, setBleue2] = useState('');
  const [rouge1, setRouge1] = useState(''); const [rouge2, setRouge2] = useState('');
  const [scoreBleue, setScoreBleue] = useState(10); const [scoreRouge, setScoreRouge] = useState(7);
  const [err, setErr] = useState('');
  const [isRandom, setIsRandom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const safePlayers = Array.isArray(players) ? players : [];
  const need = format === '1v1' ? 2 : 4;
  const canRandomize = safePlayers.length >= need;

  const toTeam = (pseudo, poste) => {
    const p = safePlayers.find(x => x.pseudo === pseudo);
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
    if (!canRandomize) {
      setErr(`Pas assez de joueurs : ${safePlayers.length}/${need} (inscris-en d'autres)`);
      return;
    }
    const picked = shuffle(safePlayers).slice(0, need);
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
    if (submitting) return;
    setErr('');
    const team_bleue = format === '1v1' ? [toTeam(bleue1)] : [toTeam(bleue1, 'Attaque'), toTeam(bleue2, 'Défense')];
    const team_rouge = format === '1v1' ? [toTeam(rouge1)] : [toTeam(rouge1, 'Attaque'), toTeam(rouge2, 'Défense')];
    if (team_bleue.some(t=>!t.pseudo) || team_rouge.some(t=>!t.pseudo)) { setErr('Sélectionne tous les joueurs'); return; }
    const allPseudos = [...team_bleue, ...team_rouge].map(t=>t.pseudo);
    if (new Set(allPseudos).size !== allPseudos.length) { setErr('Un joueur ne peut pas être dans les deux équipes'); return; }
    if (!effectiveLeagueId) { setErr('Choisis une ligue d’abord (en haut)'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/matches`, {
        method:'POST', headers:{ 'Content-Type':'application/json', ...(() => { const t=localStorage.getItem('babyfoot_token'); return t?{Authorization:`Bearer ${t}`}:{}; })(), 'X-Ligue-Id': String(effectiveLeagueId) }, credentials: 'include',
        body: JSON.stringify({ format, team_bleue, team_rouge, score_bleue: Number(scoreBleue), score_rouge: Number(scoreRouge), ligue_id: effectiveLeagueId })
      });
      if (!res.ok) { setErr((await res.json()).error); return; }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  const sel = (val,setter, posteLabel) => (
    <div className="space-y-1">
      {posteLabel && <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">{posteLabel}</p>}
      <select value={val} onChange={e=>setter(e.target.value)} className={`w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 ${isRandom ? 'animate-pulse' : ''}`}>
        <option value="">{posteLabel ? `— ${posteLabel.toLowerCase()} —` : '— choisir joueur —'}</option>
        {safePlayers.map(p=><option key={p.id} value={p.pseudo}>{p.pseudo} · {p.poste}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm">⚔️</span>
        Nouveau match
      </h2>

      {/* Contexte ligue — indispensable si plusieurs ligues */}
      {currentLeague ? (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center text-sm shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 uppercase">Ligue</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{currentLeague.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{currentLeague.slug} · {currentLeague.is_private === 1 || currentLeague.is_private === true ? 'privée' : currentLeague.is_private === 0 ? 'publique' : ''}</p>
          </div>
          {handleLeagues && (
            <button type="button" onClick={handleLeagues} className="shrink-0 border border-zinc-200 dark:border-zinc-600 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600">Gérer</button>
          )}
        </div>
      ) : effectiveLeagueId ? (
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-400">
          Ligue #{effectiveLeagueId} — chargement…
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-center">
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Aucune ligue sélectionnée</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Choisis une ligue pour créer le match — important si tu as plusieurs ligues.</p>
          {handleLeagues && <button type="button" onClick={handleLeagues} className="mt-3 bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-medium">Gérer mes ligues</button>}
        </div>
      )}

      {leaguesData.length > 1 && handleLeagueChange ? (
        <div>
          <label className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">Changer de ligue</label>
          <select value={effectiveLeagueId || ''} onChange={(e)=>handleLeagueChange(e.target.value)} className="mt-1 w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300">
            <option value="">— Choisir une ligue —</option>
            {leaguesData.map(l=> <option key={l.id} value={l.id}>{l.name} · {l.slug}</option>)}
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">Le match sera enregistré dans cette ligue. Les joueurs affichés ci-dessous viennent de cette ligue.</p>
        </div>
      ) : currentLeague ? (
        <p className="text-[11px] text-zinc-500 -mt-2">Le match sera enregistré dans cette ligue — les joueurs listés viennent de cette ligue.</p>
      ) : null}

      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
        <button type="button" onClick={()=>setFormat('1v1')} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${format==='1v1'?'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600': 'text-zinc-500'}`}>1 vs 1</button>
        <button type="button" onClick={()=>setFormat('2v2')} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${format==='2v2'?'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600': 'text-zinc-500'}`}>2 vs 2</button>
      </div>

      <button
        type="button"
        onClick={randomize}
        disabled={!canRandomize || loading}
        title={!canRandomize && !loading ? `Pas assez de joueurs : ${safePlayers.length}/${need} pour un ${format}` : undefined}
        className={`w-full border py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition ${!canRandomize || loading ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}
      >
        <span className={isRandom ? 'animate-spin' : ''}>🎲</span> Tirage aléatoire {format}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!canRandomize || loading ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500' : 'bg-zinc-100 dark:bg-zinc-700'}`}>{format==='1v1' ? '2 joueurs' : '4 joueurs'}</span>
      </button>
      {!canRandomize && !loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center -mt-1">Pas assez de joueurs pour un {format} : {safePlayers.length}/{need} dans cette ligue</p>
      )}

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

      {loading && <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><Spinner size={14} /> Chargement des joueurs…</div>}
      {err && <p className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded-xl">{err}</p>}
      <button type="submit" disabled={submitting} className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">{submitting && <ButtonSpinner />} {submitting ? 'Envoi…' : 'Valider le match'}</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 hover:text-zinc-700">← Retour</button>
    </form>
  );
};

export default CreateMatch;
