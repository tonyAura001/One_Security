# PilotePME — Runbook de déploiement

Étapes manuelles (credentials, DNS, secrets) pour passer en staging/production.

## 1. Provisionner Supabase (partie 5)

1. Créer un projet sur https://supabase.com.
2. Récupérer (Settings → API / Database) :
   - `Project URL` → `SUPABASE_URL`
   - `anon key` → `SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (secret !)
   - `JWT Secret` → `SUPABASE_JWT_SECRET`
   - `Connection string` (Database) → `DATABASE_URL` (pooler 6543) + `DIRECT_URL` (direct 5432)
3. **Migrations Prisma** sur la base de prod :
   ```bash
   DATABASE_URL="…direct 5432…" pnpm db:deploy
   pnpm db:seed        # 10 rôles + permissions (optionnel en prod)
   ```
4. **Trigger de sync + RLS** — appliquer, dans l'ordre, sur la base Supabase
   (SQL Editor ou `supabase db push`) :
   - `supabase/migrations/20260101000000_sync_auth_users.sql`
   - `supabase/migrations/20260101000001_rls_rbac.sql`
5. **Auth** : activer Email/Password (Authentication → Providers), et les OAuth
   souhaités. Le rôle métier se met dans `app_metadata.role` (via un hook ou
   l'API admin) pour être présent dans le JWT.

> ⚠️ Bien tester les policies RLS sur `User` / `UtilisateurRole` (cloisonnement)
> avant d'ouvrir un accès direct au front.

## 2. Déployer l'API (parties 3 & 4)

L'image Docker est construite et poussée sur **GHCR** par la CI
(`.github/workflows/ci.yml`) à chaque push `main` (après tests verts).

Sur le provider choisi (Railway / Render / Fly / Cloud Run…) :
1. Déployer l'image `ghcr.io/<repo>:latest`.
2. Variables d'environnement : `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `PORT=4000`, `NODE_ENV=production`.
3. Exposer le port `4000` (le conteneur lance `db:deploy` puis `node dist/main`).
4. Domaine + certificat SSL (géré par le provider ou via un reverse proxy).
5. Vérifier : `GET https://<api>/api/health` → 200, `GET /api/docs` → Swagger.

### Railway (procédure retenue)

Le dépôt fournit `railway.json` (builder Dockerfile + healthcheck `/api/health`).

```bash
# depuis apps/api
railway login                     # interactif (navigateur)
railway init                      # créer le projet, ou: railway link
# Variables (ne PAS committer les valeurs) — via dashboard ou CLI :
railway variables \
  --set "DATABASE_URL=…pooler 6543…" \
  --set "DIRECT_URL=…direct 5432…" \
  --set "SUPABASE_URL=https://wypoifuwyylvbzuwmuct.supabase.co" \
  --set "SUPABASE_ANON_KEY=…" \
  --set "SUPABASE_SERVICE_ROLE_KEY=…" \
  --set "SUPABASE_JWT_SECRET=…" \
  --set "NODE_ENV=production" \
  --set "CORS_ORIGINS=https://pilotepme-sandy.vercel.app"
railway up                        # build Dockerfile + déploie (db:deploy au boot)
railway domain                    # génère un domaine public
```

Railway injecte `PORT` automatiquement (l'app lit `process.env.PORT`). Le
conteneur applique les migrations (`pnpm db:deploy`) au démarrage.

### Secrets CI (GitHub → Settings → Secrets)
- GHCR : aucun secret requis (utilise `GITHUB_TOKEN`).
- DockerHub (alternative) : `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` — remplacer
  le job `docker` (login-action registry `docker.io`, tags `docker.io/<user>/pilotepme-api`).

## 3. Connexion du front (partie 6)

1. Front (`TT_Secuirity`) : définir `NEXT_PUBLIC_API_URL=https://<api>/api`
   (variable d'env Vercel).
2. Login/signup via `@supabase/supabase-js` (`signInWithPassword`) → récupérer
   l'`access_token` (JWT) → `fetchMyPermissions(token)` (`lib/api/me.ts`) →
   `useAccessStore.setApiPermissions(...)`.
3. Stocker/rafraîchir le token (Supabase gère le refresh côté client).
4. **CORS** : dans `src/main.ts`, remplacer `app.enableCors()` par
   `app.enableCors({ origin: ['https://pilotepme-sandy.vercel.app'], credentials: true })`.
5. Tester les appels sécurisés (401 sans token, 403 selon rôle).

## Points d'attention
- Monitorer logs & métriques API (latence, erreurs 4xx/5xx).
- Migration de données initiale : `db:seed` (référentiels) puis import métier.
- Documenter DNS/secrets hors dépôt (gestionnaire de secrets).
