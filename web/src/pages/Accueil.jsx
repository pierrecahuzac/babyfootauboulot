import { useState } from 'react';
import { posteColor, niveauColor, initials, avatarBg } from '../utils/helpers.js';

const Accueil = ({ players, onNav, user, ligue, onLigues }) => {
  const [showCode, setShowCode] = useState(false);
  return (
    <div className="space-y-5">
      {user && ligue && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-4 text-white shadow">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <p className="font-black text-sm">🏆 {ligue.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="opacity-80">Code privé :</span>
                {showCode ? (
                  <>
                    <span className="bg-white text-violet-700 px-2 py-0.5 rounded-full font-mono font-black tracking-widest dark:bg-zinc-800">{ligue.invite_code || ligue.inviteCode}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(ligue.invite_code || ligue.inviteCode); }} className="bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-bold">Copier</button>
                    <button onClick={() => setShowCode(false)} className="opacity-60">Masquer</button>
                  </>
                ) : (
                  <button onClick={() => setShowCode(true)} className="bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-bold">👁️ Voir code</button>
                )}
              </div>
              <p className="text-[11px] opacity-60 mt-1">Donne-le en main propre / WhatsApp — ligue privée</p>
            </div>
            <button onClick={onLigues} className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shrink-0">Changer</button>
          </div>
        </div>
      )}
      {user && !ligue && (
        <div className="bg-amber-100 border-2 border-amber-300 rounded-3xl p-4 text-center">
          <p className="font-black text-amber-900">Aucune ligue</p>
          <p className="text-xs text-amber-800">Crée ta ligue privée ou rejoins avec un code.</p>
          <button onClick={onLigues} className="mt-2 bg-amber-500 text-white px-4 py-2 rounded-2xl font-black">Gérer mes ligues</button>
        </div>
      )}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-7xl opacity-10 rotate-12">⚽</div>
        <h2 className="font-black text-lg leading-tight">Prêt à jouer ?</h2>
        <p className="text-sm opacity-90 mt-1">Lance une partie, défie tes collègues !</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => onNav('match')} className="bg-white text-emerald-700 py-3 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-1 dark:bg-zinc-800">
            <span>⚔️</span> Créer un match
          </button>
          <button onClick={() => onNav('stats')} className="bg-emerald-900/20 backdrop-blur text-white border border-white/30 py-3 rounded-2xl font-bold hover:bg-white/20 transition">
            📊 Stats
          </button>
        </div>
      </div>

      {!user ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <p className="font-black text-amber-900 text-sm">🔒 Sécurisé — email + mot de passe</p>
            <p className="text-xs text-amber-800">Crée ton compte pour jouer, ton pseudo est réservé.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNav('login')} className="flex-1 bg-white border-2 border-amber-300 py-2.5 px-4 rounded-2xl font-bold text-amber-900 dark:bg-zinc-800 dark:text-zinc-100">Connexion</button>
            <button onClick={() => onNav('register')} className="flex-1 bg-gradient-to-r from-amber-400 to-orange-400 py-2.5 px-4 rounded-2xl font-black text-amber-950">Créer compte</button>
          </div>
        </div>
      ) : (
        <button onClick={() => onNav('match')} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl font-black shadow">⚔️ Nouveau match en tant que {user.pseudo}</button>
      )}

      <button onClick={() => onNav('inscription')} className="w-full bg-zinc-100 py-2.5 rounded-2xl text-sm font-bold border-2 border-zinc-200 dark:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-100 dark:bg-zinc-800">👤 + Ajouter un joueur invité (sans compte)</button>

      <div className="flex items-center justify-between">
        <h2 className="font-black text-zinc-800 flex items-center gap-2 dark:text-zinc-100">
          <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
          Joueurs inscrits
          <span className="bg-zinc-900 text-white text-xs px-2 py-0.5 rounded-full dark:bg-zinc-700">{players.length}</span>
        </h2>
      </div>

      <div className="border-2 border-zinc-100 rounded-3xl overflow-hidden bg-white shadow-sm divide-y divide-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        {players.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">🤸</div>
            <p className="text-sm text-zinc-500 font-medium dark:text-zinc-400">Aucun joueur pour le moment</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-400">Crée ton compte !</p>
          </div>
        )}
        {players.map(p => (
          <div key={p.id} className="p-3.5 flex items-center gap-3 hover:bg-zinc-50 transition text-sm dark:hover:bg-zinc-800">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarBg(p.pseudo)} text-white flex items-center justify-center font-black text-xs shadow`}>
              {initials(p.pseudo)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-zinc-900 truncate dark:text-zinc-100">{p.pseudo}</div>
              <div className="flex gap-1.5 mt-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${posteColor(p.poste)}`}>{p.poste}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${niveauColor(p.niveau)}`}>{p.niveau}</span>
              </div>
            </div>
            <span className="text-zinc-300">›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Accueil;
