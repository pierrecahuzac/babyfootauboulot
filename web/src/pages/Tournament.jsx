import { useState } from 'react';
import { authFetch } from '../utils/auth.js';
import { initials, avatarBg } from '../utils/helpers.js';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const nextPow2 = (n) => {
  let s = 1;
  while (s < n) s <<= 1;
  return s;
};

const buildParticipants = (selected, format) => {
  if (format === '1v1') return selected.map((p) => ({ key: p, label: p, players: [p] }));
  const sh = shuffle(selected);
  const teams = [];
  for (let i = 0; i + 1 < sh.length; i += 2) {
    teams.push({ key: `${sh[i]}+${sh[i + 1]}`, label: `${sh[i]} + ${sh[i + 1]}`, players: [sh[i], sh[i + 1]] });
  }
  return teams;
};

const buildBracket = (participants) => {
  const size = nextPow2(participants.length || 1);
  const slots = [...participants, ...Array(size - participants.length).fill(null)];
  const rounds = [];
  const first = [];
  for (let i = 0; i < slots.length; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    const m = { a, b, winner: null, scoreA: '', scoreB: '', postponed: false };
    if (a && !b) m.winner = a;
    if (!a && b) m.winner = b;
    first.push(m);
  }
  rounds.push(first);
  let prev = first;
  while (prev.length > 1) {
    const next = Array.from({ length: Math.floor(prev.length / 2) }, () => ({ a: null, b: null, winner: null, scoreA: '', scoreB: '', postponed: false }));
    prev.forEach((m, idx) => {
      if (m.winner) {
        const ni = Math.floor(idx / 2);
        if (idx % 2 === 0) next[ni].a = m.winner;
        else next[ni].b = m.winner;
      }
    });
    next.forEach((m) => {
      if (m.a && !m.b) m.winner = m.a;
      if (!m.a && m.b) m.winner = m.b;
    });
    rounds.push(next);
    prev = next;
  }
  // cascade auto-winners through rounds
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].forEach((m, idx) => {
      if (m.winner) {
        const ni = Math.floor(idx / 2);
        const slot = idx % 2 === 0 ? 'a' : 'b';
        if (rounds[r + 1][ni][slot] !== m.winner) rounds[r + 1][ni][slot] = m.winner;
      }
    });
    rounds[r + 1].forEach((m) => {
      if (m.a && !m.b) m.winner = m.a;
      if (!m.a && m.b) m.winner = m.b;
    });
  }
  return rounds;
};

const ParticipantView = ({ p }) => {
  if (!p) return <span className="italic text-zinc-400">Exempté</span>;
  const first = p.players?.[0] || p.label;
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarBg(first)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>{initials(first)}</span>
      <span className="truncate">{p.label}</span>
    </span>
  );
};

