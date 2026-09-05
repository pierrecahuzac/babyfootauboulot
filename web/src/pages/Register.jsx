import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const Register = ({ onAuth, onBack, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [poste, setPoste] = useState('Attaque');
  const [niveau, setNiveau] = useState('Débutant');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setInfo('');
    const res = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type':'application/json' }, credentials: 'include', body: JSON.stringify({ email, pseudo, password, poste, niveau }) });
    const body = await res.json();
    if (!res.ok) { setErr(body.error); return; }
    if (body.verificationToken) setInfo(`Compte créé ! Token vérif (dev): ${body.verificationToken.slice(0,12)}… — check /verify`);
    onAuth(body);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center">
        <div className="text-4xl">🚀</div>
        <h2 className="font-black text-xl">Créer ton compte</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Email + mot de passe (6+ caractères)</p>
      </div>
      <label className="block text-sm font-bold">Email
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <label className="block text-sm font-bold">Pseudo
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} placeholder="ex. pierre_j" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <label className="block text-sm font-bold">Mot de passe
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <div className="text-sm font-bold">Poste
        <div className="flex gap-2 mt-1">
          {['Défense','Attaque','Attaque / Défense'].map(v => (
            <button type="button" key={v} onClick={()=>setPoste(v)} className={`flex-1 py-2.5 rounded-2xl border-2 font-black ${poste===v?'bg-emerald-500 text-white border-emerald-600':'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'}`}>{v}</button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-bold">Niveau
        <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
          <option value="Débutant">Débutant 🌱</option><option value="Intermédiaire">Intermédiaire ⚡</option><option value="Confirmé">Confirmé 🔥</option>
        </select>
      </label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {info && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {info}</p>}
      <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-black shadow-xl">Créer mon compte</button>
      <p className="text-center text-sm">Déjà un compte ? <button type="button" onClick={onSwitch} className="font-black text-emerald-600 underline">Connexion</button></p>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </form>
  );
};

export default Register;
