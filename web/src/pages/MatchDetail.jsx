const MatchDetail = ({ match, onBack, ligue }) => {
  if (!match) return <p className="text-sm text-zinc-500">Match introuvable</p>;
  const bleue = match.team_bleue ?? match.team_a ?? [];
  const rouge = match.team_rouge ?? match.team_b ?? [];
  const sBleue = match.score_bleue ?? match.score_a ?? 0;
  const sRouge = match.score_rouge ?? match.score_b ?? 0;
  const winBleue = sBleue > sRouge;
  const winRouge = sRouge > sBleue;
  const isDraw = sBleue === sRouge;
  const d = match.created_at ?? match.createdAt;
  const dateStr = d ? new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' }) : '';
  const formatLabel = match.format === '1v1' ? 'Solo (1v1)' : match.format === '2v2' ? 'Duo (2v2)' : match.format;

  const winnerText = isDraw ? 'Égalité' : winBleue ? 'Victoire Bleue' : 'Victoire Rouge';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700">← Retour à la liste des matchs</button>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-zinc-500">Match #{match.id}</p>
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mt-1">{formatLabel}</h2>
            <p className="text-xs text-zinc-500 mt-1">{[formatLabel, dateStr].filter(Boolean).join(' · ')}</p>
            {ligue && <p className="text-xs text-zinc-500 mt-1">Ligue : <span className="font-medium text-zinc-700 dark:text-zinc-300">{ligue.name}</span></p>}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isDraw ? 'bg-zinc-100 text-zinc-700 border-zinc-200' : winBleue ? 'bg-sky-500 text-white border-sky-500' : 'bg-rose-500 text-white border-rose-500'}`}>{winnerText}</span>
        </div>

        <div className="mt-5 grid grid-cols-3 items-center gap-2">
          <div className={`rounded-xl border p-3 text-center ${winBleue ? 'bg-sky-50 border-sky-200 dark:bg-sky-950/20' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}>
            <p className="text-xs font-semibold tracking-wide uppercase text-sky-700">Bleue</p>
            <div className="mt-2 space-y-1">
              {bleue.map((p, i) => (
                <p key={i} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.pseudo}{match.format !== '1v1' && p.poste ? <span className="text-xs text-zinc-500"> · {p.poste}</span> : null}</p>
              ))}
            </div>
            <p className="mt-3 text-2xl font-bold text-sky-700">{sBleue}</p>
          </div>

          <p className="text-center text-zinc-400 font-medium">—</p>

          <div className={`rounded-xl border p-3 text-center ${winRouge ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}>
            <p className="text-xs font-semibold tracking-wide uppercase text-rose-700">Rouge</p>
            <div className="mt-2 space-y-1">
              {rouge.map((p, i) => (
                <p key={i} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.pseudo}{match.format !== '1v1' && p.poste ? <span className="text-xs text-zinc-500"> · {p.poste}</span> : null}</p>
              ))}
            </div>
            <p className="mt-3 text-2xl font-bold text-rose-700">{sRouge}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 rounded-full px-3 py-1.5 text-sm font-semibold bg-white dark:bg-zinc-800">
            <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-lg">{sBleue}</span>
            <span className="text-zinc-400">:</span>
            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg">{sRouge}</span>
          </span>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Détails</p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Format : {formatLabel}</li>
          <li>Date : {dateStr || '—'}</li>
          <li className={isDraw ? '' : winBleue ? 'text-sky-700 font-medium' : 'text-rose-700 font-medium'}>{winnerText}</li>
        </ul>
      </div>
    </div>
  );
};

export default MatchDetail;
