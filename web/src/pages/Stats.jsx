const Stats = ({ classement, matches }) => {
  if (!classement) return <p className="text-sm text-zinc-500 animate-pulse dark:text-zinc-400">Chargement des stats... ✨</p>;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-lg text-zinc-900 flex items-center gap-2 dark:text-zinc-100">
          <span className="bg-amber-400 text-white w-8 h-8 rounded-xl flex items-center justify-center">🏆</span> Classement
        </h2>
        <div className="border-2 border-zinc-100 rounded-3xl overflow-hidden divide-y divide-zinc-100 mt-3 shadow-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
          {classement.length===0 && <p className="p-8 text-sm text-zinc-500 text-center dark:text-zinc-400">Pas encore de matchs — lance le premier ! 🚀</p>}
          {classement.map((p,i)=>{
            const podium = i===0 ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white shadow border-amber-300' : i===1 ? 'bg-gradient-to-r from-zinc-300 to-zinc-400 text-white' : i===2 ? 'bg-gradient-to-r from-amber-700 to-orange-700 text-white' : 'bg-white';
            const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `#${i+1}`;
            return (
              <div key={p.id} className={`p-3.5 flex justify-between items-center text-sm ${podium} ${i<3 ? 'font-black border-2' : ''}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i<3 ? 'bg-white/25 backdrop-blur' : 'bg-zinc-100 text-zinc-600'}`}>{medal}</span>
                  <span className={`${i<3 ? '' : 'text-zinc-800'} truncate`}>{p.pseudo}</span>
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${i<3 ? 'bg-white/90 text-zinc-800' : 'bg-zinc-900 text-white'}`}>{p.victoires}V · {p.defaites}D · {p.ratio}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-black text-zinc-900 flex items-center gap-2 dark:text-zinc-100">🕰️ Derniers matchs</h2>
        <div className="space-y-3 mt-3">
          {matches.slice(0,10).map(m=>{
            const bleue = m.team_bleue ?? m.team_a;
            const rouge = m.team_rouge ?? m.team_b;
            const sBleue = m.score_bleue ?? m.score_a;
            const sRouge = m.score_rouge ?? m.score_b;
            const winBleue = sBleue > sRouge;
            const fmt = (t) => `${t.pseudo}${t.poste ? ` ${t.poste==='Attaque'?'⚡':t.poste==='Défense'?'🛡️':'↔'}` : ''}`;
            return (
            <div key={m.id} className="border-2 border-zinc-100 rounded-3xl p-3.5 flex justify-between items-center bg-white shadow-sm hover:shadow-md transition dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
              <div className="flex items-center gap-2 text-sm font-bold flex-1 min-w-0">
                <span className={`px-2.5 py-1 rounded-full text-xs truncate ${winBleue ? 'bg-blue-500 text-white shadow' : 'bg-blue-50 text-blue-700'}`}>{bleue.map(fmt).join(' + ')}</span>
                <span className="text-zinc-300 font-black">vs</span>
                <span className={`px-2.5 py-1 rounded-full text-xs truncate ${!winBleue ? 'bg-red-500 text-white shadow' : 'bg-red-50 text-red-700'}`}>{rouge.map(fmt).join(' + ')}</span>
              </div>
              <span className={`ml-3 font-black px-3 py-1.5 rounded-2xl text-sm shrink-0 ${winBleue ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>{sBleue}-{sRouge}</span>
            </div>
          )})}
          {matches.length===0 && <p className="text-xs text-zinc-400 text-center py-4 dark:text-zinc-400">Aucun match joué</p>}
        </div>
      </div>
    </div>
  );
};

export default Stats;
