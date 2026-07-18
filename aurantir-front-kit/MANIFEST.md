# Aurantir Front Kit — MANIFEST

Couche **front-end uniquement** extraite d'Aurantir Workspace (Next.js 15 / Tailwind),
rendue **présentationnelle et portable** pour réutilisation dans un autre projet
(ex. un SaaS de sécurité). **Aucun secret, aucun code serveur, aucune route API, aucun accès base de données.**

- Design system, shell (sidebar + topbar), composants, écrans et utils UI copiés **à l'identique** (style, couleurs, thèmes clair/sombre inchangés).
- Tous les appels réseau passent par un **stub Supabase** (`lib/supabase/client.ts`) : zéro requête, résultats neutres → les écrans affichent leurs états « vide »/« chargement ».
- Le kit **typecheck à 0 erreur** en isolation (voir « Vérification »).
- Import interne unifié via l'alias **`@/aurantir-front-kit/...`** (aucun import ne sort du dossier).

---

## 1. Structure

```
aurantir-front-kit/
├── design-system/     Charte : globals.css, tailwind.config.ts, fonts.ts, fonts/*.woff
├── layout/            Shell : DashboardShell (découplé), re-exports Sidebar/Topbar
├── components/
│   ├── ui/            Button, Card+StatCard, Badge (+ badges statut), Input/TextArea/Select,
│   │                  DropdownMenu, Pagination, RevenusChart
│   ├── shared/        Sidebar, Topbar, ActionsMenu, MemberStatusActions, InviteMemberModal,
│   │                  AssignResourceModals, DashboardLayoutClient + 5 dashboards par rôle
│   └── providers/     InactivityGuard
├── screens/           63 pages + 5 fichiers support, groupés par module (voir §4)
├── hooks/             useTheme
├── lib/               utils (FCFA/dates FR/CSV…), storage, pdf (devis/facture), store (zustand), supabase (STUB)
├── types/             database.types.ts (types partagés, aucune donnée)
├── assets/            fonts .woff + favicon.ico
├── index.ts           Barrel exports (composants + layout + utils)
└── MANIFEST.md
```

---

## 2. Dépendances npm externes à installer

Dans le projet cible :

```bash
npm i next@^15.3.2 react@^18 react-dom@^18 \
  lucide-react@^1.16.0 framer-motion@^12.40.0 recharts@^3.8.1 \
  clsx@^2.1.1 tailwind-merge@^3.6.0 class-variance-authority@^0.7.1 \
  zustand@^5.0.13 date-fns@^4.3.0 jspdf@^4.2.1 \
  @radix-ui/react-dropdown-menu@^2.1.16

# dev
npm i -D tailwindcss@^3.4.1 postcss@^8 typescript@^5 @types/react@^18 @types/react-dom@^18 @types/node@^20
```

| Paquet | Version | Utilisé par |
|---|---|---|
| next | ^15.3.2 | tout (App Router, next/link, next/font, next/navigation) |
| react / react-dom | ^18 | tout |
| tailwindcss | ^3.4.1 | design system |
| lucide-react | ^1.16.0 | icônes (Sidebar, Topbar, écrans) |
| framer-motion | ^12.40.0 | animations de certains écrans |
| recharts | ^3.8.1 | `RevenusChart` + graphes finance |
| clsx + tailwind-merge | ^2.1.1 / ^3.6.0 | `cn()` |
| class-variance-authority | ^0.7.1 | variantes de composants |
| zustand | ^5.0.13 | store global (`lib/store/app.store.ts`) |
| date-fns | ^4.3.0 | calendrier / dates |
| jspdf | ^4.2.1 | `lib/pdf/*` (export devis/factures) |
| @radix-ui/react-dropdown-menu | ^2.1.16 | `components/ui/DropdownMenu` |

> Les autres `@radix-ui/*`, `react-hook-form`, `zod`, `@dnd-kit/*`, `@tiptap/*`, `sonner`,
> `react-hot-toast` sont utilisés ponctuellement par certains écrans. Installez-les **au besoin**
> quand vous activez un écran qui les importe (le compilateur vous le signalera).
> **Exclus (back)** : `@supabase/*`, `@supabase/ssr`, `resend`, `bcryptjs`.

