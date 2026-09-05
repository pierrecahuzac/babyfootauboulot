import { useEffect, useState } from 'react';
import { getToken, setToken, authFetch } from './utils/auth.js';
import Accueil from './pages/Accueil.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Forgot from './pages/Forgot.jsx';
import Reset from './pages/Reset.jsx';
import Ligues from './pages/Ligues.jsx';
import Profil from './pages/Profil.jsx';
import Inscription from './pages/Inscription.jsx';
import CreateMatch from './pages/CreateMatch.jsx';
import Stats from './pages/Stats.jsx';
import MatchDetail from './pages/MatchDetail.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Admin from './pages/Admin.jsx';

const API = import.meta.env.VITE_API_URL || '';

const App = () => {
  const [view, setView] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('reset')) return 'reset';
    const h = (window.location.hash || '').replace(/^#/, '');
    if (h === 'register' || h === 'inscription') return 'register';
    return 'accueil';
  });
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [ligues, setLigues] = useState([]);
  const [currentLigue, setCurrentLigue] = useState(() => {
    const v = localStorage.getItem('babyfoot_ligue_id');
    return v ? Number(v) : null;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('babyfoot_theme') || 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('babyfoot_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const [pendingResetToken, setPendingResetToken] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);

  // nettoie les tokens dans l'URL (anti Referer/history leak R7) + gère #register/#inscription depuis landing
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has('reset') || p.has('token')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    const handleHash = () => {
      const h = (window.location.hash || '').replace(/^#/, '');
      if (h === 'register' || h === 'inscription') setView('register');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const refresh = async (ligueId = currentLigue) => {
    const q = ligueId ? `?ligue_id=${ligueId}` : '';
    const [p, s] = await Promise.all([
      authFetch(`/api/players${q}`).then(r => r.json()).catch(()=>[]),
      authFetch(`/api/stats${q}`).then(r => r.json()).catch(()=>({ classement: [], matches: [] })),
    ]);
    setPlayers(Array.isArray(p) ? p : []);
    setStats(s.classement ?? []);
    setMatches(s.matches ?? []);
  };

  const loadMe = async () => {
    try {
      const r = await authFetch('/api/auth/me');
      if (!r.ok) { setToken(null); setUser(null); return; }
      setUser(await r.json());
    } catch { setUser(null); }
  };

  const loadLigues = async () => {
    if (!getToken()) { setLigues([]); return; }
    try {
      const r = await authFetch('/api/ligues');
      if (r.ok) {
        const data = await r.json();
        setLigues(data);
        if (data.length && !currentLigue) {
          const first = data[0].id;
          setCurrentLigue(first);
          localStorage.setItem('babyfoot_ligue_id', String(first));
        }
      }
    } catch {}
  };

  useEffect(() => { refresh(); loadMe(); }, []);
  useEffect(() => { if (user) loadLigues(); }, [user]);
  useEffect(() => {
    if (currentLigue) {
      localStorage.setItem('babyfoot_ligue_id', String(currentLigue));
      refresh(currentLigue);
    } else {
      refresh(null);
    }
  }, [currentLigue]);

  const logout = async () => {
    await authFetch('/api/auth/logout', { method: 'POST' }).catch(()=>{});
    setToken(null);
    setUser(null);
    setLigues([]);
    setCurrentLigue(null);
    localStorage.removeItem('babyfoot_ligue_id');
    setView('accueil');
  };

  const onAuth = async (data) => {
    setToken(data.token);
    setUser(data.user);
    await loadLigues();
    setView('ligues');
  };

  const selectLigue = (id) => {
    setCurrentLigue(Number(id));
    setView('accueil');
  };

  const protectedViews = new Set(['match','stats','ligues','profil','admin','inscription','matchDetail']);
  const safeSetView = (v) => {
    if (protectedViews.has(v) && !user) { setView('login'); return; }
    setView(v);
  };
  const openMatch = (m) => { setSelectedMatch(m); safeSetView('matchDetail'); };

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 ${theme==='dark' ? 'dark' : ''}`}>
      <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-900 flex flex-col relative dark:text-zinc-100 border-x border-zinc-200 dark:border-zinc-800">
        <header className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-4 sm:px-5 py-4 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => safeSetView('accueil')}>
            <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm">⚽</span>
            <div>
              <h1 className="font-semibold text-[15px] tracking-tight leading-none">BABYFOOT</h1>
              <p className="text-[10px] tracking-[0.14em] text-zinc-500 dark:text-zinc-400 font-medium -mt-0.5">AU BOULOT</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme} className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700" title={theme==='dark' ? 'Passer en clair' : 'Passer en sombre'}>{theme==='dark' ? '☀️' : '🌙'}</button>
            {user ? (
              <>
                <button
                  onClick={() => safeSetView(user.role === 'admin' ? 'admin' : 'profil')}
                  title={user.role === 'admin' ? 'Admin' : 'Profil'}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border inline-flex items-center gap-1 ${user.role === 'admin' ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'}`}
                >
                  {user.pseudo}
                </button>
                <button onClick={logout} className="text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-1.5 rounded-full font-medium">Déconnexion</button>
              </>
            ) : (
              <>
                <button onClick={() => setView('login')} className="text-xs border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-full font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">Connexion</button>
                <button onClick={() => setView('register')} className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-full font-medium hover:bg-violet-700">Créer compte</button>
              </>
            )}
          </div>
        </header>

        {user && <div className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 px-5 py-2 text-xs text-zinc-600 dark:text-zinc-400 flex justify-between"><span>{user.pseudo} · {user.poste} · {user.niveau}</span><span className="hidden sm:inline text-zinc-500">{user.email}</span></div>}
        {user && (
          <div className="px-4 sm:px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide text-[11px] uppercase">Ligue</span>
            <select value={currentLigue || ''} onChange={e=>selectLigue(e.target.value)} className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 bg-white dark:bg-zinc-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300">
              <option value="">— choisir —</option>
              {ligues.map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button onClick={()=>setView('ligues')} className="border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg font-medium text-xs hover:bg-zinc-50">Gérer</button>
          </div>
        )}

        <main className="p-4 sm:p-5 flex-1 pb-36 bg-white dark:bg-zinc-900">
          {view === 'accueil' && <Accueil players={players} onNav={safeSetView} user={user} ligue={ligues.find(l=>l.id===currentLigue)} onLigues={()=>safeSetView('ligues')} onRoadmap={()=>setView('roadmap')} />}
          {view === 'inscription' && (user ? <Inscription onDone={() => { refresh(); safeSetView('accueil'); }} onBack={() => safeSetView('accueil')} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Connecte-toi pour ajouter un invité</p><p className="text-xs text-zinc-500 mt-1">Compte de test : <span className="font-mono">demo@example.com / demo1234</span></p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'register' && <Register onAuth={onAuth} onBack={() => safeSetView('accueil')} onSwitch={() => setView('login')} />}
          {view === 'login' && <Login onAuth={onAuth} onBack={() => safeSetView('accueil')} onSwitch={() => setView('register')} onForgot={()=>setView('forgot')} />}
          {view === 'forgot' && <Forgot onBack={()=>setView('login')} onReset={(t)=>{ if(t) setPendingResetToken(t); setView('reset'); }} />}
          {view === 'reset' && <Reset initialToken={pendingResetToken} onBack={()=>setView('login')} onDone={()=>{ setPendingResetToken(''); setView('login'); }} />}
          {view === 'profil' && (user ? <Profil user={user} ligues={ligues} onUpdate={(u)=>setUser(u)} onLogout={logout} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Connecte-toi pour voir ton profil</p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'admin' && (user && user.role==='admin' ? <Admin user={user} onBack={()=>safeSetView('accueil')} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Accès admin requis — connecte-toi</p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'ligues' && (user ? <Ligues ligues={ligues} currentLigue={currentLigue} onSelect={selectLigue} onRefresh={loadLigues} user={user} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Connecte-toi pour gérer tes ligues</p><p className="text-xs text-zinc-500 mt-1">Compte de test : <span className="font-mono">demo@example.com / demo1234</span></p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'match' && (user ? <CreateMatch players={players} ligueId={currentLigue} onDone={() => { refresh(); safeSetView('stats'); }} onBack={() => safeSetView('accueil')} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Connecte-toi pour créer un match</p><p className="text-xs text-zinc-500 mt-1">Compte de test : <span className="font-mono">demo@example.com / demo1234</span></p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'stats' && (user ? <Stats classement={stats} matches={matches} onSelect={openMatch} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Connecte-toi pour voir les stats</p><p className="text-xs text-zinc-500 mt-1">Compte de test : <span className="font-mono">demo@example.com / demo1234</span></p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'matchDetail' && (user ? <MatchDetail match={selectedMatch} ligue={ligues.find(l=>l.id=== (selectedMatch?.ligue_id ?? selectedMatch?.ligueId))} onBack={()=>safeSetView('stats')} /> : <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50"><p className="text-sm font-medium">Connecte-toi pour voir le match</p><button onClick={()=>setView('login')} className="mt-3 bg-violet-600 text-white px-5 py-2 rounded-full text-sm">Connexion</button></div>)}
          {view === 'roadmap' && <Roadmap />}
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
          {[
            { id: 'accueil', label: 'Accueil', icon: '🏠' },
            { id: 'match', label: 'Match', icon: '⚔️' },
            { id: 'stats', label: 'Stats', icon: '🏆' },
            { id: 'roadmap', label: 'Todo', icon: '📋' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => safeSetView(tab.id)}
              className={`flex-1 py-3 text-sm flex flex-col items-center gap-1 border-t-2 transition-colors ${view===tab.id ? 'border-violet-600 text-violet-600 bg-violet-50/60 dark:bg-violet-950/20 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
            >
              <span className="text-[15px] leading-none">{tab.icon}</span>
              <span className="text-[11px] tracking-wide">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default App;
