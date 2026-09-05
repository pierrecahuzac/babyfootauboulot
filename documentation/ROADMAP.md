# Roadmap — Babyfoot — source de vérité

> Synchro temps réel : `web/src/pages/Roadmap.jsx` importe ce fichier via `roadmap.json`. À chaque feature, bump version + cocher ici + `.md` OK.

## Versioning (par révision / bugfix / feature)
- `0.01` feature — Auth email + ligues privées
- `0.02` feature — Matchs 1v1/2v2 poste
- `0.03` feature — Tirage aléatoire
- `0.04` feature — Stats classement + historique date
- `0.05` revision — UI clair épuré + accès protégé + fix déconnexion (F5)
- `0.06` revision — Match détail + bordure vainqueur + jour/date
- `0.07` revision — Infra démo prod (Vercel 2 projets + Render, CORS, vérif email désactivée, ligues publiques 17/5/70)
- `0.08` fix — 1v1 sans poste + tirage joueurs+postes aléatoire
- `0.09` feature — **Tournoi** Solo/Duo équipe choisie/aléatoire (TODO)
- `0.10` feature — Stats par poste
- `0.11` feature — Duos gagnants
- `0.12` feature — Filtrage stats période
- `0.13` feature — Gestion ligue (renommer/code/kicker/quitter)

## État actuel (2026-09-05)
- [x] 0.01 Auth email + ligues privées (`api/src/routes/auth.js`, `ligues.js`)
- [x] 0.02 Matchs 1v1/2v2 (`matches.js`, `CreateMatch.jsx`)
- [x] 0.03 Tirage aléatoire (`utils/stats.js:randomTeams`)
- [x] 0.04 Stats (`Stats.jsx` date `ven. 05 sept.`)
- [x] 0.05 UI clair épuré + accès protégé (`App.jsx: safeSetView`, `Accueil.jsx` gate, `auth.js` fix logout)
- [x] 0.06 Match détail (`MatchDetail.jsx`, border sky/rose `Stats.jsx:35`)
- [x] 0.07 Infra démo prod (Vercel `babyfootauboulot.vercel.app` + `landing`, Render `babyfootauboulot.onrender.com`, `AGENTS.md`/`opencode.json`, vérif `bebc59c`, seed `17/5/70` public `is_private=0`)
- [x] 0.08 1v1 sans poste + tirage full aléatoire (`CreateMatch.jsx:toTeam` sans poste en 1v1, `MatchDetail.jsx`/`Stats.jsx` masquent poste, `seed.js` 1v1 sans poste)
- [ ] 0.09 Tournoi (arbre, Solo/Duo, choisie/aléatoire)
- [ ] 0.10 Stats par poste
- [ ] 0.11 Duos
- [ ] 0.12 Filtrage période
- [ ] 0.13 Gestion ligue

## Todo temps réel
Pour chaque PR : `ROADMAP.md` + `cahier-des-charges-babyfoot.md:3.6` + `ETAT_DES_LIEUX.md:✅` + `ROADMAP.jsx` doivent être bumpés ensemble. CI check `roadmap.json` généré depuis ce `.md`.