---

## 3. Intégration (drop-in)

1. **Copiez** le dossier `aurantir-front-kit/` à la racine de votre projet Next.js.
2. **Alias d'import** — le kit utilise `@/aurantir-front-kit/...`. Si votre `tsconfig.json`
   contient déjà `"@/*": ["./*"]` (convention Next par défaut), **rien à faire** : ça résout tout seul.
   Sinon ajoutez :
   ```jsonc
   // tsconfig.json
   "compilerOptions": { "paths": { "@/*": ["./*"] } }
   ```
3. **Tailwind** — fusionnez `design-system/tailwind.config.ts` (bloc `theme.extend`) dans votre
   config, et assurez-vous que `content` couvre le kit :
   ```ts
   content: ["./app/**/*.{ts,tsx}", "./aurantir-front-kit/**/*.{ts,tsx}"]
   ```
4. **CSS global** — importez les variables + classes utilitaires depuis votre `app/globals.css` :
   ```css
   @import "../aurantir-front-kit/design-system/globals.css";
   ```
   (ou copiez-en le contenu). Il contient `@tailwind base/components/utilities`, l'`@import` Inter,
   les variables `:root` (thème sombre) et `[data-theme="clair"]`, et tout le `@layer components`.
5. **Polices** — dans `app/layout.tsx` :
   ```tsx
   import { appFont } from "@/aurantir-front-kit/design-system/fonts"
   // <body className={`${appFont.variable} font-sans antialiased`}>
   ```
   (les .woff sont dans `design-system/fonts/`). `font-sans` = Inter (Google Fonts, via globals.css).
6. **Monter le shell** — enveloppez vos pages :
   ```tsx
   import { DashboardShell } from "@/aurantir-front-kit/layout"
   export default function Layout({ children }) {
     return <DashboardShell demoUser={/* mock optionnel */ null}>{children}</DashboardShell>
   }
   ```
   `DashboardShell` applique le thème, monte Sidebar + Topbar, **sans aucun appel réseau**.
7. **Utiliser un écran** — importez-le par chemin direct, ex. :
   ```tsx
   import TresoreriePage from "@/aurantir-front-kit/screens/dashboard/finance/tresorerie/page"
   ```
   ou copiez le fichier vers votre arbre `app/` et rebranchez les données (voir §5).

### Basculer le thème par défaut sur CLAIR
Le défaut est **sombre**. Pour un défaut clair dans le projet cible :
- `lib/store/app.store.ts` → remplacez `theme: 'sombre'` par `theme: 'clair'`.
- Le shell applique `document.documentElement.setAttribute('data-theme', theme)` au montage.
  Pour éviter tout flash avant hydratation, posez `data-theme="clair"` sur `<html>` dans `app/layout.tsx`.
- Le store persiste le thème dans `localStorage` (clé `sama-digital-app`) — videz-le en dev si besoin.

---

## 4. Écrans copiés (63 pages + 5 fichiers support)

