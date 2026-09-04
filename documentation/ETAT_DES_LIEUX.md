# État des lieux — Babyfoot — 2026-09-04

## ✅ Fait
- **Infra** : `docker-compose.yml` 4 services `db:5432` (healthy), `api:33333` (`PORT`, `JWT_SECRET`, volumes HMR), `web:55174` (`VITE_API_URL=""`, proxy `/api→api:33333`, `host 0.0.0.0`, `usePolling`), `landing:55175` (Astro). `0.0.0.0` pour LAN `192.168.1.181`. Plus de reverse proxy local, `Caddyfile.example` prêt pour prod `babyfootauboulot.dev` / `app.babyfootauboulot.dev`.
- **DB** : `players`, `users` (email/pseudo/password_hash), `ligues`, `ligue_members`, `matches` (team_bleue/rouge + legacy team_a/b + `ligue_id`). `initDb` gère `CREATE IF NOT EXISTS`, `ALTER ADD`, `DROP NOT NULL`, migration `team_a→team_bleue` et ligue par défaut `Boulot`.
- **API** : Fastify, `src/app.js` factory `createApp`, `src/utils/stats.js` (`normalizeMatch`, `calculateClassement`, `validateMatchPayload`, `shuffle`, `randomTeams` en `const ... = () =>`), `src/utils/auth.js` (`bcryptjs`+`jsonwebtoken` 7j). Routes `auth/register|login|me|logout`, `ligues` (create/join/list/members, invite_code 6), `players`, `matches`, `stats` scopés par `ligue_id` + `isMember` check. `src/index.js` passe `ligues/ligueMembers`.
- **Front app** : React Vite Tailwind coloré (gradient amber→emerald, bleu/rouge), `App.jsx` arrow functions, `useState`/`refresh`/`loadMe`/`loadLigues`, `localStorage babyfoot_token` + `babyfoot_ligue_id`, header `BABYFOOT AU BOULOT` + auth, barre ligue + `Ligues` (créer/rejoindre par code privé), `Accueil` (ligue active + invite_code), `CreateMatch` 1v1/2v2 avec **chaque liste = un poste** (`⚡ Attaque`/`🛡️ Défense`, `toTeam(pseudo,poste)`), `🎲 Tirage aléatoire` distinct, `Stats` podium + `Derniers matchs` avec poste `⚡/🛡️`.
- **Vitrine** : `landing/` Astro 5 + Tailwind, `src/pages/index.astro` (hero, Features 1v1/2v2, How vitrine→app→hébergement, CTA `app.babyfootauboulot.dev`), `astro.config.mjs` + `@tailwindcss/vite`, `Dockerfile` + service `landing`.
- **Tests** : Back `api` 24 passed (12 unit, 5 mock int, 7 real DB `babyfoot_test` via `tests/helpers/testDb.js`), Front `web` 21 passed (17 unit helpers, 4 int App), E2E `playwright` 5 passed (chromium `localhost:55174`), `api` e2e 2 passed avec `RUN_E2E=1`. Test DB `babyfoot_test` isolée (`TRUNCATE` avant chaque test, `ensureDbExists` crée la DB si besoin). Scripts `test`, `test:unit`, `test:integration`, `test:e2e`.
- **Qualité** : renommage `Équipe A/B → Bleue/Rouge`, arrow `const a = () =>`, couleurs, `wireframes.md`/`cahier` mis à jour.

## 🟡 Partiellement / à peaufiner
- `POST /api/matches` et `GET /api/stats` sont scopés par ligue mais restent accessibles sans `ligue_id` (compat). Pour prod, on devrait exiger `ligue_id` si user a une ligue.
- Gestion ligue : pas encore de renommer / régénérer code / quitter / supprimer / kicker. `owner` vs `member` non différencié côté front.
- Auth : pas de vérif email, pas de reset password, pas d'OAuth, JWT stocké en `localStorage` (MVP) vs `httpOnly` cookie.
- Stats par poste : données `poste` stockées mais pas agrégées (`meilleur attaquant`).
- Build prod : `web` et `landing` tournent en `dev` (`npm run dev`), pas de `build` + `preview`/`nginx` pour prod.

## ❌ Reste à faire (priorisé)
1. **Prod** : `npm run build` + servir `dist` (Caddy `file_server`), `JWT_SECRET` fort via `.env`, `VITE_APP_URL=https://app.babyfootauboulot.dev`, HTTPS Caddy, `docker-compose.prod.yml`.
2. **Ligues** : UI owner (régénérer invite_code, voir membres, quitter), `DELETE /api/ligues/:id`, `POST /api/ligues/:id/leave`.
3. **Auth** : vérif email, `POST /api/auth/forgot`, `reset`, validation `email` format, rate-limit login.
4. **Stats bonus** : `stats?poste=Attaque`, `stats?period=week`, duo gagnant, `WATCHPACK` → prod.
5. **CI** : GitHub Actions `npm test` (api + web) + `playwright` + `docker compose up` test DB.
6. **Nettoyage** : `cahier-des-charges-babyfoot.md` v2 déjà MAJ, `wireframes.md` à MAJ pour ligues/auth, `ETAT_DES_LIEUX.md` à garder à jour.

## ▶️ Pour tester maintenant
```bash
docker compose up -d --build
# landing  http://localhost:55175 → babyfootauboulot.dev
# app      http://localhost:55174 → app.babyfootauboulot.dev (ou 192.168.1.181:55174)
# api      http://localhost:33333/health
# créer compte → créer ligue (code 6) → le donner en main propre → rejoindre → créer match 2v2 Attaque/Défense → stats par ligue
cd api && npm test && RUN_E2E=1 npm run test:e2e
cd ../web && npx vitest run && npx playwright test
```
