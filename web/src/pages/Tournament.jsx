import { initials, avatarBg } from '../utils/helpers.js';

const BracketCard = ({ date, teamA, teamB, scoreA, scoreB }) => {
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null;
  const TeamRow = ({ team, score, isWinner }) => (
    <div className={`flex justify-between items-center ${isWinner ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
      <span className="flex items-center gap-1.5">
        <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarBg(team.pseudo)} text-white flex items-center justify-center text-[10px] font-bold`}>{initials(team.pseudo)}</span>
        <span className="truncate">{team.pseudo}</span>
      </span>
      <span className="flex items-center gap-1.5">{score} {isWinner && <span className="text-[10px]">◀</span>}</span>
    </div>
  );
  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 relative">
      <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{date}</span>
        <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full text-[10px]">Terminé</span>
      </div>
      <div className="mt-2 space-y-1.5 text-sm">
        <TeamRow team={teamA} score={scoreA} isWinner={winner==='A'} />
        <TeamRow team={teamB} score={scoreB} isWinner={winner==='B'} />
      </div>
    </div>
  );
};

const Tournament = ({ onBack }) => {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-xl p-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-amber-400 text-white flex items-center justify-center text-2xl mx-auto">🚧</div>
        <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mt-3">Tournoi — En chantier</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">On construit le mode tournoi. Bientôt disponible !</p>
        <div className="mt-4 flex justify-center">
          <span className="text-xs font-mono bg-zinc-900 dark:bg-zinc-700 text-white px-3 py-1 rounded-full">v0.9 • En développement</span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs">👁️</span>
          Aperçu — inspiration coupe
        </h3>

        <div className="mt-4 flex gap-3 items-center">
          <div className="flex-1 space-y-3">
            <BracketCard date="14/07" teamA={{ pseudo:'pierre_j' }} teamB={{ pseudo:'sarah_l' }} scoreA={5} scoreB={10} />
            <BracketCard date="15/07" teamA={{ pseudo:'tom_m' }} teamB={{ pseudo:'lucas' }} scoreA={7} scoreB={10} />
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center w-6 self-stretch">
            <div className="flex-1 w-px bg-zinc-300 dark:bg-zinc-600" />
            <div className="w-6 h-px bg-zinc-300 dark:bg-zinc-600 relative"><span className="absolute -right-1 -top-[5px] text-[8px] text-zinc-400">▶</span></div>
            <div className="flex-1 w-px bg-zinc-300 dark:bg-zinc-600" />
          </div>
          <div className="hidden sm:block w-3 h-px bg-zinc-300 dark:bg-zinc-600 -ml-3 relative"><span className="absolute -right-1 -top-[5px] text-[8px] text-zinc-400">▶</span></div>

          <div className="flex-1">
            <BracketCard date="19/07" teamA={{ pseudo:'sarah_l' }} teamB={{ pseudo:'lucas' }} scoreA={10} scoreB={6} />
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Match pour la 3ème place</p>
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
            <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>18/07</span>
              <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full text-[10px]">Terminé</span>
            </div>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5"><span className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarBg('pierre_j')} text-white flex items-center justify-center text-[10px] font-bold`}>{initials('pierre_j')}</span> pierre_j</span>
                <span>7</span>
              </div>
              <div className="flex justify-between items-center font-bold text-zinc-900 dark:text-zinc-100">
                <span className="flex items-center gap-1.5"><span className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarBg('tom_m')} text-white flex items-center justify-center text-[10px] font-bold`}>{initials('tom_m')}</span> tom_m</span>
                <span className="flex items-center gap-1.5">10 <span className="text-[10px]">◀</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs">🏅</span>
          À venir
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Solo / Duo — choisis ton format</li>
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Équipe choisie ou aléatoire (tirage)</li>
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Arbre à élimination + planning des matchs</li>
          <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs">○</span> Suivi en temps réel dans ta ligue</li>
        </ul>
        <div className="mt-4 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full w-[35%] bg-amber-400 rounded-full" />
        </div>
        <p className="text-xs text-zinc-500 mt-2 text-center">35% — maquettes prêtes, dev en cours</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex gap-2">
        <button onClick={() => onBack?.()} className="flex-1 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-2.5 rounded-xl font-medium text-sm">← Retour à l'accueil</button>
        <button onClick={() => (window.location.hash = '#roadmap')} className="flex-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">Voir la roadmap</button>
      </div>

      <p className="text-xs text-zinc-500 text-center">Une idée pour le tournoi ? Parles-en à l'équipe — on écoute !</p>
    </div>
  );
};

export default Tournament;
