# Authentification — PilotePME

Auth **Supabase** (email / mot de passe) intégrée au frontend Next.js 16 avec
sessions par **cookies httpOnly** (`@supabase/ssr`). Les rôles/permissions
applicatifs restent servis par le **backend NestJS** (`GET /me`), qui fait
autorité pour le RBAC.

## Architecture

```
Navigateur ──login──▶ Server Action (signInWithPassword)
                         │  écrit la session dans des cookies httpOnly
                         ▼
                    proxy.ts  ──▶ rafraîchit le token à chaque requête
                         │            + garde de routes (redirige /login)
                         ▼
              (app)/layout.tsx (serveur)
                         │  DAL getCurrentUser()
                         │    1. Supabase getUser()  → valide le JWT
                         │    2. GET /me (Bearer)    → User + role (NestJS)
                         ▼
                 <SessionProvider user> ──▶ useSession / useUser / usePermissions
```

| Fichier | Rôle |
|---|---|
| `src/lib/supabase/client.ts` | Client Supabase navigateur (singleton) |
| `src/lib/supabase/server.ts` | Client Supabase serveur (cookies Next 16) |
| `src/lib/supabase/config.ts` | Lecture/validation des variables d'env |
| `src/proxy.ts` | Refresh session + redirections (ex-`middleware`) |
| `src/lib/auth/actions.ts` | Server Actions `login` / `logout` |
| `src/lib/auth/dal.ts` | `getCurrentUser()` — session + `/me` |
| `src/lib/auth/session.tsx` | Contexte React RBAC (hydraté serveur) |
| `src/lib/api/client.ts` | Axios + injection Bearer + 401 → login |

## Configuration Supabase (à faire une fois)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email** : activer, et **désactiver
   « Enable sign-ups »** (modèle sur invitation, voir plus bas).
3. **Project Settings → API** : copier *Project URL* et la clé *anon public*.
4. Les coller dans `.env.local` :
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. `pnpm dev` → `http://localhost:3000` redirige vers `/login`.

> `.env.local` est **gitignoré** (`.env*`). Ne jamais commiter les clés, et ne
> jamais mettre la clé `service_role` dans le frontend.

## Connexion (login)

- Écran `/login` → `LoginForm` (`useActionState`) → Server Action `login`.
- Les identifiants sont traités **uniquement côté serveur** ; la session est
  posée en cookies httpOnly.
- Erreur volontairement générique (« Email ou mot de passe incorrect ») pour ne
  pas révéler l'existence d'un compte.
- Redirection post-login vers `?redirect=…` (validé, interne uniquement) sinon
  `/dashboard`.

## Inscription (modèle sur invitation)

Pas de self-signup public (SaaS B2B multi-tenant). Les comptes sont créés par un
administrateur :

- **Supabase Dashboard → Authentication → Users → « Invite user »**, ou
- via le back-office / une route admin du backend NestJS qui appelle
  `supabase.auth.admin.inviteUserByEmail(...)` avec la clé `service_role`
  (côté serveur backend uniquement).

L'utilisateur reçoit un email, définit son mot de passe, puis se connecte. Son
**rôle** (`SUPER_ADMIN`, `DIRIGEANT`, …) et son `companyId` (tenant) sont gérés
côté backend et renvoyés par `GET /me`.

## Déconnexion

Menu utilisateur → « Déconnexion » → Server Action `logout`
(`supabase.auth.signOut()`) → redirection `/login`. La navigation complète vide
naturellement le cache React Query.

## RBAC (autorisation)

- **Navigation** : `app-sidebar` masque les entrées via `can(permission)`.
- **Pages** : `<RequirePermission permission="…">` affiche un **403** si le rôle
  n'a pas la permission (défense en profondeur — accès direct par URL).
- **Helpers client** : `useUser()`, `usePermissions()` (`can` / `hasRole`).
- **Autorité réelle** : le **backend** doit revalider chaque requête (JWT
  Supabase → rôle → permission). Le RBAC frontend n'est qu'une couche UX.

## À valider côté backend NestJS (hors de ce repo)

- [ ] Endpoint `GET /me` : valide le JWT Supabase (JWKS / secret du projet) et
      renvoie le `User` applicatif (`id, firstName, lastName, email, role,
      companyId, …`) au format de `src/types`.
- [ ] Guard global qui vérifie le Bearer Supabase sur les routes protégées et
      applique le RBAC (`role`/`permission`) — renvoie 401 (non connecté) /
      403 (non autorisé).
- [ ] Mapping utilisateur Supabase → tenant + rôle (table de liaison).

## Prochaine étape

Migration de `src/lib/mock-data.ts` vers des hooks React Query consommant l'API
(`apiClient` injecte déjà le Bearer). `mock-data.ts` est conservé tant que cette
migration n'est pas faite.
