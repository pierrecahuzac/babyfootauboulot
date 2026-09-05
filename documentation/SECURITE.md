# Sécurité — Babyfoot au boulot — MAJ 2026-09-05 (dev:P0)

> Audit `dev:ec906d4` → MAJ `P0 2026-09-05` — 3 niveaux : 🔴 Rouge (CRITICAL, exploitable), 🟠 Orange (HIGH/MEDIUM, durcissement), 🟢 Vert (positif / bonne pratique). Ref `fichier:ligne`.

---

## 🔴 Rouge — Bloquant prod (à corriger immédiatement)

| # | Fichier:ligne | Risque | Statut |
|---|---------------|--------|--------|
| R1 | `api/src/utils/auth.js:4` | `JWT_SECRET \|\| 'dev-secret...'` fallback hardcodé → tokens signables en prod sans secret | ✅ Fix partiel `throw` en prod (`auth.js:4`), reste à tester hors compose |
| R2 | `api/src/utils/auth.js:11` | `jwt.verify` sans `algorithms:['HS256']` → surface `alg:none` | ✅ Fix `auth.js:11` whitelist HS256 |
| R3 | `api/src/app.js:154` | `cors {origin:true, credentials:true}` wildcard + creds → exfiltration | ✅ Fix whitelist `CORS_ORIGIN` (`app.js:165`), mais à restreindre en prod |
| R4 | `api/src/app.js:214,311,335,437` | `verificationToken`/`resetToken` renvoyés en clair même en prod | ✅ Fix `hashToken` + `NODE_ENV==='production'` guard sur `register`/`resend`/`forgot`/`PATCH /me` (`api/src/routes/auth.js:58,159,185,304`) |
| R5 | `api/src/routes/ligues.js:11` `players.js:10` `matches.js:9` | `isMember()=>true` si tables non injectées → bypass ligue | ✅ Fix `return false` fail-closed (`isMember` 3 fichiers) |
| R6 | `web/src/utils/auth.js:3` | JWT `localStorage` → XSS = vol immédiat | ✅ `httpOnly` `Secure` `SameSite=Lax` cookie posé (`api/src/routes/auth.js:cookieOpts` `reply.setCookie/clearCookie`) + `authFetch` `credentials:'include'` + fallback `localStorage` (migration progressive) |
| R7 | `web/src/App.jsx:151,409` | Token reset/verify dans `?reset`/`?verify` URL → history/Referer | ✅ Fix `history.replaceState` + plus de `pushState` token (`App.jsx:Forgot`→`Reset` via state, `VerifyEmail.jsx:8`/`Reset.jsx:8` clean URL) |
| R8 | `web/index.html:1` | Pas de CSP/HSTS | ✅ Fix `helmet` prod CSP + HSTS (`api/src/app.js:126` `contentSecurityPolicy` + `hsts`) + `web/index.html:4` meta CSP |
| R9 | `Caddyfile.example:14` | `handle { /* }` avant `handle /api/*` → `/api/*` jamais atteint, 404 | ✅ Fix ordre `handle /api/*` avant `handle` + `header HSTS` (`Caddyfile.example:12`) |
| R10 | `docker-compose.yml:11` | `db` `ports: 0.0.0.0:5432` hérité en prod → DB exposée | ✅ Fix `docker-compose.prod.yml:10` `127.0.0.1` restreint + `docker-compose.yml:12` LAN voulu |

## 🟠 Orange — HIGH / MEDIUM (durcissement prioritaire)

**Backend**
- `JWT_EXPIRES 7d` sans revoke/blacklist (`auth.js:5`), `logout` no-op (`app.js:261`) — ✅ Fix `logout` `clearCookie` (`auth.js:109`), reste revoke 7j à faire (blacklist future).
- `genInvite`/`genSlug` `Math.random()` (`app.js:8`) prévisible → brute-force `invite_code 6` (`36^6 ~2M`). ✅ Fix `crypto.randomBytes` (`api/src/utils/helpers.js:4` + `api/src/app.js:115` `genSlug('boulot')`).
- Rate-limit seul sur `login` (`app.js:19`), pas `register/forgot/resend`, Map mémoire + `X-Forwarded-For` spoofable sans `trustProxy` (`app.js:55` `trustProxy:1` ajouté). ✅ Fix `register`/`resend`/`forgot` rate-limit 5/15min `getIpKey` (`api/src/middleware/auth.js:54` + `api/src/routes/auth.js:12`).
- `if(!ligueId) return true` (`app.js:643`) → `players/matches/stats` sans ligue = global sans auth (IDOR). ✅ Partiel: `isMember` fail-closed, `PATCH /players/:id` `requireAuth` (`players.js:67`), `POST /players` reste ouvert pour invité (voulu) avec validation renforcée.
- `UPDATE users SET ${setClauses}` (`app.js:415`) colonne non whitelistée. ✅ Fix whitelist `ALLOWED_COLS` (`api/src/routes/auth.js:265`).
- Tokens stockés en clair (hash manquant) → fuite DB. ✅ `hashToken` ajouté.
- Pas `helmet`/`rate-limit` global. ✅ `@fastify/helmet` prod CSP/HSTS (`api/src/app.js:126`).

