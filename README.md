# PilotePME — Frontend

Plateforme SaaS de pilotage pour les **entreprises de sécurité privée** :
gestion des agents, sites gardés, planning des vacations, main courante
(incidents) et reporting.

## Stack

| Domaine | Choix |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Langage | TypeScript (strict) |
| Styles | Tailwind CSS 4 + shadcn/ui (Radix, style *new-york*) |
| Thème | « Aurantir » — base slate, accent ambre, dark mode par défaut |
| Data / cache | TanStack React Query + Axios |
| Formulaires | react-hook-form + Zod (via Standard Schema resolver) |
| Graphiques | Recharts (wrappers shadcn `chart`) |
| Cartes | Leaflet / react-leaflet (chargé en `dynamic ssr:false`) |
| Notifications | Sonner |

## Démarrage

```bash
pnpm install
cp .env.example .env.local   # renseigner NEXT_PUBLIC_API_URL
pnpm dev                     # http://localhost:3000
```

Scripts : `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm lint`
Typecheck : `pnpm exec tsc --noEmit`

## Architecture

```
src/
├── app/
│   ├── (app)/              # Espace authentifié (shell sidebar + header)
│   │   ├── layout.tsx      # SidebarProvider + AppSidebar + AppHeader
│   │   ├── dashboard/      # KPI, graphiques, carte
│   │   ├── agents/  sites/  incidents/  planning/  reports/  settings/  tenants/
│   ├── (auth)/login/       # Écrans hors-shell (connexion)
│   ├── layout.tsx          # <html lang=fr> + Providers globaux
│   └── globals.css         # Thème (tokens oklch, palette graphiques)
├── components/
│   ├── ui/                 # Primitives shadcn (générées, éditables)
│   ├── layout/             # Sidebar, header, theme-toggle, user-menu…
│   ├── shared/             # StatCard, PageHeader, badges métier, guards…
│   ├── charts/             # Wrappers Recharts
│   ├── maps/               # Carte Leaflet + wrapper client
│   ├── settings/  auth/    # Formulaires par domaine
│   └── providers/          # Theme + React Query + Session + Tooltip + Toaster
├── config/
│   ├── roles.ts            # RBAC : permissions par rôle, can()/hasRole()
│   ├── nav.ts              # Navigation (filtrée par permission)
│   └── site.ts
├── lib/
│   ├── api/client.ts       # Axios + injection JWT + normalisation erreurs
│   ├── auth/session.tsx    # Contexte session (démo, swappable → JWT/me)
│   ├── format.ts           # Formatage fr-FR
│   └── mock-data.ts        # Données typées (temporaire, forme = future API)
└── types/                  # Types du domaine (Agent, Site, Incident, Shift…)
```

## RBAC

Six rôles : `SUPER_ADMIN`, `DIRIGEANT`, `EXPLOITATION`, `SUPERVISEUR`,
`AGENT`, `CLIENT`. Les permissions (`ressource:action`) sont centralisées
dans `src/config/roles.ts`. La navigation et les pages sont filtrées via
`can(permission)` ; `<RequirePermission>` protège l'accès direct par URL
(défense en profondeur — l'autorité fait foi côté backend).

> **Mode démonstration** : un sélecteur de rôle (header) permet de visualiser
> le RBAC sans backend d'auth. `src/lib/auth/session.tsx` sera hydraté depuis
> le JWT / `/me` — l'API publique (`useSession`, `can`, `hasRole`) ne changera pas.

## Prochaines étapes

- Brancher la session réelle (JWT) et retirer le `RoleSwitcher`.
- Remplacer `mock-data.ts` par des hooks React Query (`src/lib/api`).
- Ajouter Prettier + tests (Jest/RTL, Playwright) et le pipeline CI.
