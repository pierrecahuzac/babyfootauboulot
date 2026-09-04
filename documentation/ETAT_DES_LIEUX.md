# État des lieux — Babyfoot — 2026-09-04 (dev:ea27642)

## ✅ Fait
- **Infra** : `docker-compose.yml` 5 services `db:5432` (healthy), `api:33333` (`PORT`, `JWT_SECRET`, `ADMIN_EMAILS`, `CORS_ORIGIN`), `web:55174` (`VITE_API_URL=""`, proxy `/api→api:33333`, `host 0.0.0.0`), `landing:55175`, `studio` `profiles:dev` `https://local.drizzle.studio` (INTERDIT prod via `docker-compose.prod.yml`). `0.0.0.0` pour réseau local, `Caddyfile.example` prod `babyfootauboulot.dev` / `app.babyfootauboulot.dev`.
- **DB** : `players`, `users` (`email/pseudo/password_hash/role admin|user` + `email_verified/verification_token/reset_token`), `ligues`, `ligue_members`, `matches` (`team_bleue/rouge` + `ligue_id`). `initDb` + `ALTER` + `ADMIN_EMAILS` promotion. Seed `api/src/db/seed.js` `32` users (`admin`/`demo` + 30) + `5` ligues + `120` matchs.
- **API** : Fastify `trustProxy:1` + `helmet` + `cors` whitelist + `cookie`, `middleware/auth` (`requireAuth`/`requireAdmin`/`isAdmin` + rate-limit 5/15min + `X-Forwarded-For`), `utils/moderation` blocklist, `utils/helpers` (`slugify` `crypto`). Routes `auth` (`register`/`login`/`me`/`logout`/`verify`/`resend`/`forgot`/`reset`/`patch`/`change-password`/`delete` + `claim` invité), `ligues` (6), `players` (3 + `claim`), `matches`/`stats`, `admin` (3). JWT `HS256` `7d` avec `role`.
- **Front app** : React Vite Tailwind, `web/src/App.jsx` `194`L router + `12` pages `web/src/pages/*` (`Accueil`, `Register`, `Login`, `Forgot`, `Reset`, `VerifyEmail`, `Ligues`, `Profil`, `Inscription`, `CreateMatch`, `Stats`, `Admin`), `utils/auth` `localStorage` + `authFetch`, thème sombre par défaut `babyfoot_theme` `🌙/☀️`, `Admin` modération + `demo`/`admin` comptes.
- **Vitrine** : `landing/` Astro 5 (`src/pages/index.astro` hero `Mobile-first`, `How` `Crée/Joue/Suis`, footer `© 2026`), `astro.config.mjs`.
- **Tests** : `api` `24 passed` (12 unit, 5 mock, 7 real DB `babyfoot_test`), `web` `21 passed` (17 helpers, 4 App), `playwright` 5, `api` e2e 2 avec `RUN_E2E=1`. `db:seed` `db:studio`.

## 🟡 Partiellement
- `isMember` reste `return true` si tables manquantes (fail-open mock) — à passer fail-closed.
- `httpOnly` cookie posé côté API mais front encore `localStorage` (migration en cours).
- `Caddy` `handle` ordre à vérifier + `HSTS` headers, `db` `127.0.0.1` en prod déjà via `docker-compose.prod.yml`.
- Stats par poste non agrégées.

## ❌ Reste avant prod (SECURITE.md 🔴/🟠)
- `isMember` + `UPDATE` whitelist, `helmet` prod complet, `httpOnly` front, CSP `index.html`, Docker `USER node` + `.dockerignore` `web/landing`, `npm ci --omit=dev`.

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
