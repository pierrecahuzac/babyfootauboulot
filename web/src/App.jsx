import { useEffect, useState } from 'react';
import { getToken, setToken, authFetch } from './utils/auth.js';
import Accueil from './pages/Accueil.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Forgot from './pages/Forgot.jsx';
import Reset from './pages/Reset.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Ligues from './pages/Ligues.jsx';
import Profil from './pages/Profil.jsx';
import Inscription from './pages/Inscription.jsx';
import CreateMatch from './pages/CreateMatch.jsx';
import Stats from './pages/Stats.jsx';
import Admin from './pages/Admin.jsx';

const API = import.meta.env.VITE_API_URL || '';

const App = () => {
  const [view, setView] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('verify')) return 'verify';
    if (p.get('reset')) return 'reset';
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

  // nettoie les tokens dans l'URL (anti Referer/history leak R7)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has('verify') || p.has('reset') || p.has('token')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
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

  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-100 via-lime-50 to-emerald-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 ${theme==='dark' ? 'dark' : ''}`}>
      <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-900 shadow-2xl flex flex-col relative dark:text-zinc-100">
        <header className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-800 text-white p-5 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('accueil')}>
            <span className="text-2xl">⚽</span>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none">BABYFOOT</h1>
              <p className="text-[11px] opacity-90 -mt-1 tracking-widest">AU BOULOT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-8 h-8 rounded-full bg-white/20 dark:bg-zinc-700 backdrop-blur flex items-center justify-center text-sm" title={theme==='dark' ? 'Passer en clair' : 'Passer en sombre'}>{theme==='dark' ? '☀️' : '🌙'}</button>
            {user ? (
              <>
                <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded-full font-bold hidden sm:inline flex items-center gap-1">{user.pseudo} {user.role==='admin' && <span className="bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full text-[10px]">ADMIN</span>}</span>
                {user.role==='admin' && <button onClick={()=>setView('admin')} className="text-xs bg-amber-400 text-amber-950 px-3 py-1 rounded-full font-black">Admin</button>}
                <button onClick={logout} className="text-xs bg-white text-emerald-700 dark:text-zinc-900 px-3 py-1 rounded-full font-bold shadow dark:bg-zinc-800">Sortir</button>
              </>
            ) : (
              <>
                <button onClick={() => setView('login')} className="text-xs bg-white/20 backdrop-blur px-3 py-1 rounded-full font-bold">Connexion</button>
                <button onClick={() => setView('register')} className="text-xs bg-white text-emerald-700 dark:text-zinc-900 px-3 py-1 rounded-full font-bold shadow dark:bg-zinc-800">Créer compte</button>
              </>
            )}
          </div>
        </header>

        {user && <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2 text-xs text-emerald-800 flex justify-between"><span>👋 {user.pseudo} • {user.poste} • {user.niveau} {user.role==='admin' && '• 🛡️ admin'}</span><span className="hidden sm:inline">{user.email}</span></div>}
        {user && !(user.emailVerified ?? user.email_verified) && (
          <div className="bg-amber-100 border-b border-amber-300 px-5 py-2 text-xs text-amber-900 flex justify-between items-center">
            <span>⚠️ Email non vérifié — vérifie ta boîte</span>
            <button onClick={()=>setView('verify')} className="bg-amber-500 text-white px-3 py-1 rounded-full font-bold">Vérifier</button>
          </div>
        )}
        {user && (
          <div className="px-5 py-2 bg-white dark:bg-zinc-800 border-b dark:border-zinc-700 flex items-center gap-2 text-xs">
            <span className="font-black text-zinc-600 dark:text-zinc-300">🏆 Ligue</span>
            <select value={currentLigue || ''} onChange={e=>selectLigue(e.target.value)} className="flex-1 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-1 bg-white dark:bg-zinc-900 font-bold dark:text-zinc-100">
              <option value="">— choisir —</option>
              {ligues.map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button onClick={()=>setView('ligues')} className="bg-zinc-900 dark:bg-zinc-700 text-white px-3 py-1 rounded-full font-bold">Gérer</button>
          </div>
        )}

        <main className="p-5 flex-1 pb-20 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800">
          {view === 'accueil' && <Accueil players={players} onNav={setView} user={user} ligue={ligues.find(l=>l.id===currentLigue)} onLigues={()=>setView('ligues')} />}
          {view === 'inscription' && <Inscription onDone={() => { refresh(); setView('accueil'); }} onBack={() => setView('accueil')} />}
          {view === 'register' && <Register onAuth={onAuth} onBack={() => setView('accueil')} onSwitch={() => setView('login')} />}
          {view === 'login' && <Login onAuth={onAuth} onBack={() => setView('accueil')} onSwitch={() => setView('register')} onForgot={()=>setView('forgot')} />}
          {view === 'forgot' && <Forgot onBack={()=>setView('login')} onReset={(t)=>{ if(t) setPendingResetToken(t); setView('reset'); }} />}
          {view === 'reset' && <Reset initialToken={pendingResetToken} onBack={()=>setView('login')} onDone={()=>{ setPendingResetToken(''); setView('login'); }} />}
          {view === 'verify' && <VerifyEmail user={user} onBack={()=>setView('accueil')} onVerified={(data)=>{ setUser(data.user); setToken(data.token); setView('accueil'); loadMe(); }} />}
          {view === 'profil' && <Profil user={user} ligues={ligues} onUpdate={(u)=>setUser(u)} onLogout={logout} />}
          {view === 'admin' && <Admin user={user} onBack={()=>setView('accueil')} />}
          {view === 'ligues' && <Ligues ligues={ligues} currentLigue={currentLigue} onSelect={selectLigue} onRefresh={loadLigues} user={user} />}
          {view === 'match' && <CreateMatch players={players} ligueId={currentLigue} onDone={() => { refresh(); setView('stats'); }} onBack={() => setView('accueil')} />}
          {view === 'stats' && <Stats classement={stats} matches={matches} />}
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-t border-zinc-200 dark:border-zinc-700 flex shadow-[0_-8px_24px_rgba(0,0,0,0.08)] rounded-t-2xl overflow-hidden">
          {[
            { id: 'accueil', label: 'Accueil', icon: '🏠' },
            { id: 'match', label: 'Match', icon: '⚔️' },
            { id: 'stats', label: 'Stats', icon: '🏆' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex-1 py-3.5 text-sm flex flex-col items-center gap-0.5 transition-all ${view===tab.id ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white font-bold shadow-inner' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default App;
