# État des lieux — Babyfoot — 2026-09-05 (dev:0.06)

## ✅ Fait (→ `ROADMAP.md` `roadmap.json` temps réel)
- **Infra** : `docker-compose.yml` 5 services `db:5432` (healthy), `api:33333` (`PORT`, `JWT_SECRET`, `ADMIN_EMAILS`, `CORS_ORIGIN`), `web:55174` (`VITE_API_URL=""`, proxy `/api→api:33333`, `host 0.0.0.0`), `landing:55175`, `studio` `profiles:dev` `https://local.drizzle.studio` (INTERDIT prod via `docker-compose.prod.yml` `127.0.0.1`). `0.0.0.0` LAN, `Caddyfile.example:12` `handle /api/*` avant `handle` + `HSTS` `Strict-Transport-Security` + `X-Frame-Options`.
- **DB** : `players`, `users` (`email/pseudo/password_hash/role admin|user` + `email_verified/verification_token/reset_token`), `ligues`, `ligue_members`, `matches` (`team_bleue/rouge` + `ligue_id`). `initDb` + `ALTER` + `ADMIN_EMAILS` promotion, `genSlug` `crypto` (`api/src/app.js:115`). Seed `api/src/db/seed.js` `32` users (`admin`/`demo` + 30) + `5` ligues + `120` matchs.
- **API** : Fastify `trustProxy:1` + `helmet` prod CSP/HSTS (`api/src/app.js:126`) + `cors` whitelist + `cookie` `httpOnly` `Secure` `SameSite=Lax` (`routes/auth.js:cookieOpts` `setCookie/clearCookie`), `middleware/auth` (`requireAuth`/`requireAdmin`/`isAdmin` + rate-limit 5/15min `login` + `register`/`resend`/`forgot` `getIpKey`, `X-Forwarded-For`), `utils/moderation` blocklist + `pseudo` 2-24 regex `a-z0-9._-`, `utils/helpers` (`slugify` `crypto`). Routes `auth` (`register`/`login`/`me`/`logout`/`verify`/`resend`/`forgot`/`reset`/`patch` whitelist `ALLOWED_COLS`/`change-password`/`delete` + `claim`), `ligues` (6) `isMember` fail-closed, `players` (3 + `claim` `requireAuth` PATCH), `matches`/`stats` `validateMatchPayload` 0-10, `admin` (3). JWT `HS256` `7d` avec `role`.
- **Front app** : React Vite Tailwind, `web/src/App.jsx` router + `13` pages `web/src/pages/*` (`Roadmap` publique `roadmap.json` temps réel, `MatchDetail` Solo/Duo + date `ven. 05 sept.` + bordure vainqueur `sky/rose`, `Stats` gated, `utils/auth` fix `F5` `authFetch` sans `Content-Type`), header `Déconnexion` + pill `user vert / admin rouge`. `Admin` modération + `demo`/`admin`.
- **Vitrine** : `landing/` Astro 5 (`src/pages/index.astro` hero `Mobile-first`, `How` `Crée/Joue/Suis`, footer `© 2026`), `astro.config.mjs`.
- **Tests** : `api` `24 passed` (12 unit, 5 mock, 7 real DB `babyfoot_test`), `web` `21 passed` (17 helpers, 4 App), `playwright` 5, `api` e2e 2 avec `RUN_E2E=1`. `db:seed` `db:studio`.
- **Roadmap** : `ROADMAP.md` + `cahier-des-charges-babyfoot.md:3.6` + `ETAT_DES_LIEUX.md` + `web/src/pages/roadmap.json` + `Roadmap.jsx` synchro temps réel `0.01→0.11` (feature/revision/bugfix, `0.07` tournoi TODO).

## 🟡 Partiellement
- `httpOnly` cookie principal mais `localStorage` gardé en fallback transitoire (à supprimer 100% en prod stricte si souhaité).
- `invite_code` affiché vs `Voir/Masquer` à uniformiser (non bloquant).
- Stats par poste non agrégées (données prêtes).

## ❌ Reste avant prod (mineur)
- Revoke JWT 7j (blacklist `logout`/`change-password`) — non bloquant si cookie `clearCookie` + courte durée future `JWT_EXPIRES`.
- Optionnel: `invite_code` masqué par défaut partout + `USER node` déjà fait, `npm ci` prod déjà.

## ▶️ Tester
```bash
docker compose up -d --build
# landing http://localhost:55175 → babyfootauboulot.dev
# app http://localhost:55174 → app.babyfootauboulot.dev
# api http://localhost:33333/health
docker compose exec api npm run db:seed:clean # admin@example.com/admin1234 + demo@example.com/demo1234
# ou demo@example.com/demo1234 (user)
cd api && docker compose exec api npm run test # 24 passed
cd web && npm run test # 21 passed
```
