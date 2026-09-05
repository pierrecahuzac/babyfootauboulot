# État des lieux — Babyfoot — 2026-09-05 (dev:0.08)

## ✅ Fait (→ `ROADMAP.md` `roadmap.json` temps réel)
- **Infra** : `docker-compose.yml` 5 services `db:5432` (healthy), `api:33333` (`PORT`, `JWT_SECRET`, `ADMIN_EMAILS`, `CORS_ORIGIN`), `web:55174` (`VITE_API_URL=""`, proxy `/api→api:33333`, `host 0.0.0.0`), `landing:55175`, `studio` `profiles:dev` `https://local.drizzle.studio` (INTERDIT prod via `docker-compose.prod.yml` `127.0.0.1`). `0.0.0.0` LAN, `Caddyfile.example:12` `handle /api/*` avant `handle` + `HSTS` `Strict-Transport-Security` + `X-Frame-Options`. Prod Vercel 2 projets `babyfootauboulot.vercel.app` (app) + `babyfootauboulot-landing.vercel.app` (landing) + Render `babyfootauboulot.onrender.com` (`/health`), `AGENTS.md`/`opencode.json` (`instructions`, `permission git push main ask`).
- **DB** : `players`, `users` (`email/pseudo/password_hash/role admin|user` + `email_verified/verification_token/reset_token`), `ligues`, `ligue_members`, `matches` (`team_bleue/rouge` + `ligue_id`). `initDb` + `ALTER` + `ADMIN_EMAILS` promotion + `email_verified=1` auto-vérif prod (`api/src/app.js:86`), `genSlug` `crypto` (`api/src/app.js:115`). Seed `api/src/db/seed.js` démo prod `17` users (`admin`/`demo`+15) + `5` ligues publiques `is_private=0` + `70` matchs `14×5` (complet `32/5/120`), `db:seed:demo` + `isPublicLigue` bypass.
- **API** : Fastify `trustProxy:1` + `helmet` prod CSP/HSTS (`api/src/app.js:126`) + `cors` whitelist `babyfootauboulot.vercel.app`+`landing` + `cookie` `httpOnly` `Secure` `SameSite=Lax` (`routes/auth.js:cookieOpts` `setCookie/clearCookie`), `middleware/auth` (`requireAuth`/`requireAdmin`/`isAdmin` + rate-limit 5/15min `login` + `register`/`resend`/`forgot` `getIpKey`, `X-Forwarded-For`), `utils/moderation` blocklist + `pseudo` 2-24 regex `a-z0-9._-`, `utils/helpers` (`slugify` `crypto`). Routes `auth` vérif désactivée `register` auto-vérifié `410` sur `verify`/`resend` + `PATCH /me` ne reset plus (`bebc59c`), `ligues` (6) `isMember` + `isPublicLigue` (publiques visibles par tous), `players`/`matches`/`stats` `isPublicLigue` bypass lecture, `matches`/`stats` `validateMatchPayload` 0-10 `1v1` sans poste, `admin` (3). JWT `HS256` `7d` avec `role`.
- **Front app** : React Vite Tailwind, `web/src/App.jsx` router `view` + `#register` hash + `VerifyEmail` désactivé, `13` pages `web/src/pages/*` (`Roadmap` publique `roadmap.json` temps réel, `MatchDetail` Solo/Duo date + bordure vainqueur + masque `· poste` en `1v1`, `CreateMatch.jsx` `1v1` sans poste + `🎲` joueurs+postes aléatoires `2v2`, `Stats.jsx` masque poste `1v1`, `utils/auth` fix `F5`), header `Déconnexion` + pill `user vert / admin rouge`. `Admin` modération + `demo`/`admin`.
- **Vitrine** : `landing/` Astro 5 (`src/pages/index.astro` hero `Mobile-first` + CTA `PUBLIC_APP_URL` -> `babyfootauboulot.vercel.app/#register`, `How` `Crée/Joue/Suis`, footer `© 2026`), `astro.config.mjs`.
- **Tests** : `api` `24 passed` (12 unit, 5 mock, 7 real DB `babyfoot_test`), `web` `21 passed` (17 helpers, 4 App), `playwright` 5, `api` e2e 2 avec `RUN_E2E=1`. `db:seed` `db:seed:demo` `db:studio`.
- **Roadmap** : `ROADMAP.md` + `cahier-des-charges-babyfoot.md:3.6` + `ETAT_DES_LIEUX.md` + `web/src/pages/roadmap.json` + `Roadmap.jsx` synchro temps réel `0.01→0.13` (feature/revision/bugfix, `0.09` tournoi TODO).

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
