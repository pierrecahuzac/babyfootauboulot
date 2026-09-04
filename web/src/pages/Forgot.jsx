import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const Forgot = ({ onBack, onReset }) => {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [token, setToken] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk(''); setToken('');
    const r = await fetch(`${API}/api/auth/forgot`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    if (b.resetToken) {
      setToken(b.resetToken);
      setOk(`Token (dev): ${b.resetToken.slice(0,12)}… — copie-le pour reset`);
    } else setOk(b.message || 'Si ce compte existe, un email a été envoyé');
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center"><div className="text-4xl">📧</div><h2 className="font-black text-xl">Mot de passe oublié</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Entre ton email</p></div>
      <label className="block text-sm font-bold">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
      {token && <button type="button" onClick={()=>onReset(token)} className="w-full bg-amber-500 text-white py-3 rounded-2xl font-black">Aller au reset →</button>}
      <button className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black dark:bg-zinc-700">Envoyer</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour connexion</button>
    </form>
  );
};

export default Forgot;
