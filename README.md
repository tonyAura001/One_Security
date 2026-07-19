# PilotePME

Solution de gestion **dédiée** pour une entreprise de sécurité privée (Dakar) :
agents, sites gardés, rondes, incidents (main courante), conformité, contentieux
et reporting.

> **Mono-tenant.** Ce dépôt héberge une solution dédiée à un client unique
> (et non plus la plateforme SaaS multi-tenant d'origine). Le modèle de données
> et les interfaces sont simplifiés en conséquence.

## Structure du dépôt (monorepo)

```
One_Security/
├── src/            ← Frontend Next.js (racine — déployé sur Vercel)
├── public/
├── package.json    ← app front (Next 16 / React 19 / Tailwind v4)
├── aurantir-front-kit/   ← kit UI vendorisé (shell, design-system)
└── apps/
    └── api/        ← Backend NestJS 11 + Prisma 7  →  voir apps/api/README.md
```

Le **frontend reste à la racine** (Root Directory Vercel = `.`, déploiement
inchangé). Le **backend** vit dans `apps/api` avec sa propre toolchain (pnpm,
Prisma, Docker) — les deux stacks sont indépendantes (pas de workspace partagé).

| Partie | Stack | Hébergement |
|---|---|---|
| Frontend (racine) | Next.js 16 · React 19 · Tailwind v4 · shadcn | Vercel — auto-deploy depuis `main` |
| Backend (`apps/api`) | NestJS 11 · Prisma 7 · PostgreSQL | Docker → GHCR → hôte à définir |
| Auth | Supabase Auth (JWT, `app_metadata.role`) | — |

## Démarrage

**Frontend** (racine) :

```bash
pnpm install
cp .env.example .env.local    # NEXT_PUBLIC_SUPABASE_URL / ANON_KEY, NEXT_PUBLIC_API_URL
pnpm dev                      # http://localhost:3000
```

**Backend** (`apps/api`) :

```bash
cd apps/api
pnpm install
cp .env.example .env          # DATABASE_URL, SUPABASE_JWT_SECRET, …
pnpm db:migrate
pnpm start:dev                # http://localhost:4000/api  ·  docs /api/docs
```

Détails backend : [`apps/api/README.md`](apps/api/README.md) ·
Runbook de déploiement : [`apps/api/DEPLOY.md`](apps/api/DEPLOY.md).

## RBAC

10 rôles métier sécurité (`dg, rp, rf, rh, manager, controleur, surveillant,
juriste, comptable, agent`). Côté front, la source unique est `src/lib/rbac.ts`
(menus, `SCREEN_META`, `canAccess`) ; côté API, RBAC par rôle + permissions
(`@Roles` / `@Permissions`) avec RLS Supabase en défense en profondeur. Le rôle
courant est porté par `app_metadata.role` dans le JWT Supabase.

## Déploiement & CI

- **Front** : chaque `git push` sur `main` déclenche un build de production
  Vercel (alias `pilotepme-sandy.vercel.app`).
- **API** : workflow [`.github/workflows/api-ci.yml`](.github/workflows/api-ci.yml)
  — tests (Postgres) + build/push image Docker vers GHCR, déclenché uniquement
  sur les changements de `apps/api/**`.

## État & prochaines étapes

- [x] Frontend reconstruit, déployé, auth Supabase, RBAC 10 rôles
- [x] API construite (24 modèles Prisma, RBAC, `/me`, Swagger) — versionnée dans ce monorepo
- [ ] **Refactor mono-tenant** de l'API (retirer la logique multi-tenant : modèle, controllers, services, DTO, tests)
- [ ] Déployer l'API (Docker → hôte), renseigner `NEXT_PUBLIC_API_URL`, basculer `DEMO_AUTH=false`
- [ ] Brancher le front sur l'API réelle ; écrans `sites / rondes / incidents / conformite / contentieux`
- [ ] Migrations Supabase (RLS, Storage, sync `auth.users → User`)
