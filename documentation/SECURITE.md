# Sécurité — Babyfoot au boulot — 2026-09-04

> Audit `dev:ec906d4` — 3 niveaux : 🔴 Rouge (CRITICAL, exploitable), 🟠 Orange (HIGH/MEDIUM, durcissement), 🟢 Vert (positif / bonne pratique). Ref `fichier:ligne`.

---

## 🔴 Rouge — Bloquant prod (à corriger immédiatement)

| # | Fichier:ligne | Risque | Statut |
|---|---------------|--------|--------|
| R1 | `api/src/utils/auth.js:4` | `JWT_SECRET \|\| 'dev-secret...'` fallback hardcodé → tokens signables en prod sans secret | ✅ Fix partiel `throw` en prod (`auth.js:4`), reste à tester hors compose |
| R2 | `api/src/utils/auth.js:11` | `jwt.verify` sans `algorithms:['HS256']` → surface `alg:none` | ✅ Fix `auth.js:11` whitelist HS256 |
| R3 | `api/src/app.js:154` | `cors {origin:true, credentials:true}` wildcard + creds → exfiltration | ✅ Fix whitelist `CORS_ORIGIN` (`app.js:165`), mais à restreindre en prod |
| R4 | `api/src/app.js:214,311,335,437` | `verificationToken`/`resetToken` renvoyés en clair même en prod | 🟡 En cours — hash `sha256` stocké (`auth.js:9` `hashToken`), leak conditionné `NODE_ENV!=='production'` à finaliser |
| R5 | `api/src/app.js:505` | `isMember()=>true` si tables non injectées → bypass ligue | À faire — fail-closed |
| R6 | `web/src/utils/auth.js:3` | JWT `localStorage` → XSS = vol immédiat | 🟡 `httpOnly` cookie ajouté côté API (`@fastify/cookie`, `app.js:168`), frontend migrera `localStorage→cookie` + `credentials:'include'` |
| R7 | `web/src/App.jsx:151,409` | Token reset/verify dans `?reset`/`?verify` URL → history/Referer | 🟡 Fix `history.replaceState` ajouté, reste à purger |
| R8 | `web/index.html:1` | Pas de CSP/HSTS | À faire — `helmet` API déjà (`app.js:162`), `index.html` CSP `default-src 'self'` à ajouter |
| R9 | `Caddyfile.example:14` | `handle { /* }` avant `handle /api/*` → `/api/*` jamais atteint, 404 | À faire — inverser ordre + `header HSTS` |
| R10 | `docker-compose.yml:11` | `db` `ports: 0.0.0.0:5432` hérité en prod → DB exposée | ✅ Fix `docker-compose.prod.yml:10` `ports` restreint, mais `docker-compose.yml` dev reste `0.0.0.0` voulu LAN |

## 🟠 Orange — HIGH / MEDIUM (durcissement prioritaire)

**Backend**
- `JWT_EXPIRES 7d` sans revoke/blacklist (`auth.js:5`), `logout` no-op (`app.js:261`) — tokens 7j valides après vol/change-password.
- `genInvite`/`genSlug` `Math.random()` (`app.js:8`) prévisible → brute-force `invite_code 6` (`36^6 ~2M`). ✅ Fix `crypto.randomBytes` (`app.js:9`).
- Rate-limit seul sur `login` (`app.js:19`), pas `register/forgot/resend`, Map mémoire + `X-Forwarded-For` spoofable sans `trustProxy` (`app.js:55` `trustProxy:1` ajouté).
- `if(!ligueId) return true` (`app.js:643`) → `players/matches/stats` sans ligue = global sans auth (IDOR). `POST /api/players` / `PATCH /players/:id` sans `requireAuth`.
- `UPDATE users SET ${setClauses}` (`app.js:415`) colonne non whitelistée.
- Tokens stockés en clair (hash manquant) → fuite DB. ✅ `hashToken` ajouté.
- Pas `helmet`/`rate-limit` global. ✅ `@fastify/helmet` ajouté (`package.json:23`), recouvre headers.

**Frontend**
- `pseudo`/`ligue.name` sans validation client (`App.jsx:270`, `helpers.js`) → Stored XSS futur si `innerHTML`.
- Validation scores `0-10` manquante (`App.jsx:702`, `validateMatchPayload`), `pseudo` sans `maxlength`/`regex`.
- `invite_code` affiché en clair dans `Profil` (`App.jsx:662`) vs `Voir/Masquer` ailleurs, clipboard persistant.
- `vite.config.js:7` `host 0.0.0.0` + `http://api:33333` MITM intra-docker.

**Infra**
- `api/Dockerfile:1` `node:20-alpine` non pinné digest, `USER root`, `npm install` vs `npm ci --omit=dev`, pas `HEALTHCHECK`.
- `web/landing/Dockerfile:5` `COPY . ./` sans `.dockerignore` → `.env` fuit dans image (`web/.dockerignore` manquant).
- `api/drizzle.config.js:14` fallback `postgres://babyfoot:babyfoot@localhost` silencieux en prod.

## 🟢 Vert — Positif / Déjà en place

- `pool.query` paramétré `$1` partout sauf 1 cas → bonne protection SQLi.
- `bcrypt.hash(10)` + `compare` (`auth.js:7`).
- `CHECK` DB `poste`/`niveau`/`format` (`app.js:59`), `emailVerified` expiry, `rate-limit login` même partiel.
- `profiles: ["dev","tools"]` studio dev-only (`docker-compose.yml:90`), `docker-compose.prod.yml` sans studio.
- `env_file + :?` fail-closed (`docker-compose.yml:23`, `docker-compose.prod.yml:10`) — fix `ec906d4`.
- Frontend `0` `dangerouslySetInnerHTML`, React auto-escape (`App.jsx:270`).
- `border-2 border-zinc-200` dark variants ajoutés (`web/src/App.jsx:102`, `index.css:2` `@custom-variant dark`).

---

## Plan P0 (en cours — toi: "oui")

1. Backend `auth.js` fail-closed + `helmet` + CORS whitelist ✅ partiel
2. Frontend `history.replaceState` + CSP `index.html` + `httpOnly` cookie 🟡
3. Infra `Caddy` ordre + HSTS, `db` `127.0.0.1:5432` prod, Docker `USER node` + `.dockerignore` 🟡
4. Tests `api 24 passed` `web 21 passed`, `ec906d4` push dev

> Fichier généré pour suivi — à mettre à jour à chaque fix P0. Ne jamais commit `.env` (`/.gitignore:2`).
