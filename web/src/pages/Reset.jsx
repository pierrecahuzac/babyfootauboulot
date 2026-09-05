import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const Reset = ({ onBack, onDone, initialToken }) => {
  const [token, setToken] = useState(() => initialToken || new URLSearchParams(window.location.search).get('reset') || '');
  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has('reset') || p.has('token')) window.history.replaceState({}, '', window.location.pathname);
  }, []);
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await fetch(`${API}/api/auth/reset`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({ token, newPassword: pwd }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk('Mot de passe réinitialisé — connecte-toi');
    setTimeout(()=>onDone(), 1200);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center"><div className="text-4xl">🔐</div><h2 className="font-black text-xl">Réinitialiser</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Token + nouveau mdp (6+)</p></div>
      <label className="block text-sm font-bold">Token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="colle le token" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
      <label className="block text-sm font-bold">Nouveau mot de passe<input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
      <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black">Réinitialiser</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </form>
  );
};

export default Reset;
