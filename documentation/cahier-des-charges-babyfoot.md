# Cahier des charges — Babyfoot au boulot — v2 (MAJ 2026-09-04)

## 1. Contexte et objectif
App mobile-first pour organiser les parties de babyfoot entre collègues *et* ouverture internet. Deux vitrines : **babyfootauboulot.dev** (landing Astro) → **app.babyfootauboulot.dev** (app React). Ligues privées isolées (boulot ≠ inconnus), auth email+mdp, stats live.

## 2. Utilisateurs cibles
- **Interne** : collègues du bureau (1 ligue privée “Boulot”)
- **Externe** : toute équipe qui crée sa propre ligue privée via code d’invitation (partage en main propre / email / WhatsApp). Pas de découverte publique.

## 3. Fonctionnalités

### 3.1 Auth — (FAIT)
- `POST /api/auth/register` {email, pseudo, password(6+), poste, niveau, role} → JWT 7j `HS256` (`JWT_SECRET`, `ADMIN_EMAILS` → `admin`), `users` (`role admin|user`, `email_verified`, `verification_token` hash `sha256`)
- `POST /api/auth/login` {email, password} → JWT + `role`, rate-limit `5/15min 429`, `POST /api/auth/verify-email`/`resend`/`forgot`/`reset` (hash, dev-only leak), `PATCH /me`/`change-password`/`DELETE /me`, `POST /api/players/:id/claim`
- `GET /api/auth/me` (Bearer/`httpOnly` cookie) + `POST /api/auth/logout` + `middleware/auth` `requireAuth`/`requireAdmin`
- Front `web/src/pages/*` (`Register`/`Login`/`Forgot`/`Reset`/`VerifyEmail`) + `Profil` + `Admin` (modération), header `👋 pseudo` `ADMIN` badge, `localStorage` + `authFetch`
- Modération `utils/moderation.js` blocklist, rétro-compat `players` invité + `claim` vers `users`
- Comptes démo `admin@example.com`/`admin1234` (`admin` système, pas joueur) + `demo@example.com`/`demo1234` (`user`), seed `api/src/db/seed.js` `32` users + `120` matchs

### 3.2 Ligues privées par code (FAIT)
- Tables `ligues(id,name,slug,description,owner_id,invite_code unique 6, is_private)` + `ligue_members(ligue_id,user_id,role owner/member)`
- `POST /api/ligues` (auth) → génère `slug` (`boulot-x9k`) + `invite_code` (`A3K9P2`), crée membre owner
- `GET /api/ligues` (mes ligues), `POST /api/ligues/join {invite_code}`, `GET /api/ligues/:id/members`
- Isolation : `GET /api/players?ligue_id=`, `GET /api/matches?ligue_id=`, `POST /api/matches {ligue_id}`, `GET /api/stats?ligue_id=` vérifient `isMember()` → 401/403 sinon. Sans `ligue_id` → global pour compat/tests.
- Migration `api/src/app.js:initDb()` crée ligue par défaut `Boulot` et rattache les matchs orphelins.
- Front `web/src/App.jsx` : état `ligues/currentLigue` (`localStorage babyfoot_ligue_id`), barre `🏆 Ligue` + `Gérer` → `Ligues` (liste, créer, rejoindre par code, `invite_code` affiché à partager).

### 3.3 Inscription joueur (FAIT, évolué)
- Pseudo, poste préféré `Attaque/Défense/Attaque / Défense`, niveau `Débutant/Intermédiaire/Confirmé` (CHECK DB)
- Via `users` (avec email/mdp) ou `players` (invité). `posteColor`/`niveauColor` + avatar gradient `avatarBg` (`web/src/utils/helpers.js`)

