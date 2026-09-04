import { useState } from 'react';
import { authFetch } from '../utils/auth.js';

const Ligues = ({ ligues, currentLigue, onSelect, onRefresh, user }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [visibleCode, setVisibleCode] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await authFetch('/api/ligues', { method: 'POST', body: JSON.stringify({ name, description: desc }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk(`Ligue créée ! Code: ${b.invite_code || b.inviteCode} — partage-le en main propre`);
    setName(''); setDesc('');
    await onRefresh();
    onSelect(b.id);
  };

  const join = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await authFetch('/api/ligues/join', { method: 'POST', body: JSON.stringify({ invite_code: code }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk(`Rejoint: ${b.name}`);
    setCode('');
    await onRefresh();
    onSelect(b.id);
  };

  if (!user) return <div className="text-center p-8"><p className="font-black">🔒 Connecte-toi d'abord</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Crée un compte email+mdp pour gérer tes ligues privées.</p></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-black text-xl flex items-center gap-2">🏆 Mes ligues privées</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Chaque ligue est <b>isolée</b>. Invite par code donné en main propre / email / WhatsApp. Pas de liste publique.</p>
      {ligues.length===0 && <p className="text-sm text-zinc-500 bg-zinc-50 border-2 border-zinc-100 p-4 rounded-2xl dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">Aucune ligue — crée la première !</p>}
      <div className="space-y-2">
        {ligues.map(l=> {
          const codeVal = l.invite_code || l.inviteCode;
          const isVisible = visibleCode === l.id;
          return (
          <div key={l.id} className={`p-4 rounded-3xl border-2 flex justify-between items-center ${Number(currentLigue)===Number(l.id) ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-zinc-100'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-black truncate">{l.name}</p>
              <p className="text-xs text-zinc-500 truncate dark:text-zinc-400">{l.description || '—'} • {l.slug}</p>
              <div className="mt-1 flex items-center gap-2">
                {isVisible ? (
                  <>
                    <span className="text-xs font-mono bg-zinc-900 text-white px-2 py-0.5 rounded-full tracking-widest dark:bg-zinc-700">{codeVal}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(codeVal); }} className="text-xs bg-zinc-100 px-2 py-0.5 rounded-full font-bold dark:bg-zinc-700">Copier</button>
                    <button onClick={() => setVisibleCode(null)} className="text-xs text-zinc-500 dark:text-zinc-400">Masquer</button>
                  </>
                ) : (
                  <button onClick={() => setVisibleCode(l.id)} className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-full font-bold dark:bg-zinc-700">👁️ Voir code</button>
                )}
              </div>
            </div>
            <button onClick={()=>onSelect(l.id)} className={`ml-3 px-4 py-2 rounded-2xl font-black text-sm shrink-0 ${Number(currentLigue)===Number(l.id) ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white'}`}>{Number(currentLigue)===Number(l.id) ? '✓ Active' : 'Choisir'}</button>
          </div>
        )})}
      </div>
      <form onSubmit={create} className="bg-white border-2 border-zinc-100 rounded-3xl p-4 space-y-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <h3 className="font-black">➕ Créer une ligue privée</h3>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Boulot - Étage 3" className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optionnel)" className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
        <button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl font-black">Créer + devenir owner</button>
      </form>
      <form onSubmit={join} className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 space-y-3">
        <h3 className="font-black">🔑 Rejoindre avec un code</h3>
        <p className="text-xs text-amber-800">Demande le code à ton collègue (6 caractères, ex: A3K9P2)</p>
        <div className="flex gap-2">
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="CODE" className="flex-1 border-2 border-amber-300 rounded-2xl px-4 py-3 font-mono font-black tracking-widest text-center dark:bg-zinc-800 dark:text-zinc-100" maxLength={6} required />
          <button className="bg-amber-500 text-white px-6 rounded-2xl font-black">Rejoindre</button>
        </div>
      </form>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">🔒 Privé : personne ne trouve ta ligue sans le code. Le créateur reste owner.</p>
    </div>
  );
};

export default Ligues;