**Frontend**
- `pseudo`/`ligue.name` sans validation client (`App.jsx:270`, `helpers.js`) → Stored XSS futur si `innerHTML`. ✅ Fix backend `pseudo` 2-24 `^[a-zA-Z0-9._-]+$` + `ligue.name` 2-40 (`auth.js:14` `players.js:54` `ligues.js:20`), front React escape déjà.
- Validation scores `0-10` manquante (`App.jsx:702`, `validateMatchPayload`), `pseudo` sans `maxlength`/`regex`. ✅ Fix `validateMatchPayload` 0-10 int (`api/src/utils/stats.js:37`).
- `invite_code` affiché en clair dans `Profil` (`App.jsx:662`) vs `Voir/Masquer` ailleurs, clipboard persistant. → Reste à uniformiser (non bloquant).
- `vite.config.js:7` `host 0.0.0.0` + `http://api:33333` MITM intra-docker. → LAN voulu, prod via Caddy HTTPS.

**Infra**
- `api/Dockerfile:1` `node:20-alpine` non pinné digest, `USER root`, `npm install` vs `npm ci --omit=dev`, pas `HEALTHCHECK`. ✅ Fix pinné `20.18.1-alpine`, `USER node`, `npm ci --omit=dev` en prod, `HEALTHCHECK` (`api/Dockerfile:1`, `web/Dockerfile:1`, `landing/Dockerfile:1`).
- `web/landing/Dockerfile:5` `COPY . ./` sans `.dockerignore` → `.env` fuit dans image (`web/.dockerignore` manquant). ✅ Fix `web/.dockerignore` + `landing/.dockerignore` + `api/.dockerignore` `.env` ignoré.
- `api/drizzle.config.js:14` fallback `postgres://babyfoot:babyfoot@localhost` silencieux en prod. ✅ Fix `throw` si `NODE_ENV===production && !DATABASE_URL` (`drizzle.config.js:7`).

## 🟢 Vert — Positif / Déjà en place

- `pool.query` paramétré `$1` partout sauf 1 cas → bonne protection SQLi.
- `bcrypt.hash(10)` + `compare` (`auth.js:7`).
- `CHECK` DB `poste`/`niveau`/`format` (`app.js:59`), `emailVerified` expiry, `rate-limit login` même partiel.
- `profiles: ["dev","tools"]` studio dev-only (`docker-compose.yml:90`), `docker-compose.prod.yml` sans studio.
- `env_file + :?` fail-closed (`docker-compose.yml:23`, `docker-compose.prod.yml:10`) — fix `ec906d4`.
- Frontend `0` `dangerouslySetInnerHTML`, React auto-escape (`App.jsx:270`).
- `border-2 border-zinc-200` dark variants ajoutés (`web/src/App.jsx:102`, `index.css:2` `@custom-variant dark`).

---

## Plan P0 — Fait 2026-09-05

1. Backend `isMember` fail-closed + `UPDATE` whitelist + `hashToken` prod guard + `httpOnly` cookie + `rate-limit` register/resend/forgot ✅
2. Frontend `history.replaceState` + CSP `index.html` + `httpOnly` `credentials:include` + token URL purgé ✅
3. Infra `Caddy` ordre `handle /api/*` first + `HSTS`, `db` `127.0.0.1` prod, Docker `USER node` + `.dockerignore` + `npm ci` + `HEALTHCHECK` + `drizzle.config` prod guard ✅
4. Tests `api 24 passed` `web 21 passed`, `docker compose config` OK, `api` restart OK

> Fichier généré pour suivi — à mettre à jour à chaque fix P0. Ne jamais commit `.env` (`/.gitignore:2`).
