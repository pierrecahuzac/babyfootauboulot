import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const Login = ({ onAuth, onBack, onSwitch, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type':'application/json' }, credentials: 'include', body: JSON.stringify({ email, password }) });
    const body = await res.json();
    if (!res.ok) { setErr(body.error + (res.status===429 ? ' ⏳' : '')); return; }
    if (body.emailVerified === false) {
      // on laisse passer mais on prévient
    }
    onAuth(body);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center">
        <div className="text-4xl">🔑</div>
        <h2 className="font-black text-xl">Connexion</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Email + mot de passe</p>
      </div>
      <label className="block text-sm font-bold">Email
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <label className="block text-sm font-bold">Mot de passe
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      <button type="submit" className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black shadow-xl dark:bg-zinc-700">Se connecter</button>
      <p className="text-center text-sm">Pas de compte ? <button type="button" onClick={onSwitch} className="font-black text-emerald-600 underline">Créer</button></p>
      <p className="text-center text-sm"><button type="button" onClick={onForgot} className="text-emerald-600 underline">Mot de passe oublié ?</button></p>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </form>
  );
};

export default Login;