const Tournament = ({ onBack, players, user, league, onSaved }) => {
  const safePlayers = Array.isArray(players) ? players : [];
  const [format, setFormat] = useState('1v1');
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState('chosen');
  const [playerCount, setPlayerCount] = useState(4);
  const [bracket, setBracket] = useState(null);
  const [err, setErr] = useState('');
  const [generated, setGenerated] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const toggle = (pseudo) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pseudo)) next.delete(pseudo);
      else next.add(pseudo);
      return next;
    });
  };

  const generate = () => {
    setErr('');
    let chosen = [];
    if (mode === 'chosen') {
      chosen = safePlayers.filter((p) => selected.has(p.pseudo)).map((p) => p.pseudo);
      if (chosen.length < 4) {
        setErr('Sélectionne au moins 4 joueurs.');
        return;
      }
      if (format === '2v2' && chosen.length % 2 !== 0) {
        setErr('Pour un Duo, le nombre de joueurs doit être pair.');
        return;
      }
    } else {
      const n = Number(playerCount);
      if (!Number.isInteger(n) || n < 4) {
        setErr('Le nombre de joueurs doit être au moins 4.');
        return;
      }
      if (n > safePlayers.length) {
        setErr(`Pas assez de joueurs disponibles (${safePlayers.length}).`);
        return;
      }
      if (format === '2v2' && n % 2 !== 0) {
        setErr('Pour un Duo, le nombre de joueurs doit être pair.');
        return;
      }
      chosen = shuffle(safePlayers.map((p) => p.pseudo)).slice(0, n);
    }
    const participantsBuilt = buildParticipants(chosen, format);
    if (participantsBuilt.length < 2) {
      setErr('Pas assez de participants pour générer un tournoi.');
      return;
    }
    setParticipants(participantsBuilt);
    setBracket(buildBracket(participantsBuilt));
    setGenerated(true);
  };

  const reset = () => {
    setBracket(null);
    setGenerated(false);
    setErr('');
    setParticipants([]);
    setSavedMsg('');
  };

  const setWinner = (roundIndex, matchIndex, side) => {
    if (!bracket) return;
    const m = bracket[roundIndex][matchIndex];
    const winner = side === 'a' ? m.a : m.b;
    if (!winner || m.winner) return;
    const next = bracket.map((r) => r.map((x) => ({ ...x })));
    next[roundIndex][matchIndex].winner = winner;
    if (roundIndex < next.length - 1) {
      const ni = Math.floor(matchIndex / 2);
      const slot = matchIndex % 2 === 0 ? 'a' : 'b';
      next[roundIndex + 1][ni][slot] = winner;
      const nm = next[roundIndex + 1][ni];
      if (nm.a && !nm.b) nm.winner = nm.a;
      if (!nm.a && nm.b) nm.winner = nm.b;
      for (let r = roundIndex + 1; r < next.length - 1; r++) {
        let changed = false;
        next[r].forEach((mm, i) => {
          if (mm.winner) {
            const nni = Math.floor(i / 2);
            const sslot = i % 2 === 0 ? 'a' : 'b';
            if (next[r + 1][nni][sslot] !== mm.winner) {
              next[r + 1][nni][sslot] = mm.winner;
              changed = true;
            }
          }
        });
        next[r + 1].forEach((mm) => {
          if (mm.a && !mm.b && mm.winner !== mm.a) { mm.winner = mm.a; changed = true; }
          if (!mm.a && mm.b && mm.winner !== mm.b) { mm.winner = mm.b; changed = true; }
        });
        if (!changed) break;
      }
    }
    setBracket(next);
  };

  const togglePostpone = (roundIndex, matchIndex) => {
    if (!bracket) return;
    const m = bracket[roundIndex][matchIndex];
    if (m.winner) return;
    const next = bracket.map((r) => r.map((x) => ({ ...x })));
    next[roundIndex][matchIndex].postponed = !next[roundIndex][matchIndex].postponed;
    setBracket(next);
  };

  const totalRounds = bracket ? bracket.length : 0;
  const champion = bracket && totalRounds > 0 ? bracket[totalRounds - 1][0]?.winner : null;

  const saveTournament = async () => {
    if (!champion) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const payload = {
        format,
        participants: participants.map(p => ({ label: p.label, players: p.players })),
        champion: { label: champion.label, players: champion.players },
        ligue_id: league?.id || null,
      };
      const r = await authFetch('/api/tournois', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('save failed');
      setSavedMsg('Tournoi enregistré');
      onSaved?.();
    } catch {
      setSavedMsg('Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm">🏆</span>
          Tournoi
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 -mt-1">Génère un arbre à élimination à partir de tes joueurs.</p>
        {league && <p className="text-xs text-zinc-500">Ligue : <span className="font-medium text-zinc-700 dark:text-zinc-300">{league.name}</span></p>}

        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button type="button" onClick={() => { setFormat('1v1'); reset(); }} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${format === '1v1' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600' : 'text-zinc-500'}`}>Solo (1v1)</button>
          <button type="button" onClick={() => { setFormat('2v2'); reset(); }} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${format === '2v2' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600' : 'text-zinc-500'}`}>Duo (2v2)</button>
        </div>

        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button type="button" onClick={() => setMode('chosen')} className={`flex-1 py-2 rounded-lg font-medium text-xs transition ${mode === 'chosen' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600' : 'text-zinc-500'}`}>Joueurs choisis</button>
          <button type="button" onClick={() => setMode('random')} className={`flex-1 py-2 rounded-lg font-medium text-xs transition ${mode === 'random' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600' : 'text-zinc-500'}`}>Tirage aléatoire</button>
        </div>

        {mode === 'chosen' ? (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Participants (min. 4)</p>
          {safePlayers.length === 0 && <p className="text-xs text-zinc-500">Aucun joueur dans cette ligue.</p>}
          <div className="max-h-48 overflow-auto space-y-1">
            {safePlayers.map((p) => (
              <label key={p.id || p.pseudo} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selected.has(p.pseudo)} onChange={() => toggle(p.pseudo)} />
                <span>{p.pseudo}</span>
                <span className="text-xs text-zinc-500">· {p.poste}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500">
            {selected.size} joueur(s) sélectionné(s) — minimum 4.
          </p>
        </div>
        ) : (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nombre de joueurs (min. 4)</p>
          <input type="number" min="4" max={safePlayers.length} value={playerCount} onChange={(e) => setPlayerCount(e.target.value)} className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300" />
          <p className="text-[11px] text-zinc-500">
            {safePlayers.length} joueur(s) disponible(s) dans cette ligue.
          </p>
        </div>
        )}

        {err && <p className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded-xl">{err}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={generate} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-violet-700">🎲 Générer le tournoi</button>
          {generated && <button type="button" onClick={reset} className="flex-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">Réinitialiser</button>}
        </div>
      </div>

      {generated && bracket && (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs">👁️</span>
            Arbre à élimination
          </h3>

          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {bracket.map((round, ri) => (
                <div key={ri} className="flex flex-col gap-3 justify-center">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase text-center">
                    {ri === totalRounds - 1 ? 'Finale' : ri === totalRounds - 2 ? 'Demi-finales' : `Tour ${ri + 1}`}
                  </p>
                  {round.map((m, mi) => (
                    <div key={mi} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 w-44">
                      <div className={`space-y-1.5 text-sm ${m.winner ? '' : ''}`}>
                        <div className={`flex justify-between items-center ${m.winner === m.a && m.a ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          <ParticipantView p={m.a} />
                          {!m.winner && m.a && m.b && !m.postponed && (
                            <button type="button" onClick={() => setWinner(ri, mi, 'a')} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500 text-white">✓</button>
                          )}
                        </div>
                        <div className="text-center text-[10px] text-zinc-400">vs</div>
                        <div className={`flex justify-between items-center ${m.winner === m.b && m.b ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          <ParticipantView p={m.b} />
                          {!m.winner && m.a && m.b && !m.postponed && (
                            <button type="button" onClick={() => setWinner(ri, mi, 'b')} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white">✓</button>
                          )}
                        </div>
                      </div>
                      {m.postponed && !m.winner && (
                        <p className="mt-2 text-[10px] text-center text-amber-600 font-semibold">Reporté</p>
                      )}
                      {m.winner && (
                        <p className="mt-2 text-[10px] text-center text-emerald-600 font-semibold truncate">
                          Vainqueur : {m.winner.label}
                        </p>
                      )}
                      {!m.winner && m.a && m.b && (
                        <button type="button" onClick={() => togglePostpone(ri, mi)} className="mt-2 w-full text-[10px] px-1.5 py-0.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-50">
                          {m.postponed ? 'Annuler le report' : 'Reporter le match'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {champion && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-center space-y-2">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">🏆 Champion : {champion.label}</p>
              <button type="button" onClick={saveTournament} disabled={saving} className="bg-violet-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50">
                {saving ? 'Enregistrement…' : '💾 Enregistrer ce tournoi'}
              </button>
              {savedMsg && <p className="text-[11px] text-zinc-500">{savedMsg}</p>}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs">🏅</span>
          Au programme
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Solo / Duo — choisis ton format</li>
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Équipe choisie ou aléatoire (tirage)</li>
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Arbre à élimination + planning des matchs</li>
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Suivi en temps réel dans ta ligue</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs">👁️</span>
          Aperçu — format coupe
        </h3>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex gap-2">
        <button onClick={() => onBack?.()} className="flex-1 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-2.5 rounded-xl font-medium text-sm">← Retour à l'accueil</button>
        <button onClick={() => (window.location.hash = '#roadmap')} className="flex-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">Voir la roadmap</button>
      </div>
    </div>
  );
};

export default Tournament;
