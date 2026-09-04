import { useState, useEffect } from 'react';
import { authFetch } from '../utils/auth.js';

const Admin = ({ user, onBack }) => {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('');
  const isBlocked = (pseudo) => {
    const blocked = ['hitler','nazi','facho','raciste','antisemite'];
    const norm = pseudo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    return blocked.some(w => norm.includes(w));
  };
  const load = async () => {
    setErr(''); setMsg('');
    const r = await authFetch('/api/admin/users');
    if (!r.ok) { setErr((await r.json()).error || 'accès refus'); return; }
    setUsers(await r.json());
  };
  useEffect(()=>{ if(user?.role==='admin') load(); },[user]);
  const changeRole = async (id, role) => {
    setErr(''); setMsg('');
    const r = await authFetch(`/api/admin/users/${id}/role`, { method:'PATCH', body: JSON.stringify({ role }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setMsg(`Role ${b.pseudo} -> ${b.role}`);
    load();
  };
  const del = async (id, pseudo) => {
    if (!confirm(`Supprimer ${pseudo} ?`)) return;
    const r = await authFetch(`/api/admin/users/${id}`, { method:'DELETE' });
    if (!r.ok) { setErr((await r.json()).error); return; }
    setMsg(`Supprimé ${pseudo}`);
    load();
  };
  if (user?.role!=='admin') return <div className="p-8 text-center"><p className="font-black dark:text-zinc-100">🔒 Admin requis</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Connecte-toi avec admin@example.com</p><button onClick={onBack} className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">← Retour</button></div>;
  const sorted = [...users].sort((a,b)=> (b.role==='admin') - (a.role==='admin'));
  const filtered = sorted.filter(u => !filter || u.pseudo.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()));
  const flagged = users.filter(u => isBlocked(u.pseudo));
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-black text-xl dark:text-zinc-100">🛡️ Admin — Modération</h2><button onClick={onBack} className="text-sm text-zinc-500 dark:text-zinc-400">← Retour</button></div>
      <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-3 text-xs dark:text-amber-200">Comptes: {users.length} • Signalés: {flagged.length} • Tous les pseudos sont vérifiés côté serveur (blocklist). Filtre client ci-dessous à titre indicatif.</div>
      {flagged.length>0 && <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-2xl p-3 space-y-2"><p className="font-black text-sm text-red-700 dark:text-red-300">⚠️ Pseudos à modérer ({flagged.length})</p>{flagged.map(u=><div key={u.id} className="flex justify-between items-center text-sm bg-white dark:bg-zinc-700 rounded-xl px-3 py-2 dark:text-zinc-100"><span className="font-bold">{u.pseudo} <span className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</span></span><button onClick={()=>del(u.id, u.pseudo)} className="bg-red-500 text-white px-3 py-1 rounded-full font-bold">Bannir</button></div>)}</div>}
      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="filtrer pseudo/email" className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
      {err && <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 rounded-2xl">⚠️ {err}</p>}
      {msg && <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-3 rounded-2xl">✅ {msg}</p>}
      <div className="space-y-2">
        {filtered.map(u=>(
          <div key={u.id} className={`p-3 rounded-2xl border-2 flex justify-between items-center ${u.role==='admin'?'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700':'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate flex items-center gap-2 dark:text-zinc-100">{u.pseudo} {u.role==='admin' && <span className="bg-zinc-900 dark:bg-zinc-700 text-white text-[10px] px-2 py-0.5 rounded-full">ADMIN</span>} {isBlocked(u.pseudo) && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">À MODÉRER</span>}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{u.email} • {u.poste} • {u.niveau} {u.emailVerified?'• ✓':'• ✗'}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role==='admin'?'bg-amber-400 text-amber-950':'bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-100 border dark:border-zinc-600'}`}>{u.role}</span>
              <button onClick={()=>del(u.id, u.pseudo)} className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">Suppr</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={load} className="w-full bg-zinc-900 dark:bg-zinc-700 text-white py-3 rounded-2xl font-black">Rafraîchir</button>
    </div>
  );
};

export default Admin;
