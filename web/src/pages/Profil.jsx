import { useState, useEffect } from 'react';
import { authFetch, setToken } from '../utils/auth.js';

const Profil = ({ user, ligues, onUpdate, onLogout }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [poste, setPoste] = useState(user?.poste || 'Attaque');
  const [niveau, setNiveau] = useState(user?.niveau || 'Débutant');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deletePwd, setDeletePwd] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPseudo(user.pseudo || '');
      setPoste(user.poste || 'Attaque');
      setNiveau(user.niveau || 'Débutant');
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    const r = await authFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ email, pseudo, poste, niveau }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setMsg('Profil mis à jour');
    if (b.token) setToken(b.token);
    onUpdate(b.user || { email, pseudo, poste, niveau });
  };

  const changePwd = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    const r = await authFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setMsg('Mot de passe changé');
    setOldPassword(''); setNewPassword('');
  };

  const del = async () => {
    setErr(''); setMsg('');
    const r = await authFetch('/api/auth/me', { method: 'DELETE', body: JSON.stringify({ password: deletePwd }) });
    const b = await r.json().catch(()=>({}));
    if (!r.ok) { setErr(b.error || 'suppression échouée'); return; }
    setToken(null);
    window.location.reload();
  };

  if (!user) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Non connecté</p>;

  return (
    <div className="space-y-6">
      <h2 className="font-black text-xl flex items-center gap-2">👤 Mon profil</h2>

      <div className="bg-white border-2 border-zinc-100 rounded-3xl p-4 space-y-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <p className="font-black text-sm">Infos</p>
        <div className="text-xs text-zinc-600 space-y-1 dark:text-zinc-300">
          <p><span className="font-bold">ID:</span> {user.id}</p>
          <p><span className="font-bold">Créé:</span> {new Date(user.created_at || user.createdAt).toLocaleDateString()}</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block text-sm font-bold">Email
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          </label>
          <label className="block text-sm font-bold">Pseudo
            <input value={pseudo} onChange={e=>setPseudo(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          </label>
          <div className="text-sm font-bold">Poste
            <div className="flex gap-2 mt-1">
              {['Défense','Attaque','Les 2'].map(v=> (
                <button type="button" key={v} onClick={()=>setPoste(v)} className={`flex-1 py-2 rounded-xl border-2 font-black ${poste===v?'bg-emerald-500 text-white':'bg-white'}`}>{v}</button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-bold">Niveau
            <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
              <option value="Débutant">Débutant 🌱</option><option value="Intermédiaire">Intermédiaire ⚡</option><option value="Confirmé">Confirmé 🔥</option>
            </select>
          </label>
          <button className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-black">Enregistrer</button>
        </form>
      </div>

      <div className="bg-white border-2 border-zinc-100 rounded-3xl p-4 space-y-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <p className="font-black text-sm">🔑 Changer mot de passe</p>
        <form onSubmit={changePwd} className="space-y-3">
          <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="Ancien mot de passe" className="w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Nouveau (6+)" className="w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <button className="w-full bg-zinc-900 text-white py-3 rounded-2xl font-black dark:bg-zinc-700">Changer</button>
        </form>
      </div>

      <div className="bg-white border-2 border-zinc-100 rounded-3xl p-4 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <p className="font-black text-sm">🏆 Mes ligues ({ligues.length})</p>
        <div className="mt-2 space-y-2">
          {ligues.map(l=> (
            <div key={l.id} className="flex justify-between items-center text-sm border rounded-xl px-3 py-2">
              <span className="font-bold truncate">{l.name}</span>
              <span className="text-xs font-mono bg-zinc-900 text-white px-2 py-0.5 rounded-full dark:bg-zinc-700">{l.invite_code || l.inviteCode}</span>
            </div>
          ))}
          {ligues.length===0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">Aucune ligue</p>}
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4 space-y-3">
        <p className="font-black text-sm text-red-700">⚠️ Zone dangereuse</p>
        {!showDelete ? (
          <button onClick={()=>setShowDelete(true)} className="w-full bg-red-500 text-white py-3 rounded-2xl font-black">Supprimer mon compte</button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-red-700">Tape ton mot de passe pour confirmer. Tes ligues en tant que owner seront transférées ou supprimées.</p>
            <input type="password" value={deletePwd} onChange={e=>setDeletePwd(e.target.value)} placeholder="Mot de passe" className="w-full border-2 border-red-300 rounded-2xl px-3 py-2 dark:bg-zinc-800 dark:text-zinc-100" />
            <div className="flex gap-2">
              <button onClick={()=>setShowDelete(false)} className="flex-1 bg-white border-2 border-zinc-200 py-2 rounded-2xl font-bold dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">Annuler</button>
              <button onClick={del} className="flex-1 bg-red-600 text-white py-2 rounded-2xl font-black">Confirmer suppression</button>
            </div>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {msg}</p>}
    </div>
  );
};

export default Profil;
