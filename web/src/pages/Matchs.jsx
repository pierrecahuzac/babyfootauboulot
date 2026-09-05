const Matchs = ({ matches, onSelect }) => {
  if (!matches) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Chargement des matchs…</p>;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">Derniers matchs</h2>
        <div className="space-y-2 mt-3">
          {matches.map(m=>{
            const bleue = m.team_bleue ?? m.team_a;
            const rouge = m.team_rouge ?? m.team_b;
            const sBleue = m.score_bleue ?? m.score_a;
            const sRouge = m.score_rouge ?? m.score_b;
            const winBleue = Number(sBleue) > Number(sRouge);
            const winRouge = Number(sRouge) > Number(sBleue);
            const borderCls = winBleue ? 'border-sky-300 dark:border-sky-800' : winRouge ? 'border-rose-300 dark:border-rose-800' : 'border-zinc-200 dark:border-zinc-700';
            const fmt = (t) => {
              if (m.format === '1v1' || !t.poste) return t.pseudo;
              return `${t.pseudo}${t.poste ? ` ${t.poste==='Attaque'?'· Att':'Att'===t.poste?'· Att':t.poste==='Défense'?'· Déf':'·'}` : ''}`;
            };
            const d = m.created_at ?? m.createdAt ?? m.created_at;
            const dateStr = d ? new Date(d).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
            const formatLabel = m.format === '1v1' ? 'Solo' : m.format === '2v2' ? 'Duo' : (m.format || '');
            return (
            <div key={m.id} onClick={()=>onSelect?.(m)} className={`border rounded-xl p-3.5 bg-white dark:bg-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition ${borderCls}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-medium flex-1 min-w-0">
                  <span className="px-2.5 py-1 rounded-full text-xs truncate border bg-sky-500 text-white border-sky-500">{bleue.map(fmt).join(' + ')}</span>
                  <span className="text-zinc-400 text-xs">vs</span>
                  <span className="px-2.5 py-1 rounded-full text-xs truncate border bg-rose-500 text-white border-rose-500">{rouge.map(fmt).join(' + ')}</span>
                </div>
                <span className="ml-3 flex items-center gap-1 shrink-0">
                  <span className="font-semibold px-2.5 py-1 rounded-lg text-sm border bg-sky-50 text-sky-700 border-sky-200">{sBleue}</span>
                  <span className="text-zinc-400">–</span>
                  <span className="font-semibold px-2.5 py-1 rounded-lg text-sm border bg-rose-50 text-rose-700 border-rose-200">{sRouge}</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">{[formatLabel, dateStr].filter(Boolean).join(' · ')}</p>
            </div>
          )})}
          {matches.length===0 && <p className="text-xs text-zinc-400 text-center py-4">Aucun match joué</p>}
        </div>
      </div>
      <div className="h-10" />
    </div>
  );
};

export default Matchs;