### 3.4 Création d’un match (FAIT, évolué)
- Format `1v1` (1 joueur/équipe, **sans poste** — solo joue tous les postes) / `2v2` (2/équipe)
- **En 2v2 chaque liste = un poste** : `Bleue: ⚡ Attaque + 🛡️ Défense`, `Rouge: idem` (`web/src/App.jsx:CreateMatch` `sel(...,posteLabel)`). En `1v1` pas de `poste` (`CreateMatch.jsx:toTeam` sans poste, `MatchDetail.jsx`/`Stats.jsx` masquent `· poste`).
- Sélection parmi les membres de la ligue courante, `team_bleue/rouge: [{id,pseudo,poste}]` (`1v1` sans `poste`), `score_bleue/rouge`
- Validation `validateMatchPayload` (1v1=1, 2v2=2, pas de doublon) + `randomTeams`/`shuffle` (`🎲 Tirage aléatoire` joueurs **+ postes** : `1v1`=2 joueurs, `2v2`=4 joueurs + `Attaque/Défense` aléatoire par équipe via `reverse()` 50%)
- Stockage JSONB `team_bleue/rouge` + colonnes legacy `team_a/b` syncées, `ligue_id` si ligue. Seed `1v1` sans poste.

### 3.5 Suivi des matchs et stats (FAIT)
- Historique 50 derniers `GET /api/matches`
- `GET /api/stats` → `calculateClassement(players,matches)` (`api/src/utils/stats.js`) : `victoires/défaites/ratio`, tri `victoires puis ratio`, `normalizeMatch` gère legacy `teamA/team_a`
- Front `Stats` : podium `🥇🥈🥉` + `Derniers matchs` `Bleue ⚡/🛡️ vs Rouge` + score, filtré par ligue si sélectionnée

### 3.6 Roadmap versionnée (source `ROADMAP.md` + `roadmap.json` temps réel)
- [x] `0.01` Auth email + ligues privées
- [x] `0.02` Matchs 1v1/2v2 poste
- [x] `0.03` Tirage aléatoire
- [x] `0.04` Stats classement + historique date (`ven. 05 sept.`)
- [x] `0.05` UI clair épuré + accès protégé + fix déconnexion
- [x] `0.06` Match détail + bordure vainqueur
- [x] `0.07` Infra démo prod (Vercel 2 projets + Render, CORS, vérif désactivée, ligues publiques 17/5/70)
- [x] `0.08` 1v1 sans poste + tirage joueurs+postes aléatoire
- [ ] `0.09` **Tournoi** : Solo/Duo équipe choisie/aléatoire (arbre, tirage) — TODO
- [ ] `0.10` Stats par poste
- [ ] `0.11` Duos gagnants
- [ ] `0.12` Filtrage stats période
- [ ] `0.13` Gestion ligue (renommer/code/kicker/quitter)
> `web/src/pages/Roadmap.jsx` lit `roadmap.json` généré depuis `ROADMAP.md` — synchro temps réel app ↔ docs

## 4. Modèle de données (réel)

**users** `id, email unique, pseudo unique, password_hash, poste, niveau, role admin|user, email_verified, verification_token (hash), reset_token (hash), created_at`
**players** `id, pseudo unique, poste, niveau, created_at` (invités, `claim` vers `users`)
**ligues** `id, name, slug unique, description, owner_id→users, invite_code unique, is_private, created_at`
**ligue_members** `id, ligue_id→ligues, user_id→users, role, joined_at, UNIQUE(ligue_id,user_id)`
**matches** `id, format, team_bleue JSONB, team_rouge JSONB, score_bleue INT, score_rouge INT, ligue_id→ligues, team_a/b, score_a/b (legacy), created_at`

## 5. Parcours utilisateur (v2)
1. Vitrine `babyfootauboulot.dev` (Astro) → CTA `Ouvrir l'app` → `app.babyfootauboulot.dev`
2. Sur app mobile : si pas de token → `Créer compte` (email/pseudo/mdp/poste/niveau) ou `Connexion` → `GET /api/auth/me` → `Mes ligues`
3. Créer une ligue privée (`Boulot - Étage 3`) → récupère `invite_code` `A3K9P2` → le donne en main propre / WhatsApp
4. Collègue : `Rejoindre avec un code` → `POST /api/ligues/join` → ligue active
5. `Accueil` (ligue courante) → voit membres (joueurs de la ligue), `Créer un match` (choix poste par liste), `Tirage aléatoire`, `Saisie score` → `POST /api/matches?ligue_id=` → `Stats` filtrées par ligue