| Module | Écran | Chemin dans le kit | Usage |
|---|---|---|---|
| **Dashboard** | Accueil (dashboards par rôle) | `screens/dashboard/page.tsx` (+ `components/shared/*Dashboard.tsx`) | Vue d'accueil, KPI, activité récente |
| **Finance** | Index (redirect) | `screens/dashboard/finance/page.tsx` | → Trésorerie |
| | Trésorerie | `screens/dashboard/finance/tresorerie/page.tsx` | Flux entrées/sorties, soldes |
| | Budget | `screens/dashboard/finance/budget/page.tsx` | Budgets par contrat/projet |
| | Factures (liste / détail / création) | `screens/dashboard/finance/factures/{page,[id]/page,nouvelle/page}.tsx` | Facturation |
| | Devis (liste / détail / création) | `screens/dashboard/finance/devis/{page,[id]/page,nouveau/page}.tsx` | Devis |
| | Fournisseurs | `screens/dashboard/finance/fournisseurs/page.tsx` | Annuaire fournisseurs |
| **CRM** | Index (redirect) | `screens/dashboard/crm/page.tsx` | → Clients |
| | Clients (liste / détail / modale) | `screens/dashboard/crm/clients/{page,[id]/page,ClientFormModal}.tsx` | Comptes clients |
| | Accès clients | `screens/dashboard/crm/acces/page.tsx` | Gestion des accès portail client |
| | Prospects | `screens/dashboard/crm/prospects/page.tsx` | Pipeline commercial |
| | Contrats (liste / détail) | `screens/dashboard/crm/contrats/{page,[id]/page}.tsx` | Contrats |
| | Satisfaction (+ builder) | `screens/dashboard/crm/satisfaction/{page,builder/page,builder/[id]/page}.tsx` | Enquêtes de satisfaction |
| **Rapports** | Liste / Détail | `screens/dashboard/rapports/{page,[id]/page}.tsx` | Rapports |
| **Notes** | Notes | `screens/dashboard/notes/page.tsx` | Bloc-notes riche |
| **Calendrier** | Calendrier | `screens/dashboard/calendrier/page.tsx` | Agenda |
| **Éditorial** | Calendrier éditorial | `screens/dashboard/calendrier-editorial/page.tsx` | Planning contenus |
| **Messagerie** | Messagerie | `screens/dashboard/messagerie/page.tsx` | Conversations + canaux |
| | Groupes (redirect) | `screens/dashboard/groupes/page.tsx` | → Messagerie |
| **Objectifs** | Objectifs / OKR | `screens/dashboard/objectifs/page.tsx` | Objectifs commerciaux & OKR |
| **Bibliothèque** | Bibliothèque | `screens/dashboard/bibliotheque/page.tsx` | Documents / ressources |
| **Administration** | Index (redirect) | `screens/dashboard/admin/page.tsx` | → Membres |
| | Membres | `screens/dashboard/admin/membres/page.tsx` | Gestion utilisateurs / rôles |
| | Sécurité / Audit-trail | `screens/dashboard/admin/securite/page.tsx` | Sessions, journal d'audit |
| | Données | `screens/dashboard/admin/donnees/page.tsx` | Export / maintenance données |
| | Config / Dossiers / Fondateurs | `screens/dashboard/admin/{config,dossiers,fondateurs}/page.tsx` | Réglages avancés |
| **Notifications** | Notifications | `screens/dashboard/notifications/page.tsx` | Centre de notifications |
| **Paramètres** | Settings (Profil / Organisation / Sécurité / Notifs / Apparence) | `screens/dashboard/settings/page.tsx` | Réglages utilisateur (onglets) |
| **Projets** | Liste / Nouveau / Détail | `screens/dashboard/projets/{page,nouveau/page,[id]/page}.tsx` | Gestion de projets |
| | Kanban / Ressources / Rapports / Clôture | `screens/dashboard/projets/[id]/{kanban,ressources,rapports,cloture}/page.tsx` | Sous-vues projet |
| **Espace client** | Accueil / Projets / Factures / Devis / Contrats / Rapports / Messagerie / Calendrier | `screens/client/espace-client/**` | Portail client externe |
| **Auth** | Login / Forgot / Reset | `screens/auth/{login,forgot-password,reset-password}/page.tsx` | Écrans d'authentification (UI) |
| **Onboarding** | Onboarding | `screens/onboarding/page.tsx` | Parcours d'accueil |
| **Survey** | Sondage public | `screens/survey/[id]/page.tsx` | Formulaire de sondage |
| **Setup** | Admin setup | `screens/admin-setup/page.tsx` | Écran d'amorçage |

Fichiers support : `screens/{dashboard,client,auth,survey}/layout.tsx`, `screens/dashboard/crm/clients/ClientFormModal.tsx`.

---

## 5. Points d'intégration (les `// TODO(intégration)`)

**81 fichiers** portent une bannière `// TODO(intégration): brancher données réelles` en tête,
et le stub `lib/supabase/client.ts` marque la frontière réseau. Pour rebrancher les données :

