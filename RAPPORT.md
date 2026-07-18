# Rapport de réalisation — PilotePME (Frontend)

> Plateforme SaaS de pilotage pour les **entreprises de sécurité privée** :
> gestion des agents, sites gardés, planning des vacations, main courante
> (incidents) et reporting.
>
> _Rapport généré le 2026-07-18 — état du travail non encore commité (seul le
> commit initial « Create Next App » existe dans l'historique Git)._

---

## 1. Vue d'ensemble

Le projet est parti d'un squelette **Create Next App** et a été transformé en un
frontend applicatif complet et fonctionnel (en mode démonstration, sans backend
branché). Le travail représente **69 fichiers TypeScript/TSX** dans `src/`, dont
30 primitives UI, et environ **+4 400 lignes** ajoutées par rapport au commit
initial.

| Domaine | Choix technique |
|---|---|
| Framework | Next.js **16** (App Router) + React **19** |
| Langage | TypeScript (strict) |
| Styles | Tailwind CSS **4** + shadcn/ui (Radix, style *radix-nova* / *new-york*) |
| Thème | « Aurantir » — base slate/neutral, accent ambre, dark mode par défaut |
| Data / cache | TanStack React Query + Axios |
| Formulaires | react-hook-form + Zod |
| Graphiques | Recharts (wrappers shadcn `chart`) |
| Cartes | Leaflet / react-leaflet (chargé en `dynamic ssr:false`) |
| Notifications | Sonner |

---

## 2. Ce qui a été mis en place

### 2.1 Configuration & fondations
- **`package.json`** : passage de la stack Next.js de base à une stack applicative
  complète (React Query, Axios, radix-ui, Recharts, Leaflet, react-hook-form, Zod,
  date-fns, cmdk, sonner, next-themes, lucide-react…). Projet renommé `pilotepme`.
- **`components.json`** : configuration shadcn/ui (style *radix-nova*, RSC, alias
  `@/components`, `@/lib`, `@/hooks`…).
- **`.env.example`** : variable `NEXT_PUBLIC_API_URL` pour l'API backend.
- **`globals.css`** : thème complet (tokens `oklch`, palette de graphiques,
  dark mode) — +158 lignes.
- **`layout.tsx` racine** : `<html lang="fr">` + providers globaux.
- **`README.md`** : documentation d'architecture, stack, RBAC et prochaines étapes.

### 2.2 Modèle de domaine (`src/types/index.ts`)
Types métier servant de source de vérité côté front (à terme alignés sur Prisma /
OpenAPI) :
- `User`, `Role` (6 rôles)
- `Agent` (+ statut, carte pro **CNAPS**, géolocalisation)
- `Site` (+ niveau de risque, agents requis/présents)
- `Client`, `Shift` (vacations), `Incident` (sévérité, statut)
- `GeoPoint`, `Paginated<T>`

### 2.3 RBAC — contrôle d'accès (`src/config/roles.ts`)
- **6 rôles** : `SUPER_ADMIN`, `DIRIGEANT`, `EXPLOITATION`, `SUPERVISEUR`,
  `AGENT`, `CLIENT`.
- Permissions modélisées en `ressource:action` (15 permissions), centralisées.
- Helpers `can(role, permission)` et `hasRole(role, allowed)`.
- Navigation et pages filtrées par permission ; garde `<RequirePermission>` pour
  la défense en profondeur sur l'accès direct par URL.
- **Mode démonstration** : un `RoleSwitcher` dans le header permet de visualiser
  le RBAC sans backend d'authentification.

### 2.4 Couche data & auth (temporaire, swappable)
- **`lib/api/client.ts`** : client Axios unique, injection JWT via provider de
  session, normalisation des erreurs pour React Query.
- **`lib/auth/session.tsx`** : contexte de session (démo), API publique
  (`useSession`, `can`, `hasRole`) stable pour le futur branchement JWT/`me`.
- **`lib/mock-data.ts`** : données de démonstration typées (clients, sites,
  agents, vacations, incidents) — même forme que les futurs hooks React Query.
- **`lib/format.ts`** : formatage `fr-FR`.

### 2.5 Interface — écrans (App Router)
Espace authentifié `(app)/` avec shell (sidebar + header) :

| Page | Contenu |
|---|---|
| **Dashboard** | KPI, graphiques (activité, sévérité), carte des sites |
| **Agents** | Liste des agents, statuts, CNAPS |
| **Sites** | Sites gardés, niveau de risque, occupation |
| **Incidents** | Main courante, sévérité/statut |
| **Planning** | Vacations |
| **Rapports** | Reporting |
| **Paramètres** | Profil / configuration |
| **Tenants** | Administration plateforme (SUPER_ADMIN) |

Écran hors-shell `(auth)/login/` : formulaire de connexion.

### 2.6 Bibliothèque de composants (`src/components/`)
- **`ui/`** : 30 primitives shadcn (button, card, dialog, table, form, sidebar,
  command, calendar, chart, dropdown, sheet, tooltip, sonner…).
- **`layout/`** : sidebar, header, theme-toggle, user-menu, role-switcher.
- **`shared/`** : `StatCard`, `PageHeader`, `EmptyState`, badges métier,
  `RequirePermission`.
- **`charts/`** : `activity-chart`, `severity-chart` (Recharts).
- **`maps/`** : carte Leaflet + wrapper client (`ssr:false`).
- **`settings/`, `auth/`** : formulaires par domaine (react-hook-form + Zod).
- **`providers/`** : Theme + React Query + Session + Tooltip + Toaster.

---

## 3. État & décisions clés

- **Mode démonstration assumé** : pas de backend branché ; les données viennent
  de `mock-data.ts` et la session d'un contexte de démo. Les interfaces publiques
  sont conçues pour un basculement transparent vers l'API réelle.
- **Sécurité** : le RBAC front est de la **défense en profondeur** — l'autorité
  fait foi côté backend.
- **Internationalisation** : application entièrement en français (`lang="fr"`,
  formatage `fr-FR`).

---

## 4. Prochaines étapes (identifiées dans le README)

- [ ] Brancher la **session réelle (JWT)** et retirer le `RoleSwitcher`.
- [ ] Remplacer `mock-data.ts` par des **hooks React Query** (`src/lib/api`).
- [ ] Ajouter **Prettier** + tests (Jest/RTL, Playwright) et le pipeline **CI**.
- [ ] Premier **commit** du travail réalisé (actuellement non versionné).

---

## 5. Note de contexte

> ⚠️ D'après la mémoire projet, le frontend canonique de PilotePME serait
> `Fanah/TT_Secuirity` (Tailwind v3 + kit Aurantir), et le backend
> `Fanah/pilotepme-api` (NestJS + Prisma 7 + Supabase). Le présent dossier
> (`Desktop/Secuirity`) est un frontend **Tailwind v4 / shadcn**. À clarifier :
> lequel des deux frontends est destiné à être poursuivi.
