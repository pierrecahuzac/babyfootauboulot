import { posteColor, niveauColor, initials, avatarBg } from '../utils/helpers.js';

const PlayerDetail = ({ player, stats, matches, league, onBack, onSelectMatch }) => {
  if (!player) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Joueur introuvable</p>;

  const stat = stats?.find(s => s.pseudo === player.pseudo || s.id === player.id) || null;
  const victoires = stat?.victoires ?? 0;
  const defaites = stat?.defaites ?? 0;
  const ratio = stat?.ratio ?? 0;
  const total = stat?.total ?? victoires + defaites;
  const rank = stats ? stats.findIndex(s => s.pseudo === player.pseudo || s.id === player.id) + 1 : null;

  const createdAt = player.createdAt || player.created_at;
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  const isAnonymized = player.deleted || player.pseudo === 'Joueur supprimé';

  const playerMatches = (matches || []).filter(m => {
    const bleue = m.team_bleue ?? m.team_a ?? [];
    const rouge = m.team_rouge ?? m.team_b ?? [];
    const all = [...bleue, ...rouge];
    return all.some(p => p.pseudo === player.pseudo || p.id === player.id);
  }).slice(0, 10);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700">← Retour</button>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatarBg(player.pseudo)} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
            {initials(player.pseudo)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold text-lg truncate ${isAnonymized ? 'italic text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{player.pseudo}</h2>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {(player.poste === 'Attaque / Défense' || player.poste === 'Les 2') ? (
                <>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${posteColor('Attaque')}`}>Attaque</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${posteColor('Défense')}`}>Défense</span>
                </>
              ) : (
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${posteColor(player.poste)}`}>{player.poste}</span>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${niveauColor(player.niveau)}`}>{player.niveau}</span>
            </div>
          </div>
          {rank > 0 && (
            <span className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0" title={`Rang #${rank}`}>#{rank}</span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-600">
            <p className="text-xs tracking-wide font-semibold text-zinc-500 uppercase">Victoires</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{victoires}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-600">
            <p className="text-xs tracking-wide font-semibold text-zinc-500 uppercase">Défaites</p>
            <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mt-1">{defaites}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-600">
            <p className="text-xs tracking-wide font-semibold text-zinc-500 uppercase">Ratio</p>
            <p className="text-xl font-bold text-violet-600 mt-1">{ratio}%</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">{total} match{total !== 1 ? 's' : ''} joué{total !== 1 ? 's' : ''} {league ? `· Ligue ${league.name}` : ''}</p>
        <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 border-t border-zinc-100 dark:border-zinc-700 pt-3">
          {dateStr && <p>Membre depuis le {dateStr}</p>}
          {player.poste && <p>Poste : {player.poste}</p>}
          {player.niveau && <p>Niveau : {player.niveau}</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Derniers matchs</h3>
        {playerMatches.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 text-center py-4">Aucun match pour ce joueur</p>
        ) : (
          <div className="mt-3 space-y-2">
            {playerMatches.map(m => {
              const bleue = m.team_bleue ?? m.team_a ?? [];
              const rouge = m.team_rouge ?? m.team_b ?? [];
              const sBleue = m.score_bleue ?? m.score_a;
              const sRouge = m.score_rouge ?? m.score_b;
              const winBleue = Number(sBleue) > Number(sRouge);
              const winRouge = Number(sRouge) > Number(sBleue);
              const inBleue = bleue.some(t => t.pseudo === player.pseudo || t.id === player.id);
              const inRouge = rouge.some(t => t.pseudo === player.pseudo || t.id === player.id);
              const isWin = (inBleue && winBleue) || (inRouge && winRouge);
              const isDraw = Number(sBleue) === Number(sRouge);
              const d = m.created_at ?? m.createdAt;
              const date = d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';
              return (
                <div key={m.id} onClick={() => onSelectMatch?.(m)} className={`border rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${isDraw ? 'border-zinc-200 dark:border-zinc-700' : isWin ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{bleue.map(t => t.pseudo).join(' + ')} vs {rouge.map(t => t.pseudo).join(' + ')}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{m.format} · {date} · <span className={isDraw ? '' : isWin ? 'text-emerald-600 font-semibold' : 'text-zinc-500'}>{isDraw ? 'Nul' : isWin ? 'Victoire' : 'Défaite'}</span></p>
                  </div>
                  <span className="ml-3 font-semibold text-sm shrink-0">{sBleue} – {sRouge}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDetail;
