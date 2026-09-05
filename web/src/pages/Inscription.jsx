import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const Inscription = ({ onDone, onBack }) => {
  const [pseudo, setPseudo] = useState('');
  const [poste, setPoste] = useState('Attaque');
  const [niveau, setNiveau] = useState('Débutant');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const res = await fetch(`${API}/api/players`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ pseudo, poste, niveau })
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="font-black text-xl text-zinc-900 dark:text-zinc-100">Ajouter un invité</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sans compte — pratique pour un collègue de passage</p>
      </div>
      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Pseudo
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} placeholder="ex. pierre_j" className="mt-1.5 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none bg-white shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" required />
      </label>
      <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Poste préféré
        <div className="flex gap-2 mt-1.5">
          {[
            { v:'Défense', col: poste==='Défense' ? 'bg-blue-500 text-white border-blue-600 shadow-lg scale-[1.02]' : 'bg-blue-50 text-blue-700 border-blue-200', icon:'🛡️' },
            { v:'Attaque', col: poste==='Attaque' ? 'bg-red-500 text-white border-red-600 shadow-lg scale-[1.02]' : 'bg-red-50 text-red-700 border-red-200', icon:'⚡' },
            { v:'Les 2', col: poste==='Les 2' ? 'bg-gradient-to-r from-blue-500 to-red-500 text-white border-transparent shadow-lg scale-[1.02]' : 'bg-violet-50 text-violet-700 border-violet-200', icon:'🔄' },
          ].map(o => (
            <button type="button" key={o.v} onClick={()=>setPoste(o.v)} className={`flex-1 py-3 rounded-2xl border-2 text-sm font-black transition flex items-center justify-center gap-1 ${o.col}`}>{o.icon} {o.v}</button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Niveau de départ
        <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1.5 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 bg-white focus:border-amber-400 focus:outline-none font-medium dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
          <option value="Débutant">Débutant 🌱</option><option value="Intermédiaire">Intermédiaire ⚡</option><option value="Confirmé">Confirmé 🔥</option>
        </select>
      </label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.01] transition text-base">🚀 Ajouter</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 font-medium hover:text-zinc-700 dark:text-zinc-400">← Retour accueil</button>
    </form>
  );
};

export default Inscription;
