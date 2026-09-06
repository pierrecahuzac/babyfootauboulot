# Babyfoot au boulot — Règles projet

> Fichier d'instructions pour Opencode. Référencé dans `opencode.json` via `instructions`.

## 1. Git / Workflow

- **Toujours travailler sur `dev`** : `git checkout dev` après chaque push/merge.
- **Ne jamais push direct sur `main`** : `main` est prod, alimenté uniquement via PR `dev -> main`.
- Flow : `edit sur dev` -> `git push origin dev` -> `gh pr create --base main --head dev` -> `merge PR` -> `git pull` / `checkout dev`.
- Rester sur `dev` après chaque push (`repasse sur dev apres chaque push on ne fait rien sur main!`).
- Commits en français, préfixe `feat/fix/chore` si possible.

## 2. Infra / Déploiement

- **Vercel** : 2 projets séparés (Hobby, ne supporte pas `*.vercel.app` wildcard) :
  - App : `https://<APP>.vercel.app` (web, `web/vercel.json`)
  - Landing : `https://<LANDING>.vercel.app` (landing, `landing/vercel.json`)
  - Ne pas tenter `app.<APP>.vercel.app` (wildcard bloqué).
- **Render API** : `https://<API>.onrender.com` (`render.yaml`, `healthCheckPath: /health`, `GET /` = 404 normal).
- **Neon DB** : `<NEON_POOLER>.neon.tech/neondb` (pooler). `DATABASE_URL` est `sync:false` sur Render -> à mettre à jour manuellement dans le dashboard.
- **Env prod à maintenir** (voir dashboards Vercel/Render, pas en clair ici) :
  - Render `CORS_ORIGIN=<APP>,<LANDING>`
  - Vercel app `VITE_API_URL=<API>`
  - Vercel landing `PUBLIC_APP_URL=<APP>`

## 3. Backend

- `api/src/app.js` : CORS whitelist stricte via `CORS_ORIGIN`, CSP `connectSrc`, `helmet` prod, `cookie httpOnly Secure SameSite=Lax`, `trustProxy:1`.
- **Vérification email désactivée** (pas de SMTP) : `api/src/routes/auth.js` `register` auto-vérifié (`email_verified=1`), `verify-email`/`resend-verification` -> `410`, `PATCH /me` email change ne reset plus. TODO revert `bebc59c` quand SMTP prêt.
- `api/src/routes/ligues.js` : ligues démo publiques `is_private=0` visibles par tous. `GET /api/ligues` retourne publiques + privées du user.
- `api/src/routes/matches.js` + `players.js` : `isPublicLigue` bypass `isMember` pour lecture sur ligues publiques (stats/matchs/players).
- **RGPD suppression** : `api/src/utils/anonymize.js` `anonymizeMatchesForUser()` remplace `{pseudo}` par `Joueur supprimé deleted:true` dans `matches.team_bleue/rouge` (JSONB) avant `DELETE users`. Appelé par `DELETE /api/auth/me` (`auth.js:362` exige `password`) + `DELETE /api/admin/users/:id`. `MatchDetail.jsx:36` affiche en italique gris.

## 4. Frontend

- `web/src/App.jsx` : router par `view` state, `#register`/`#inscription` depuis landing -> `register`, `VerifyEmail` désactivé (import retiré, banner `Email non vérifié` retiré). Nav bottom 5 tabs `Accueil | Match | Classement | Matchs | Roadmap` (ex-Todo) `roadmap.json` temps réel (`ROADMAP.md` → `roadmap.json`).
- **1v1 sans poste** : un joueur seul joue tous les postes. `CreateMatch.jsx` `toTeam` sans `poste` en `1v1`, `MatchDetail.jsx` + `Stats.jsx` masquent `· poste` si `format==='1v1'`. Tirage `randomTeams` joueurs + postes `reverse()` 50%.
- `Accueil.jsx` : filtres `poste`/`niveau` (`GET /api/players?ligue_id=&poste=&niveau=`), barre `🏆 Ligue` + `Gérer`. `Classement.jsx`/`Matchs.jsx` : sélecteur ligue (retiré du header), podium `🥇🥈🥉`, bordure vainqueur `sky/rose`, `MatchDetail.jsx:36` RGPD `Joueur supprimé` italique gris.
- `web/index.html` CSP `connect-src` aligné sur `<API>` + 2 domaines Vercel.

## 5. DB / Seed démo

- `api/src/db/seed.js` : mode démo prod `--demo` / `SEED_DEMO=1` -> `15` users fakes + `admin`/`demo` = `17`, `5` ligues publiques (`is_private=0`), `14×5=70` matchs (complet dev `30/5/120`).
- `api/package.json` : `db:seed:demo` + `db:seed:demo:clean`.
- Prod : `DATABASE_URL="postgresql://neondb_owner:...@ep-.../neondb?sslmode=require&channel_binding=require" npm run db:seed:demo:clean --prefix api` (17/5/70). `ON CONFLICT DO NOTHING` -> safe à relancer. Public ligues `UPDATE ligues SET is_private=0` si besoin.
- Local : `docker compose exec api npm run db:seed:clean` (32/5/120) ou `:demo:clean` (17/5/70).

## 6. Comptes démo

- `admin@example.com / admin1234` (admin)
- `demo@example.com / demo1234` (user)
- Tous les fakes `*@example.com / demo1234`

## 7. Docs / Git

- `documentation/*` seul `cahier-des-charges-babyfoot.md` versionné (`/.gitignore:51`), `sessions/` jamais push (`:55`, local uniquement). `documentation/ROADMAP.md` + `web/src/pages/roadmap.json` synchro temps réel (SemVer `0.1`→`0.13`, `0.8.1` RGPD actuel).

## 8. Style / Vérif

- **Toujours répondre en français** :)
- Réponses courtes, factuelles, avec références `fichier:ligne`.
- Vérifier via `node --check`, `curl /health`, `POST /api/auth/login demo@example.com` avant de valider.
- Ne pas créer de fichiers inutiles, préférer `edit` à `write`.
