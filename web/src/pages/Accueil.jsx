import { useState } from 'react';
import { posteColor, niveauColor, initials, avatarBg } from '../utils/helpers.js';

const Accueil = ({ players, onNav, user, ligue, onLigues, onRoadmap }) => {
  const [showCode, setShowCode] = useState(false);
  return (
    <div className="space-y-4">
      {user && ligue && (
        <div className="bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{ligue.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Ligue privée · {ligue.slug}</p>
              <div className="mt-2.5 flex items-center gap-2 text-xs flex-wrap">
                <span className="text-zinc-500">Code</span>
                {showCode ? (
                  <>
                    <span className="bg-zinc-900 dark:bg-zinc-700 text-white px-2.5 py-1 rounded-lg font-mono text-xs tracking-widest">{ligue.invite_code || ligue.inviteCode}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(ligue.invite_code || ligue.inviteCode); }} className="border border-zinc-200 dark:border-zinc-600 px-2.5 py-1 rounded-lg font-medium bg-white dark:bg-zinc-700 hover:bg-zinc-50">Copier</button>
                    <button onClick={() => setShowCode(false)} className="text-zinc-500 hover:text-zinc-700">Masquer</button>
                  </>
                ) : (
                  <button onClick={() => setShowCode(true)} className="border border-zinc-200 dark:border-zinc-600 px-2.5 py-1 rounded-lg font-medium bg-white dark:bg-zinc-700 hover:bg-zinc-50">Voir code</button>
                )}
              </div>
            </div>
            <button onClick={onLigues} className="border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 shrink-0">Changer</button>
          </div>
        </div>
      )}
      {user && !ligue && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-center">
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Aucune ligue</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Crée ta ligue ou rejoins avec un code.</p>
          <button onClick={onLigues} className="mt-3 bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-medium">Gérer mes ligues</button>
        </div>
      )}

      {user ? (
        <div className="bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-5">
          <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">Prêt à jouer ?</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Lance une partie, défie tes collègues.</p>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <button onClick={() => onNav('match')} className="bg-violet-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-violet-700">
              Créer un match
            </button>
            <button onClick={() => onNav('stats')} className="border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-3 rounded-xl font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
              Stats
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-xl p-5 text-center">
          <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">Prêt à jouer ?</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Connecte-toi pour créer un match ou une ligue.</p>
          <p className="text-xs text-zinc-500 mt-2">Compte de test : <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">demo@example.com / demo1234</span></p>
          <button onClick={() => onNav('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-violet-700">Connexion</button>
        </div>
      )}

      {user && (
        <button onClick={() => onNav('match')} className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-3 rounded-xl font-medium text-sm">Nouveau match — {user.pseudo}</button>
      )}

      {user && <button onClick={() => onNav('inscription')} className="w-full border border-dashed border-zinc-300 dark:border-zinc-600 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">+ Ajouter un joueur invité (sans compte)</button>}

      <button onClick={() => (onRoadmap ? onRoadmap() : onNav('roadmap'))} className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2">📋 Voir la roadmap</button>

      {!user ? (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Connecte-toi pour voir les joueurs</p>
          <p className="text-xs text-zinc-500 mt-1">La liste est privée à ta ligue.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pt-2">
            <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Joueurs inscrits
              <span className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-xs px-2 py-0.5 rounded-full font-medium">{players.length}</span>
            </h2>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-700">
            {players.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun joueur pour le moment</p>
                <p className="text-xs text-zinc-400 mt-1">Crée ton compte !</p>
              </div>
            )}
            {players.map(p => (
              <div key={p.id} className="p-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-sm">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${avatarBg(p.pseudo)} text-white flex items-center justify-center font-semibold text-xs`}>
                  {initials(p.pseudo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-sm">{p.pseudo}</div>
                  <div className="flex gap-1.5 mt-1">
                    {(p.poste === 'Attaque / Défense' || p.poste === 'Les 2') ? (
                      <>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${posteColor('Attaque')}`}>Attaque</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${posteColor('Défense')}`}>Défense</span>
                      </>
                    ) : (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${posteColor(p.poste)}`}>{p.poste}</span>
                    )}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${niveauColor(p.niveau)}`}>{p.niveau}</span>
                  </div>
                </div>
                <span className="text-zinc-300 dark:text-zinc-600">›</span>
              </div>
            ))}
          </div>
          <div className="h-10" />
        </>
      )}
    </div>
  );
};

export default Accueil;
