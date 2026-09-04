import { useEffect, useState } from 'react';
import { posteColor, niveauColor, initials, avatarBg } from './utils/helpers.js';
import { getToken, setToken, authFetch } from './utils/auth.js';

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
  const [theme, setTheme] = useState(() => localStorage.getItem('babyfoot_theme') || 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('babyfoot_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const refresh = async (ligueId = currentLigue) => {
    const q = ligueId ? `?ligue_id=${ligueId}` : '';
    const headers = getToken() ? { Authorization: `Bearer ${getToken()}` } : {};
    const [p, s] = await Promise.all([
      fetch(`${API}/api/players${q}`, { headers }).then(r => r.json()).catch(()=>[]),
      fetch(`${API}/api/stats${q}`, { headers }).then(r => r.json()).catch(()=>({ classement: [], matches: [] })),
    ]);
    setPlayers(Array.isArray(p) ? p : []);
    setStats(s.classement ?? []);
    setMatches(s.matches ?? []);
  };

  const loadMe = async () => {
    const t = getToken();
    if (!t) { setUser(null); return; }
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
          {view === 'forgot' && <Forgot onBack={()=>setView('login')} onReset={(t)=>{ setView('reset'); if(t) window.history.pushState({},'','?reset='+t); }} />}
          {view === 'reset' && <Reset onBack={()=>setView('login')} onDone={()=>setView('login')} />}
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

const Accueil = ({ players, onNav, user, ligue, onLigues }) => {
  const [showCode, setShowCode] = useState(false);
  return (
    <div className="space-y-5">
      {user && ligue && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-4 text-white shadow">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <p className="font-black text-sm">🏆 {ligue.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="opacity-80">Code privé :</span>
                {showCode ? (
                  <>
                    <span className="bg-white text-violet-700 px-2 py-0.5 rounded-full font-mono font-black tracking-widest dark:bg-zinc-800">{ligue.invite_code || ligue.inviteCode}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(ligue.invite_code || ligue.inviteCode); }} className="bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-bold">Copier</button>
                    <button onClick={() => setShowCode(false)} className="opacity-60">Masquer</button>
                  </>
                ) : (
                  <button onClick={() => setShowCode(true)} className="bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-bold">👁️ Voir code</button>
                )}
              </div>
              <p className="text-[11px] opacity-60 mt-1">Donne-le en main propre / WhatsApp — ligue privée</p>
            </div>
            <button onClick={onLigues} className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shrink-0">Changer</button>
          </div>
        </div>
      )}
      {user && !ligue && (
        <div className="bg-amber-100 border-2 border-amber-300 rounded-3xl p-4 text-center">
          <p className="font-black text-amber-900">Aucune ligue</p>
          <p className="text-xs text-amber-800">Crée ta ligue privée ou rejoins avec un code.</p>
          <button onClick={onLigues} className="mt-2 bg-amber-500 text-white px-4 py-2 rounded-2xl font-black">Gérer mes ligues</button>
        </div>
      )}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-7xl opacity-10 rotate-12">⚽</div>
        <h2 className="font-black text-lg leading-tight">Prêt à jouer ?</h2>
        <p className="text-sm opacity-90 mt-1">Lance une partie, défie tes collègues !</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => onNav('match')} className="bg-white text-emerald-700 py-3 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-1 dark:bg-zinc-800">
            <span>⚔️</span> Créer un match
          </button>
          <button onClick={() => onNav('stats')} className="bg-emerald-900/20 backdrop-blur text-white border border-white/30 py-3 rounded-2xl font-bold hover:bg-white/20 transition">
            📊 Stats
          </button>
        </div>
      </div>

      {!user ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <p className="font-black text-amber-900 text-sm">🔒 Sécurisé — email + mot de passe</p>
            <p className="text-xs text-amber-800">Crée ton compte pour jouer, ton pseudo est réservé.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNav('login')} className="flex-1 bg-white border-2 border-amber-300 py-2.5 px-4 rounded-2xl font-bold text-amber-900 dark:bg-zinc-800 dark:text-zinc-100">Connexion</button>
            <button onClick={() => onNav('register')} className="flex-1 bg-gradient-to-r from-amber-400 to-orange-400 py-2.5 px-4 rounded-2xl font-black text-amber-950">Créer compte</button>
          </div>
        </div>
      ) : (
        <button onClick={() => onNav('match')} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl font-black shadow">⚔️ Nouveau match en tant que {user.pseudo}</button>
      )}

      <button onClick={() => onNav('inscription')} className="w-full bg-zinc-100 py-2.5 rounded-2xl text-sm font-bold border-2 border-zinc-200 dark:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-100 dark:bg-zinc-800">👤 + Ajouter un joueur invité (sans compte)</button>

      <div className="flex items-center justify-between">
        <h2 className="font-black text-zinc-800 flex items-center gap-2 dark:text-zinc-100">
          <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
          Joueurs inscrits
          <span className="bg-zinc-900 text-white text-xs px-2 py-0.5 rounded-full dark:bg-zinc-700">{players.length}</span>
        </h2>
      </div>

      <div className="border-2 border-zinc-100 rounded-3xl overflow-hidden bg-white shadow-sm divide-y divide-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        {players.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">🤸</div>
            <p className="text-sm text-zinc-500 font-medium dark:text-zinc-400">Aucun joueur pour le moment</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-400">Crée ton compte !</p>
          </div>
        )}
        {players.map(p => (
          <div key={p.id} className="p-3.5 flex items-center gap-3 hover:bg-zinc-50 transition text-sm dark:hover:bg-zinc-800">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarBg(p.pseudo)} text-white flex items-center justify-center font-black text-xs shadow`}>
              {initials(p.pseudo)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-zinc-900 truncate dark:text-zinc-100">{p.pseudo}</div>
              <div className="flex gap-1.5 mt-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${posteColor(p.poste)}`}>{p.poste}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${niveauColor(p.niveau)}`}>{p.niveau}</span>
              </div>
            </div>
            <span className="text-zinc-300">›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Register = ({ onAuth, onBack, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [poste, setPoste] = useState('Attaque');
  const [niveau, setNiveau] = useState('Débutant');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setInfo('');
    const res = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, pseudo, password, poste, niveau }) });
    const body = await res.json();
    if (!res.ok) { setErr(body.error); return; }
    if (body.verificationToken) setInfo(`Compte créé ! Token vérif (dev): ${body.verificationToken.slice(0,12)}… — check /verify`);
    onAuth(body);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center">
        <div className="text-4xl">🚀</div>
        <h2 className="font-black text-xl">Créer ton compte</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Email + mot de passe (6+ caractères)</p>
      </div>
      <label className="block text-sm font-bold">Email
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <label className="block text-sm font-bold">Pseudo
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} placeholder="ex. pierre_j" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <label className="block text-sm font-bold">Mot de passe
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <div className="text-sm font-bold">Poste
        <div className="flex gap-2 mt-1">
          {['Défense','Attaque','Les 2'].map(v => (
            <button type="button" key={v} onClick={()=>setPoste(v)} className={`flex-1 py-2.5 rounded-2xl border-2 font-black ${poste===v?'bg-emerald-500 text-white border-emerald-600':'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'}`}>{v}</button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-bold">Niveau
        <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
          <option value="Débutant">Débutant 🌱</option><option value="Intermédiaire">Intermédiaire ⚡</option><option value="Confirmé">Confirmé 🔥</option>
        </select>
      </label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {info && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {info}</p>}
      <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-black shadow-xl">Créer mon compte</button>
      <p className="text-center text-sm">Déjà un compte ? <button type="button" onClick={onSwitch} className="font-black text-emerald-600 underline">Connexion</button></p>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </form>
  );
};

const Login = ({ onAuth, onBack, onSwitch, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
    const body = await res.json();
    if (!res.ok) { setErr(body.error + (res.status===429 ? ' ⏳' : '')); return; }
    if (body.emailVerified === false) {
      // on laisse passer mais on prévient
    }
    onAuth(body);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center">
        <div className="text-4xl">🔑</div>
        <h2 className="font-black text-xl">Connexion</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Email + mot de passe</p>
      </div>
      <label className="block text-sm font-bold">Email
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      <label className="block text-sm font-bold">Mot de passe
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
      </label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      <button type="submit" className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black shadow-xl dark:bg-zinc-700">Se connecter</button>
      <p className="text-center text-sm">Pas de compte ? <button type="button" onClick={onSwitch} className="font-black text-emerald-600 underline">Créer</button></p>
      <p className="text-center text-sm"><button type="button" onClick={onForgot} className="text-emerald-600 underline">Mot de passe oublié ?</button></p>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </form>
  );
};

const Forgot = ({ onBack, onReset }) => {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [token, setToken] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk(''); setToken('');
    const r = await fetch(`${API}/api/auth/forgot`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    if (b.resetToken) {
      setToken(b.resetToken);
      setOk(`Token (dev): ${b.resetToken.slice(0,12)}… — copie-le pour reset`);
    } else setOk(b.message || 'Si ce compte existe, un email a été envoyé');
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center"><div className="text-4xl">📧</div><h2 className="font-black text-xl">Mot de passe oublié</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Entre ton email</p></div>
      <label className="block text-sm font-bold">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
      {token && <button type="button" onClick={()=>onReset(token)} className="w-full bg-amber-500 text-white py-3 rounded-2xl font-black">Aller au reset →</button>}
      <button className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black dark:bg-zinc-700">Envoyer</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour connexion</button>
    </form>
  );
};

const Reset = ({ onBack, onDone }) => {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('reset') || '');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await fetch(`${API}/api/auth/reset`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token, newPassword: pwd }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk('Mot de passe réinitialisé — connecte-toi');
    setTimeout(()=>onDone(), 1200);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center"><div className="text-4xl">🔐</div><h2 className="font-black text-xl">Réinitialiser</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Token + nouveau mdp (6+)</p></div>
      <label className="block text-sm font-bold">Token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="colle le token" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
      <label className="block text-sm font-bold">Nouveau mot de passe<input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
      <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black">Réinitialiser</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </form>
  );
};

const VerifyEmail = ({ user, onBack, onVerified }) => {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('verify') || '');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await fetch(`${API}/api/auth/verify-email`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk('Email vérifié !');
    if (b.token && b.user) onVerified(b);
  };
  const resend = async () => {
    setErr(''); setOk('');
    const r = await fetch(`${API}/api/auth/resend-verification`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email || user?.email }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk(b.verificationToken ? `Nouveau token (dev): ${b.verificationToken.slice(0,12)}…` : b.message);
    if (b.verificationToken) setToken(b.verificationToken);
  };
  return (
    <div className="space-y-4">
      <div className="text-center"><div className="text-4xl">✉️</div><h2 className="font-black text-xl">Vérifier ton email</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Colle le token reçu (dev: renvoyé à l'inscription)</p></div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-bold">Token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="token 64 hex" className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required /></label>
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
        {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
        <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black">Vérifier</button>
      </form>
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2 dark:bg-zinc-800 dark:text-zinc-100">
        <p className="text-sm font-black">Pas reçu ?</p>
        <label className="block text-sm">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" placeholder="toi@exemple.com" /></label>
        <button onClick={resend} className="w-full bg-amber-500 text-white py-3 rounded-2xl font-black">Renvoyer</button>
      </div>
      <button onClick={onBack} className="w-full text-sm text-zinc-500 dark:text-zinc-400">← Retour</button>
    </div>
  );
};

const Admin = ({ user, onBack }) => {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('');
  const isBlocked = (pseudo) => {
    const blocked = ['hitler','nazi','facho','raciste','antisemite']; // exemple — vrai filtre côté serveur plus complet
    const norm = pseudo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    return blocked.some(w => norm.includes(w));
  };
  const load = async () => {
    setErr(''); setMsg('');
    const r = await authFetch('/api/admin/users');
    if (!r.ok) { setErr((await r.json()).error || 'accès refus'); return; }
    setUsers(await r.json());
  };
  useEffect(()=>{ if(user?.role==='admin') load(); },[user]);
  const changeRole = async (id, role) => {
    setErr(''); setMsg('');
    const r = await authFetch(`/api/admin/users/${id}/role`, { method:'PATCH', body: JSON.stringify({ role }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setMsg(`Role ${b.pseudo} -> ${b.role}`);
    load();
  };
  const del = async (id, pseudo) => {
    if (!confirm(`Supprimer ${pseudo} ?`)) return;
    const r = await authFetch(`/api/admin/users/${id}`, { method:'DELETE' });
    if (!r.ok) { setErr((await r.json()).error); return; }
    setMsg(`Supprimé ${pseudo}`);
    load();
  };
  if (user?.role!=='admin') return <div className="p-8 text-center"><p className="font-black dark:text-zinc-100">🔒 Admin requis</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Connecte-toi avec admin@example.com</p><button onClick={onBack} className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">← Retour</button></div>;
  const filtered = users.filter(u => !filter || u.pseudo.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()));
  const flagged = users.filter(u => isBlocked(u.pseudo));
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-black text-xl dark:text-zinc-100">🛡️ Admin — Modération</h2><button onClick={onBack} className="text-sm text-zinc-500 dark:text-zinc-400">← Retour</button></div>
      <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-3 text-xs dark:text-amber-200">Comptes: {users.length} • Signalés: {flagged.length} • Tous les pseudos sont vérifiés côté serveur (blocklist). Filtre client ci-dessous à titre indicatif.</div>
      {flagged.length>0 && <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-2xl p-3 space-y-2"><p className="font-black text-sm text-red-700 dark:text-red-300">⚠️ Pseudos à modérer ({flagged.length})</p>{flagged.map(u=><div key={u.id} className="flex justify-between items-center text-sm bg-white dark:bg-zinc-700 rounded-xl px-3 py-2 dark:text-zinc-100"><span className="font-bold">{u.pseudo} <span className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</span></span><button onClick={()=>del(u.id, u.pseudo)} className="bg-red-500 text-white px-3 py-1 rounded-full font-bold">Bannir</button></div>)}</div>}
      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="filtrer pseudo/email" className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" />
      {err && <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 rounded-2xl">⚠️ {err}</p>}
      {msg && <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-3 rounded-2xl">✅ {msg}</p>}
      <div className="space-y-2">
        {filtered.map(u=>(
          <div key={u.id} className={`p-3 rounded-2xl border-2 flex justify-between items-center ${u.role==='admin'?'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700':'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate flex items-center gap-2 dark:text-zinc-100">{u.pseudo} {u.role==='admin' && <span className="bg-zinc-900 dark:bg-zinc-700 text-white text-[10px] px-2 py-0.5 rounded-full">ADMIN</span>} {isBlocked(u.pseudo) && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">À MODÉRER</span>}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{u.email} • {u.poste} • {u.niveau} {u.emailVerified?'• ✓':'• ✗'}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {u.role==='user' ? <button onClick={()=>changeRole(u.id,'admin')} className="bg-zinc-900 dark:bg-zinc-700 text-white px-3 py-1 rounded-full text-xs font-bold">admin</button> : <button onClick={()=>changeRole(u.id,'user')} className="bg-zinc-100 dark:bg-zinc-700 border dark:border-zinc-600 dark:text-zinc-100 px-3 py-1 rounded-full text-xs font-bold">user</button>}
              <button onClick={()=>del(u.id, u.pseudo)} className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">Suppr</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={load} className="w-full bg-zinc-900 dark:bg-zinc-700 text-white py-3 rounded-2xl font-black">Rafraîchir</button>
    </div>
  );
};

