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

  if (!user) return <div className="text-center p-8 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800"><p className="font-semibold">Connecte-toi d'abord</p><p className="text-sm text-zinc-500 mt-1">Crée un compte pour gérer tes ligues privées.</p></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Mes ligues privées</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Chaque ligue est isolée. Invite par code — pas de liste publique.</p>
      </div>
      {ligues.length===0 && <p className="text-sm text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-600 p-4 rounded-xl text-center bg-zinc-50 dark:bg-zinc-800">Aucune ligue — crée la première !</p>}
      <div className="space-y-2">
        {ligues.map(l=> {
          const codeVal = l.invite_code || l.inviteCode;
          const isVisible = visibleCode === l.id;
          const isActive = Number(currentLigue)===Number(l.id);
          return (
          <div key={l.id} className={`p-4 rounded-xl border flex justify-between items-center ${isActive ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-zinc-900 dark:text-zinc-100">{l.name}</p>
              <p className="text-xs text-zinc-500 truncate">{l.description || '—'} · {l.slug}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {isVisible ? (
                  <>
                    <span className="text-xs font-mono bg-zinc-900 dark:bg-zinc-700 text-white px-2.5 py-1 rounded-lg tracking-widest">{codeVal}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(codeVal); }} className="text-xs border border-zinc-200 dark:border-zinc-600 px-2 py-1 rounded-lg bg-white dark:bg-zinc-700">Copier</button>
                    <button onClick={() => setVisibleCode(null)} className="text-xs text-zinc-500">Masquer</button>
                  </>
                ) : (
                  <button onClick={() => setVisibleCode(l.id)} className="text-xs border border-zinc-200 dark:border-zinc-600 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 font-medium">Voir code</button>
                )}
              </div>
            </div>
            <button onClick={()=>onSelect(l.id)} className={`ml-3 px-3.5 py-2 rounded-full font-medium text-xs shrink-0 ${isActive ? 'bg-violet-600 text-white' : 'bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white'}`}>{isActive ? 'Active' : 'Choisir'}</button>
          </div>
        )})}
      </div>
      <form onSubmit={create} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Créer une ligue privée</h3>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Boulot - Étage 3" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 bg-white dark:bg-zinc-800" required />
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optionnel)" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 bg-white dark:bg-zinc-800" />
        <button className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-violet-700">Créer — devenir owner</button>
      </form>
      <form onSubmit={join} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Rejoindre avec un code</h3>
        <p className="text-xs text-zinc-500">Demande le code à ton collègue (6 caractères)</p>
        <div className="flex gap-2">
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="CODE" className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 font-mono font-medium tracking-widest text-center text-sm bg-white dark:bg-zinc-800" maxLength={6} required />
          <button className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-5 rounded-xl font-medium text-sm">Rejoindre</button>
        </div>
      </form>
      {err && <p className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded-xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-3 rounded-xl">✓ {ok}</p>}
      <p className="text-xs text-zinc-500 text-center">Privé : personne ne trouve ta ligue sans le code.</p>
    </div>
  );
};

export default Ligues;
