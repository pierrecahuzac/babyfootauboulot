import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const VerifyEmail = ({ user, onBack, onVerified }) => {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('verify') || '');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await fetch(`${API}/api/auth/verify-email`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk('Email vérifié !');
    if (b.token && b.user) onVerified(b);
  };
  const resend = async () => {
    setErr(''); setOk('');
    const r = await fetch(`${API}/api/auth/resend-verification`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email || user?.email }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk(b.verificationToken ? `Nouveau token (dev): ${b.verificationToken.slice(0,12)}…` : b.message);
    if (b.verificationToken) setToken(b.verificationToken);
  };
  return (
    <div className="space-y-4">
      <div className="text-center"><div className="text-4xl">✉️</div><h2 className="font-black text-xl">Vérifier ton email</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Colle le token reçu (dev: renvoyé à l'inscription)</p></div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-bold">Token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="token 64 hex" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
        {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
        <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black">Vérifier</button>
      </form>
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2 dark:bg-zinc-800 dark:text-zinc-100">
        <p className="text-sm font-black">Pas reçu ?</p>
        <label className="block text-sm">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" placeholder="toi@exemple.com" /></label>
        <button onClick={resend} className="w-full bg-amber-500 text-white py-3 rounded-2xl font-black">Renvoyer</button>
      </div>
      <button onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </div>
  );
};

export default VerifyEmail;