- **Option A — remplacer le stub** : substituez `lib/supabase/client.ts` par votre vrai client
  (Supabase, REST, tRPC…). Les écrans qui appellent `createClient()` refonctionnent tels quels.
- **Option B — présentationnel pur (recommandé pour réutilisation)** : dans chaque écran,
  supprimez le bloc de chargement (`useEffect` + `createClient()`), remplacez l'état initial par
  des **mocks typés** (les interfaces locales de chaque écran sont conservées), et/ou remontez les
  données en **props**. Cherchez `createClient(`, `.from(`, `.rpc(`, `fetch(` pour localiser les points.
- **Shell** : `DashboardShell` accepte `demoUser` / `demoEntites` / `demoNotifications` (props typées)
  pour peupler l'en-tête et la sidebar sans backend.
- **Auth** : les écrans `screens/auth/*` appellent des méthodes `supabase.auth.*` (stub inerte) —
  rebranchez sur votre fournisseur d'auth.

> Le stub renvoie `data: null` → les listes sont vides et les états « vide » s'affichent. C'est voulu :
> vous voyez la **mise en page et les composants**, puis vous injectez vos données.

---

## 6. Correspondance Aurantir → SaaS de sécurité (suggestion)

| Module Aurantir | Réutilisation pour un SaaS sécurité |
|---|---|
| **Projets** (liste/cartes, kanban, détail) | Missions / interventions de gardiennage, plannings de rondes |
| **CRM › Clients** | Clients & **sites gardés** (comptes, contacts, adresses) |
| **CRM › Accès clients** | Accès portail client (donneurs d'ordre) |
| **CRM › Contrats** | Contrats de prestation de sécurité |
| **CRM › Satisfaction** | Enquêtes qualité / audits de site |
| **Administration › Membres** | Gestion des **agents / rôles / habilitations** |
| **Administration › Sécurité (audit-trail, sessions)** | Journal d'audit, appareils/sessions, conformité |
| **Finance › Factures / Devis / Trésorerie / Budget** | Facturation des prestations, devis, trésorerie |
| **Finance › Fournisseurs** | Sous-traitants / équipementiers |
| **Objectifs / OKR** | KPI opérationnels (taux de couverture, incidents) |
| **Calendrier / Éditorial** | Plannings d'agents, rotations, calendrier d'interventions |
| **Messagerie** | Communication interne agents / superviseurs |
| **Rapports** | **Rapports d'intervention / mains courantes** |
| **Bibliothèque** | Procédures, consignes de site, documents réglementaires |
| **Espace client** | Portail donneur d'ordre (rapports, factures, incidents) |
| **Dashboard (StatCard/KPI, RevenusChart)** | Tableau de bord opérationnel temps réel |

---

## 7. Vérification

Le kit a été typé-vérifié en isolation avec un tsconfig qui étend celui du repo :
```bash
# 0 erreur
npx tsc --noEmit  # (le kit est inclus et ne produit aucune erreur)
```

**Limites connues / non 100 % autonome :**
- **Écrans encore « branchés »** : les écrans conservent leur logique de chargement d'origine pointant
  vers le **stub** (pas de mocks champ-par-champ écrits à la main). Ils compilent et rendent leur UI
  (états vides). Le passage en présentationnel pur / mocks typés reste à faire écran par écran (§5).
- **Typage** : à la frontière réseau, le stub expose des retours `any` (comme le faisait de facto le
  client réel au point d'appel). Le typage **local** des écrans est intégralement préservé ; l'intégration
  réelle rétablit le typage fort de bout en bout.
- **Icône/logo** : le « logo » est l'icône Lucide `Zap` dans un carré dégradé (aucun asset image à fournir).
- **Ajouts au design system** : `text-2xs` et `ease-smooth` (utilisés par le shell mais absents du config
  d'origine, donc sans effet) ont été **définis** dans `design-system/tailwind.config.ts`. Retirez-les pour
  un rendu strictement identique à l'original.
- **Dépendances ponctuelles** : certains écrans importent des libs non listées en §2 (react-hook-form, zod,
  @dnd-kit, @tiptap, sonner…). Installez-les à la demande selon les écrans activés.
