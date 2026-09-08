import { useState, useEffect } from 'react';
import { authFetch } from '../utils/auth.js';
import Spinner, { ButtonSpinner } from '../components/Spinner.jsx';

// Page Feedback — prod activé pour users connectés
// Permet de reporter bug / idée / amélioration directement dans l'app (pas de mail)
const TYPE_LABELS = {
  bug: '🐛 Bug',
  idee: '💡 Idée',
  amelioration: '✨ Amélioration',
  autre: '💬 Autre',
};
const STATUS_LABELS = { open: 'Ouvert', done: 'Traité', wontfix: 'Non retenu' };
const STATUS_COLOR = { open: 'bg-amber-100 text-amber-800 border-amber-200', done: 'bg-emerald-100 text-emerald-800 border-emerald-200', wontfix: 'bg-zinc-100 text-zinc-600 border-zinc-200' };

const Feedback = ({ user }) => {
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const r = await authFetch('/api/feedbacks');
      if (r.ok) setItems(await r.json());
      else if (r.status === 404) setItems([]);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (message.trim().length < 10) { setErr('Message trop court (10 caractères min)'); return; }
    setSending(true);
    try {
      const r = await authFetch('/api/feedbacks', { method: 'POST', body: JSON.stringify({ type, message: message.trim() }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(b.error || 'envoi échoué'); return; }
      setOk('Merci pour ton retour !');
      setMessage('');
      load();
    } catch {
      setErr('erreur réseau');
    } finally { setSending(false); }
  };

  const updateStatus = async (id, status) => {
    const r = await authFetch(`/api/feedbacks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (r.ok) load();
  };
  const del = async (id) => {
    if (!confirm('Supprimer ce feedback ?')) return;
    const r = await authFetch(`/api/feedbacks/${id}`, { method: 'DELETE' });
    if (r.ok) load();
  };

  if (!user) {
    return (
      <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50">
        <p className="text-sm font-medium">Connecte-toi pour envoyer un feedback</p>
        <p className="text-xs text-zinc-500 mt-1">Bug, idée ou suggestion — directement dans l'app.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-lg dark:text-zinc-100">💬 Feedback</h2>
      </div>

      <form onSubmit={submit} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Type</label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {Object.entries(TYPE_LABELS).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setType(k)} className={`px-3 py-2 rounded-xl text-sm font-medium border-2 ${type === k ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'}`}>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décris le bug ou ton idée... (10-2000 caractères)" rows={4} maxLength={2000} className="mt-1.5 w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500" />
          <p className="text-[11px] text-zinc-400 text-right mt-1">{message.length}/2000</p>
        </div>
        {err && <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-2.5 rounded-xl">⚠️ {err}</p>}
        {ok && <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-2.5 rounded-xl">✅ {ok}</p>}
        <button type="submit" disabled={sending} className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">{sending && <ButtonSpinner />} {sending ? 'Envoi…' : 'Envoyer'}</button>
      </form>

      <div className="flex items-center justify-between pt-2">
        <h3 className="font-semibold text-sm dark:text-zinc-100">{isAdmin ? `Tous les feedbacks (${items.length})` : `Mes feedbacks (${items.length})`}</h3>
        <button onClick={load} disabled={loading} className="text-xs border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 inline-flex items-center gap-1.5">{loading && <Spinner size={12} />} Rafraîchir</button>
      </div>
      {loading && <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 py-4"><Spinner size={16} /> Chargement…</div>}
      {!loading && items.length === 0 && <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">Aucun feedback pour le moment.</p>}
      <div className="space-y-2">
        {items.map(f => (
          <div key={f.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-200">{TYPE_LABELS[f.type] || f.type}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[f.status] || STATUS_COLOR.open}`}>{STATUS_LABELS[f.status] || f.status}</span>
                <span className="text-[11px] text-zinc-500">{new Date(f.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <button onClick={() => del(f.id)} className="text-[11px] text-zinc-400 hover:text-red-500">Suppr</button>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-200 mt-2 whitespace-pre-wrap break-words">{f.message}</p>
            <p className="text-[11px] text-zinc-400 mt-1.5">{f.pseudo} · {f.email} {isAdmin && f.user_id !== user.id ? '' : ''}</p>
            {isAdmin && (
              <div className="flex gap-1.5 mt-2.5">
                {['open', 'done', 'wontfix'].map(s => (
                  <button key={s} onClick={() => updateStatus(f.id, s)} className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${f.status === s ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50'}`}>{STATUS_LABELS[s]}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feedback;
