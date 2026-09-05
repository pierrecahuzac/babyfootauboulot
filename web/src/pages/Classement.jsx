const Classement = ({ classement, ligues, currentLigue, onSelectLigue, onHandleLigueChange }) => {
  if (!classement) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Chargement du classement…</p>;
 
  return (
    <div className="space-y-6">
      <div className="mb-3">
        <select value={currentLigue || ''} onChange={(e)=>onHandleLigueChange(e.target.value)} className="w-full border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300">
          <option value="">— Ligue —</option>
          {ligues.map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs">🏆</span> Classement
        </h2>
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-700 bg-white dark:bg-zinc-800 mt-3">
          {classement.length===0 && <p className="p-8 text-sm text-zinc-500 text-center">Pas encore de matchs — lance le premier !</p>}
          {classement.map((p,i)=>{
            const isTop = i < 3;
            const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `#${i+1}`;
            return (
              <div key={p.id} className={`p-3.5 flex justify-between items-center text-sm ${isTop ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-800'}`}>
                <span className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium ${i===0 ? 'bg-amber-100 text-amber-800' : i===1 ? 'bg-zinc-100 text-zinc-700' : i===2 ? 'bg-orange-100 text-orange-800' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>{medal}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.pseudo}</span>
                </span>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-700">{p.victoires}V · {p.defaites}D · {p.ratio}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-10" />
    </div>
  );
};

export default Classement;