## 6. Contraintes techniques

- Mobile-first, usage au bureau + ouverture internet
- Données isolées par ligue privée (code), pas de liste publique
- **Ports locaux** : `db 5432`, `api 33333` (`PORT`, `ADMIN_EMAILS`), `web 55174` (`VITE_API_URL=""` → proxy `vite.config.js:proxy /api → http://api:33333`), `landing 55175` (Astro). Ancien `5173/3000` abandonnés.
- **Stack** :
  - Frontend app : React 18 + Vite 6 + Tailwind 4 + thème sombre par défaut, `node:20-alpine`, HMR `watch:{usePolling:true}`, `host 0.0.0.0`, `12` pages `web/src/pages/*` (`App.jsx` router `194`L)
  - Frontend vitrine : Astro 5 + Tailwind 4 (`landing/src/pages/index.astro` `Crée/Joue/Suis`, footer `© 2026`)
  - Backend : Node 20 Fastify 5 `trustProxy:1` + `@fastify/helmet` + `@fastify/cors` whitelist + `@fastify/cookie`, `pg` + `drizzle-orm`, `bcryptjs` + `jsonwebtoken` `HS256` (JWT 7j, `JWT_SECRET` fail-closed, `hashToken`), `utils/moderation` blocklist
  - DB : Postgres 16 (`pgdata` persistant, `babyfoot` + `babyfoot_test` pour tests), seed `src/db/seed.js` `32`/`5`/`120`
  - Orchestration : `docker-compose.yml` (db, api, web, landing, `studio` `profiles:dev` `https://local.drizzle.studio`) + volumes `pgdata`, ` - ./api:/app` + `/app/node_modules` pour HMR, `0.0.0.0:PORT->PORT` pour réseau local
  - Reverse proxy prod : Caddy (`Caddyfile.example` : `babyfootauboulot.dev → 55175`, `app.babyfootauboulot.dev → 55174` + `handle /api/* → 33333`)

## 7. Tests (FAIT)

- **Back** `vitest` : unit `src/utils/stats.test.js` (12), intégration mock `tests/integration/app.integration.test.js` (5, `Fastify.inject` + mock DB), intégration réelle `tests/integration/app.real.integration.test.js` (7, vraie DB `babyfoot_test` via `tests/helpers/testDb.js` avec `TRUNCATE` + `initDb`), e2e `tests/e2e/api.e2e.test.js` (2, `RUN_E2E=1` → `localhost:33333`)
- **Front** `vitest` + `jsdom` + `@testing-library/react` : unit `src/utils/helpers.test.js` (17, `posteColor`/`shuffle`…), intégration `src/App.integration.test.jsx` (4, `App` + `fetch` mock)
- **E2E** `playwright` `web/e2e/app.e2e.spec.js` (5, `chromium`, `baseURL http://localhost:55174`) : accueil, inscription, tirage 1v1/2v2, stats
- Scripts `api/package.json` : `test`, `test:unit`, `test:integration`, `test:integration:real`, `test:e2e`, `test:db:setup` ; `web/package.json` : `test`, `test:e2e`

## 8. Hors périmètre v1 (inchangé) vs v2
- v1 : auth complexe, ELO, native — **v2 auth email+mdp et ligues ont été ajoutés + rôles admin/user + modération + seed démo + MVC**, reste : ELO auto, native, OAuth, notifications, filtres période

---
*MAJ 2026-09-04 — Code : `api/src/app.js` (`151`L) + `routes/*` `middleware/auth` `utils/helpers|moderation`, `api/src/db/schema.js` (`role`), `web/src/pages/*` (`12` pages), `landing/src/pages/index.astro`, `docker-compose.yml`, `Caddyfile.example` — HMR actif, `babyfootauboulot.dev`.*
