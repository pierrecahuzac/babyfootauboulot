# Roadmap — Babyfoot — source de vérité

> Synchro temps réel : `web/src/pages/Roadmap.jsx` importe ce fichier via `roadmap.json`. À chaque feature, bump version + cocher ici + `.md` OK.

## Versioning (par révision / bugfix / feature)
- `0.01` feature — Auth email + ligues privées
- `0.02` feature — Matchs 1v1/2v2 poste
- `0.03` feature — Tirage aléatoire
- `0.04` feature — Stats classement + historique date
- `0.05` revision — UI clair épuré + accès protégé + fix déconnexion (F5)
- `0.06` revision — Match détail + bordure vainqueur + jour/date
- `0.07` feature — **Tournoi** Solo/Duo équipe choisie/aléatoire (TODO)
- `0.08` feature — Stats par poste
- `0.09` feature — Duos gagnants
- `0.10` feature — Filtrage stats période
- `0.11` feature — Gestion ligue (renommer/code/kicker/quitter)

## État actuel (2026-09-05)
- [x] 0.01 Auth email + ligues privées (`api/src/routes/auth.js`, `ligues.js`)
- [x] 0.02 Matchs 1v1/2v2 (`matches.js`, `CreateMatch.jsx`)
- [x] 0.03 Tirage aléatoire (`utils/stats.js:randomTeams`)
- [x] 0.04 Stats (`Stats.jsx` date `ven. 05 sept.`)
- [x] 0.05 UI clair épuré + accès protégé (`App.jsx: safeSetView`, `Accueil.jsx` gate, `auth.js` fix logout)
- [x] 0.06 Match détail (`MatchDetail.jsx`, border sky/rose `Stats.jsx:35`)
- [ ] 0.07 Tournoi (arbre, Solo/Duo, choisie/aléatoire)
- [ ] 0.08 Stats par poste
- [ ] 0.09 Duos
- [ ] 0.10 Filtrage période
- [ ] 0.11 Gestion ligue

## Todo temps réel
Pour chaque PR : `ROADMAP.md` + `cahier-des-charges-babyfoot.md:3.6` + `ETAT_DES_LIEUX.md:✅` + `ROADMAP.jsx` doivent être bumpés ensemble. CI check `roadmap.json` généré depuis ce `.md`.
