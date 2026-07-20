# PilotePME — Plan de reprise & TMA (Tierce Maintenance Applicative)

Guide de transition pour l'équipe qui reprend la maintenance.

## 1. Prise en main (jour 1)
1. Accès : dépôt GitHub, Vercel (projet `pilotepme`), Supabase (projet `wypoifuwyylvbzuwmuct`), Render (API fallback).
2. Lire `docs/SPECS-TECHNIQUES.md` puis `docs/MANUEL-ADMIN.md`.
3. Cloner, `pnpm install`, créer `.env.local` (voir `.env.example`), `pnpm dev`.
4. Vérifier la santé : `pnpm typecheck && pnpm test && pnpm build`.

## 2. Boucle de développement standard
Pour toute évolution touchant les données, reproduire le cycle éprouvé :
1. **Modéliser** en base → écrire une migration horodatée dans `supabase/migrations/`.
2. Ajouter/étendre le module data dans `src/lib/supabase/data/`.
3. Brancher l'UI (écran + dialogues).
4. `pnpm typecheck && pnpm test && pnpm build` (verts).
5. **Vérifier l'écriture RLS en `begin; … rollback;`** (rôle autorisé OK, rôle non autorisé refusé).
6. Commit descriptif → push `main` → suivre le déploiement Vercel jusqu'à `Ready`.

## 3. Règles à ne pas enfreindre
- **RLS d'abord** : toute nouvelle table = RLS activé + policies par rôle. Défauts PostgREST (`id`, dates).
- **Atomicité** : les opérations multi-tables passent par un RPC `SECURITY DEFINER` role-gardé.
- **Jamais la `service_role` côté navigateur** — uniquement dans la route `/api/cron` (env serveur).
- **Types** : `database.types.ts` peut être en retard (CI `gen-types` à débloquer) → casts `as never` assumés en attendant.

## 4. Dette technique connue / à finir
- **CI `gen-types`** bloquée : besoin du secret GitHub `SUPABASE_ACCESS_TOKEN` (PAT `sbp_…`). Une fois posé, régénérer les types et retirer les casts `as never`.
- **Rotation des clés** (voir Manuel admin §6) — à faire à la clôture.
- **Collaboration temps réel** sur les documents : reportée (Supabase Realtime envisageable).
- **PDF côté serveur + envoi e-mail** des documents : aujourd'hui l'export PDF = impression navigateur ; une génération serveur (fonction Vercel) + envoi reste à faire.
- **API NestJS/Render** : fallback historique ; à retirer une fois tous les modules 100 % Supabase-native.

## 5. Surveillance
- Logs Vercel (fonctions + cron) ; logs Supabase (Postgres, Auth).
- Vérifier le cron : réponse JSON de `/api/cron` (compteurs `ticketsPreventifsGeneres`, `facturesMarqueesRetard`, `errors`).
- Alerte simple : un `errors` non vide dans la réponse cron ou un déploiement `Error` sur Vercel.

## 6. Contacts & ressources
- Charte / entité : `src/lib/one-security.ts` (One Security SUARL, RCCM, Ninéa, PDG).
- Contrôle d'accès : `src/lib/rbac.ts` (écrans fonctionnels, `canAccess`, `pruneMenu`).
- Rapport projet détaillé : `RAPPORT-PROJET.md` · Rétroplanning : `RETROPLANNING.md`.
