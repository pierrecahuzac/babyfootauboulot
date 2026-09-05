import roadmap from './roadmap.json';

const Roadmap = () => {
  const todos = roadmap;
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm">📋</span>
          Roadmap
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Publique — visible par tous, sans connexion.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-700">
        {todos.map((t, i) => (
          <div key={i} className="p-3.5 flex items-center gap-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.done ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>{t.done ? '✓' : '○'}</span>
            <span className={`flex-1 text-sm ${t.done ? 'text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100 font-medium'}`}>{t.label}</span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${t.type==='revision' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20' : t.type==='bugfix' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600'}`}>v{t.version}</span>
            {t.badge && <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold">{t.badge}</span>}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600">feature</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">revision</span>
        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">bugfix</span>
      </div>
      <p className="text-xs text-zinc-500 text-center">Tournoi à venir : Solo/Duo, équipes choisies ou aléatoires, arbre à élimination.</p>
    </div>
  );
};

export default Roadmap;