const Ligues = ({ ligues, currentLigue, onSelect, onRefresh, user }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [visibleCode, setVisibleCode] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await authFetch('/api/ligues', { method: 'POST', body: JSON.stringify({ name, description: desc }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk(`Ligue créée ! Code: ${b.invite_code || b.inviteCode} — partage-le en main propre`);
    setName(''); setDesc('');
    await onRefresh();
    onSelect(b.id);
  };

  const join = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    const r = await authFetch('/api/ligues/join', { method: 'POST', body: JSON.stringify({ invite_code: code }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setOk(`Rejoint: ${b.name}`);
    setCode('');
    await onRefresh();
    onSelect(b.id);
  };

  if (!user) return <div className="text-center p-8"><p className="font-black">🔒 Connecte-toi d'abord</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Crée un compte email+mdp pour gérer tes ligues privées.</p></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-black text-xl flex items-center gap-2">🏆 Mes ligues privées</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Chaque ligue est <b>isolée</b>. Invite par code donné en main propre / email / WhatsApp. Pas de liste publique.</p>
      {ligues.length===0 && <p className="text-sm text-zinc-500 bg-zinc-50 border-2 border-zinc-100 p-4 rounded-2xl dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">Aucune ligue — crée la première !</p>}
      <div className="space-y-2">
        {ligues.map(l=> {
          const codeVal = l.invite_code || l.inviteCode;
          const isVisible = visibleCode === l.id;
          return (
          <div key={l.id} className={`p-4 rounded-3xl border-2 flex justify-between items-center ${Number(currentLigue)===Number(l.id) ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-zinc-100'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-black truncate">{l.name}</p>
              <p className="text-xs text-zinc-500 truncate dark:text-zinc-400">{l.description || '—'} • {l.slug}</p>
              <div className="mt-1 flex items-center gap-2">
                {isVisible ? (
                  <>
                    <span className="text-xs font-mono bg-zinc-900 text-white px-2 py-0.5 rounded-full tracking-widest dark:bg-zinc-700">{codeVal}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(codeVal); }} className="text-xs bg-zinc-100 px-2 py-0.5 rounded-full font-bold dark:bg-zinc-700">Copier</button>
                    <button onClick={() => setVisibleCode(null)} className="text-xs text-zinc-500 dark:text-zinc-400">Masquer</button>
                  </>
                ) : (
                  <button onClick={() => setVisibleCode(l.id)} className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-full font-bold dark:bg-zinc-700">👁️ Voir code</button>
                )}
              </div>
            </div>
            <button onClick={()=>onSelect(l.id)} className={`ml-3 px-4 py-2 rounded-2xl font-black text-sm shrink-0 ${Number(currentLigue)===Number(l.id) ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white'}`}>{Number(currentLigue)===Number(l.id) ? '✓ Active' : 'Choisir'}</button>
          </div>
        )})}
      </div>
      <form onSubmit={create} className="bg-white border-2 border-zinc-100 rounded-3xl p-4 space-y-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <h3 className="font-black">➕ Créer une ligue privée</h3>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Boulot - Étage 3" className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optionnel)" className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
        <button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl font-black">Créer + devenir owner</button>
      </form>
      <form onSubmit={join} className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 space-y-3">
        <h3 className="font-black">🔑 Rejoindre avec un code</h3>
        <p className="text-xs text-amber-800">Demande le code à ton collègue (6 caractères, ex: A3K9P2)</p>
        <div className="flex gap-2">
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="CODE" className="flex-1 border-2 border-amber-300 rounded-2xl px-4 py-3 font-mono font-black tracking-widest text-center dark:bg-zinc-800 dark:text-zinc-100" maxLength={6} required />
          <button className="bg-amber-500 text-white px-6 rounded-2xl font-black">Rejoindre</button>
        </div>
      </form>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {ok}</p>}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">🔒 Privé : personne ne trouve ta ligue sans le code. Le créateur reste owner.</p>
    </div>
  );
};

const Profil = ({ user, ligues, onUpdate, onLogout }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [poste, setPoste] = useState(user?.poste || 'Attaque');
  const [niveau, setNiveau] = useState(user?.niveau || 'Débutant');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deletePwd, setDeletePwd] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPseudo(user.pseudo || '');
      setPoste(user.poste || 'Attaque');
      setNiveau(user.niveau || 'Débutant');
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    const r = await authFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ email, pseudo, poste, niveau }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setMsg('Profil mis à jour');
    if (b.token) setToken(b.token);
    onUpdate(b.user || { email, pseudo, poste, niveau });
  };

  const changePwd = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    const r = await authFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
    const b = await r.json();
    if (!r.ok) { setErr(b.error); return; }
    setMsg('Mot de passe changé');
    setOldPassword(''); setNewPassword('');
  };

  const del = async () => {
    setErr(''); setMsg('');
    const r = await authFetch('/api/auth/me', { method: 'DELETE', body: JSON.stringify({ password: deletePwd }) });
    const b = await r.json().catch(()=>({}));
    if (!r.ok) { setErr(b.error || 'suppression échouée'); return; }
    setToken(null);
    window.location.reload();
  };

  if (!user) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Non connecté</p>;

  return (
    <div className="space-y-6">
      <h2 className="font-black text-xl flex items-center gap-2">👤 Mon profil</h2>

      <div className="bg-white border-2 border-zinc-100 rounded-3xl p-4 space-y-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <p className="font-black text-sm">Infos</p>
        <div className="text-xs text-zinc-600 space-y-1 dark:text-zinc-300">
          <p><span className="font-bold">ID:</span> {user.id}</p>
          <p><span className="font-bold">Créé:</span> {new Date(user.created_at || user.createdAt).toLocaleDateString()}</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block text-sm font-bold">Email
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          </label>
          <label className="block text-sm font-bold">Pseudo
            <input value={pseudo} onChange={e=>setPseudo(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          </label>
          <div className="text-sm font-bold">Poste
            <div className="flex gap-2 mt-1">
              {['Défense','Attaque','Les 2'].map(v=> (
                <button type="button" key={v} onClick={()=>setPoste(v)} className={`flex-1 py-2 rounded-xl border-2 font-black ${poste===v?'bg-emerald-500 text-white':'bg-white'}`}>{v}</button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-bold">Niveau
            <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1 w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
              <option value="Débutant">Débutant 🌱</option><option value="Intermédiaire">Intermédiaire ⚡</option><option value="Confirmé">Confirmé 🔥</option>
            </select>
          </label>
          <button className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-black">Enregistrer</button>
        </form>
      </div>

      <div className="bg-white border-2 border-zinc-100 rounded-3xl p-4 space-y-3 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <p className="font-black text-sm">🔑 Changer mot de passe</p>
        <form onSubmit={changePwd} className="space-y-3">
          <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="Ancien mot de passe" className="w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Nouveau (6+)" className="w-full border-2 border-zinc-200 rounded-2xl px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <button className="w-full bg-zinc-900 text-white py-3 rounded-2xl font-black dark:bg-zinc-700">Changer</button>
        </form>
      </div>

      <div className="bg-white border-2 border-zinc-100 rounded-3xl p-4 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <p className="font-black text-sm">🏆 Mes ligues ({ligues.length})</p>
        <div className="mt-2 space-y-2">
          {ligues.map(l=> (
            <div key={l.id} className="flex justify-between items-center text-sm border rounded-xl px-3 py-2">
              <span className="font-bold truncate">{l.name}</span>
              <span className="text-xs font-mono bg-zinc-900 text-white px-2 py-0.5 rounded-full dark:bg-zinc-700">{l.invite_code || l.inviteCode}</span>
            </div>
          ))}
          {ligues.length===0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">Aucune ligue</p>}
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4 space-y-3">
        <p className="font-black text-sm text-red-700">⚠️ Zone dangereuse</p>
        {!showDelete ? (
          <button onClick={()=>setShowDelete(true)} className="w-full bg-red-500 text-white py-3 rounded-2xl font-black">Supprimer mon compte</button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-red-700">Tape ton mot de passe pour confirmer. Tes ligues en tant que owner seront transférées ou supprimées.</p>
            <input type="password" value={deletePwd} onChange={e=>setDeletePwd(e.target.value)} placeholder="Mot de passe" className="w-full border-2 border-red-300 rounded-2xl px-3 py-2 dark:bg-zinc-800 dark:text-zinc-100" />
            <div className="flex gap-2">
              <button onClick={()=>setShowDelete(false)} className="flex-1 bg-white border-2 border-zinc-200 py-2 rounded-2xl font-bold dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">Annuler</button>
              <button onClick={del} className="flex-1 bg-red-600 text-white py-2 rounded-2xl font-black">Confirmer suppression</button>
            </div>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">✅ {msg}</p>}
    </div>
  );
};

const Inscription = ({ onDone, onBack }) => {
  const [pseudo, setPseudo] = useState('');
  const [poste, setPoste] = useState('Attaque');
  const [niveau, setNiveau] = useState('Débutant');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const res = await fetch(`${API}/api/players`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, poste, niveau })
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="font-black text-xl text-zinc-900 dark:text-zinc-100">Ajouter un invité</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sans compte — pratique pour un collègue de passage</p>
      </div>
      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Pseudo
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} placeholder="ex. pierre_j" className="mt-1.5 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 focus:border-emerald-400 focus:outline-none bg-white shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" required />
      </label>
      <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Poste préféré
        <div className="flex gap-2 mt-1.5">
          {[
            { v:'Défense', col: poste==='Défense' ? 'bg-blue-500 text-white border-blue-600 shadow-lg scale-[1.02]' : 'bg-blue-50 text-blue-700 border-blue-200', icon:'🛡️' },
            { v:'Attaque', col: poste==='Attaque' ? 'bg-red-500 text-white border-red-600 shadow-lg scale-[1.02]' : 'bg-red-50 text-red-700 border-red-200', icon:'⚡' },
            { v:'Les 2', col: poste==='Les 2' ? 'bg-gradient-to-r from-blue-500 to-red-500 text-white border-transparent shadow-lg scale-[1.02]' : 'bg-violet-50 text-violet-700 border-violet-200', icon:'🔄' },
          ].map(o => (
            <button type="button" key={o.v} onClick={()=>setPoste(o.v)} className={`flex-1 py-3 rounded-2xl border-2 text-sm font-black transition flex items-center justify-center gap-1 ${o.col}`}>{o.icon} {o.v}</button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Niveau de départ
        <select value={niveau} onChange={e=>setNiveau(e.target.value)} className="mt-1.5 w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 bg-white focus:border-amber-400 focus:outline-none font-medium dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
          <option value="Débutant">Débutant 🌱</option><option value="Intermédiaire">Intermédiaire ⚡</option><option value="Confirmé">Confirmé 🔥</option>
        </select>
      </label>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl">⚠️ {err}</p>}
      <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.01] transition text-base">🚀 Ajouter</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 font-medium hover:text-zinc-700 dark:text-zinc-400">← Retour accueil</button>
    </form>
  );
};

const CreateMatch = ({ players, ligueId, onDone, onBack }) => {
  const [format, setFormat] = useState('1v1');
  const [bleue1, setBleue1] = useState(''); const [bleue2, setBleue2] = useState('');
  const [rouge1, setRouge1] = useState(''); const [rouge2, setRouge2] = useState('');
  const [scoreBleue, setScoreBleue] = useState(10); const [scoreRouge, setScoreRouge] = useState(7);
  const [err, setErr] = useState('');
  const [isRandom, setIsRandom] = useState(false);

  const toTeam = (pseudo, poste) => {
    const p = players.find(x => x.pseudo === pseudo);
    if (!p) return { pseudo, poste };
    return { id: p.id, pseudo: p.pseudo, poste };
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const randomize = () => {
    setErr('');
    const need = format === '1v1' ? 2 : 4;
    if (players.length < need) {
      setErr(`Pas assez de joueurs : ${players.length}/${need} (inscris-en d'autres)`);
      return;
    }
    const picked = shuffle(players).slice(0, need);
    if (format === '1v1') {
      setBleue1(picked[0].pseudo); setRouge1(picked[1].pseudo);
      setBleue2(''); setRouge2('');
    } else {
      setBleue1(picked[0].pseudo); setBleue2(picked[1].pseudo);
      setRouge1(picked[2].pseudo); setRouge2(picked[3].pseudo);
    }
    setIsRandom(true);
    setTimeout(() => setIsRandom(false), 600);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const team_bleue = format === '1v1' ? [toTeam(bleue1, 'Les 2')] : [toTeam(bleue1, 'Attaque'), toTeam(bleue2, 'Défense')];
    const team_rouge = format === '1v1' ? [toTeam(rouge1, 'Les 2')] : [toTeam(rouge1, 'Attaque'), toTeam(rouge2, 'Défense')];
    if (team_bleue.some(t=>!t.pseudo) || team_rouge.some(t=>!t.pseudo)) { setErr('Sélectionne tous les joueurs'); return; }
    const allPseudos = [...team_bleue, ...team_rouge].map(t=>t.pseudo);
    if (new Set(allPseudos).size !== allPseudos.length) { setErr('Un joueur ne peut pas être dans les deux équipes'); return; }
    if (!ligueId) { setErr('Choisis une ligue d’abord (en haut)'); return; }
    const res = await fetch(`${API}/api/matches`, {
      method:'POST', headers:{ 'Content-Type':'application/json', ...(() => { const t=localStorage.getItem('babyfoot_token'); return t?{Authorization:`Bearer ${t}`}:{}; })(), 'X-Ligue-Id': String(ligueId) },
      body: JSON.stringify({ format, team_bleue, team_rouge, score_bleue: Number(scoreBleue), score_rouge: Number(scoreRouge), ligue_id: ligueId })
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  };

  const sel = (val,setter, accent, posteLabel) => (
    <div className="space-y-1">
      {posteLabel && <p className={`text-[11px] font-black tracking-widest ${accent.includes('blue') ? 'text-blue-600' : 'text-red-600'}`}>{posteLabel}</p>}
      <select value={val} onChange={e=>setter(e.target.value)} className={`w-full border-2 rounded-2xl px-3 py-3 bg-white font-medium focus:outline-none shadow-sm ${accent} ${isRandom ? 'animate-pulse' : ''}`}>
        <option value="">{posteLabel ? `— ${posteLabel.toLowerCase()} —` : '— choisir joueur —'}</option>
        {players.map(p=><option key={p.id} value={p.pseudo}>{p.pseudo} • {p.poste}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="font-black text-xl text-zinc-900 flex items-center gap-2 dark:text-zinc-100">
        <span className="bg-gradient-to-r from-blue-500 to-red-500 text-white w-8 h-8 rounded-xl flex items-center justify-center text-sm">⚔️</span>
        Nouveau match
      </h2>

      <div className="flex gap-2 p-1.5 bg-zinc-100 rounded-2xl dark:bg-zinc-700">
        <button type="button" onClick={()=>setFormat('1v1')} className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-1 ${format==='1v1'?'bg-white shadow text-zinc-900 border': 'text-zinc-500'}`}>👤 1 vs 1</button>
        <button type="button" onClick={()=>setFormat('2v2')} className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-1 ${format==='2v2'?'bg-white shadow text-zinc-900 border': 'text-zinc-500'}`}>👥 2 vs 2</button>
      </div>

      <button type="button" onClick={randomize} className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 text-white py-3.5 rounded-2xl font-black shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 border-2 border-white dark:bg-zinc-800 dark:text-zinc-100">
        <span className={`text-lg ${isRandom ? 'animate-spin' : ''}`}>🎲</span> Tirage aléatoire {format}
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{format==='1v1' ? '2 joueurs' : '4 joueurs'}</span>
      </button>
      <p className="text-[11px] text-zinc-500 text-center -mt-3 dark:text-zinc-400">On choisit le format, ça mélange les joueurs distincts</p>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-4 space-y-3 shadow-sm">
        <p className="text-sm font-black flex items-center gap-2 text-blue-700"><span className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm">💙</span>Équipe Bleue</p>
        <div className="space-y-3">
          {format === '1v1' ? sel(bleue1,setBleue1,'border-blue-200 focus:border-blue-400') : (
            <>
              {sel(bleue1,setBleue1,'border-blue-200 focus:border-blue-400','⚡ Attaque')}
              {sel(bleue2,setBleue2,'border-blue-200 focus:border-blue-400','🛡️ Défense')}
            </>
          )}
        </div>
      </div>
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4 space-y-3 shadow-sm">
        <p className="text-sm font-black flex items-center gap-2 text-red-700"><span className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center text-sm">❤️</span>Équipe Rouge</p>
        <div className="space-y-3">
          {format === '1v1' ? sel(rouge1,setRouge1,'border-red-200 focus:border-red-400') : (
            <>
              {sel(rouge1,setRouge1,'border-red-200 focus:border-red-400','⚡ Attaque')}
              {sel(rouge2,setRouge2,'border-red-200 focus:border-red-400','🛡️ Défense')}
            </>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-4">
        <p className="text-sm font-black text-amber-800 flex items-center gap-2">🏁 Score final</p>
        <div className="flex gap-3 items-center mt-3">
          <div className="flex-1 bg-white border-2 border-blue-300 rounded-2xl p-2 flex items-center gap-2 shadow dark:bg-zinc-800 dark:text-zinc-100">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <input type="number" value={scoreBleue} onChange={e=>setScoreBleue(e.target.value)} className="w-full font-black text-xl text-blue-700 focus:outline-none text-center" />
          </div>
          <span className="font-black text-zinc-400 text-lg dark:text-zinc-400">—</span>
          <div className="flex-1 bg-white border-2 border-red-300 rounded-2xl p-2 flex items-center gap-2 shadow dark:bg-zinc-800 dark:text-zinc-100">
            <input type="number" value={scoreRouge} onChange={e=>setScoreRouge(e.target.value)} className="w-full font-black text-xl text-red-700 focus:outline-none text-center" />
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-700 bg-red-50 border-2 border-red-200 p-3 rounded-2xl font-bold dark:bg-zinc-800 dark:text-zinc-100">⚠️ {err}</p>}
      <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.01] transition text-base">✅ Valider le match</button>
      <button type="button" onClick={onBack} className="w-full text-sm text-zinc-500 font-medium dark:text-zinc-400">← Retour</button>
    </form>
  );
};

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
