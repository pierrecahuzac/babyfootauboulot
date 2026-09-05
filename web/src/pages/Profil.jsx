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
    <div className="space-y-5">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Mon profil</h2>

      <div className="bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
        <p className="font-semibold text-sm">Infos</p>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
          <p>ID: {user.id} · Créé le {new Date(user.created_at || user.createdAt).toLocaleDateString()}</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block text-sm font-medium">Email
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 bg-white dark:bg-zinc-800 dark:text-zinc-100" required />
          </label>
          <label className="block text-sm font-medium">Pseudo
            <input value={pseudo} onChange={e=>setPseudo(e.target.value)} className="mt-1 w-full border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 bg-white dark:bg-zinc-800 dark:text-zinc-100" required />
          </label>
          <div className="text-sm font-medium">Poste
            <div className="flex gap-2 mt-1">
              {['Défense','Attaque','Attaque / Défense'].map(v=> (
                <button type="button" key={v} onClick={()=>setPoste(v)} className={`flex-1 py-2 rounded-lg border font-medium text-sm ${poste===v?'bg-violet-600 text-white border-violet-600':'bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600'}`}>{v}</button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-medium">Niveau
            <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1 w-full border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-800 text-sm">
              <option value="Débutant">Débutant</option><option value="Intermédiaire">Intermédiaire</option><option value="Confirmé">Confirmé</option>
            </select>
          </label>
          <button className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-violet-700">Enregistrer</button>
        </form>
      </div>

      <div className="bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
        <p className="font-semibold text-sm">Changer mot de passe</p>
        <form onSubmit={changePwd} className="space-y-3">
          <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="Ancien mot de passe" className="w-full border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-800" required />
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Nouveau (6+)" className="w-full border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-800" required />
          <button className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-2.5 rounded-xl font-medium text-sm">Changer</button>
        </form>
      </div>

      <div className="bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-4">
        <p className="font-semibold text-sm">Mes ligues ({ligues.length})</p>
        <div className="mt-3 space-y-2">
          {ligues.map(l=> (
            <div key={l.id} className="flex justify-between items-center text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-zinc-50 dark:bg-zinc-700/50">
              <span className="font-medium truncate">{l.name}</span>
              <span className="text-xs font-mono bg-zinc-900 dark:bg-zinc-600 text-white px-2 py-1 rounded-full">{l.invite_code || l.inviteCode}</span>
            </div>
          ))}
          {ligues.length===0 && <p className="text-xs text-zinc-500">Aucune ligue</p>}
        </div>
      </div>

      <div className="bg-white border border-red-200 dark:border-red-900 rounded-xl p-4 space-y-3">
        <p className="font-semibold text-sm text-red-700 dark:text-red-400">Zone dangereuse</p>
        {!showDelete ? (
          <button onClick={()=>setShowDelete(true)} className="w-full bg-white border border-red-200 text-red-700 py-2.5 rounded-xl font-medium text-sm hover:bg-red-50">Supprimer mon compte</button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Tape ton mot de passe pour confirmer.</p>
            <input type="password" value={deletePwd} onChange={e=>setDeletePwd(e.target.value)} placeholder="Mot de passe" className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm" />
            <div className="flex gap-2">
              <button onClick={()=>setShowDelete(false)} className="flex-1 bg-white border border-zinc-200 py-2 rounded-lg font-medium text-sm">Annuler</button>
              <button onClick={del} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium text-sm">Confirmer suppression</button>
            </div>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">⚠️ {err}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">✓ {msg}</p>}
    </div>
  );
};

export default Profil;
