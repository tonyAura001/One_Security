# PilotePME — Spécifications techniques

Plateforme de gestion mono-locataire pour **One Security SUARL** (sécurité privée, Dakar).

## 1. Pile technique

| Couche | Choix |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4 |
| État / données | TanStack Query, client `supabase-js` navigateur |
| Backend de données | **Supabase** : PostgREST (CRUD), RLS (autorisation), Auth (JWT ES256), Storage |
| Graphiques | Recharts · Éditeur riche : TipTap |
| Hébergement | Vercel (frontend + route cron) ; API NestJS/Prisma sur Render (**fallback** historique) |

## 2. Architecture d'autorisation (Supabase-native)

- Le navigateur lit/écrit les tables **via PostgREST**, sécurisé par **RLS**.
- Helper SQL `public.current_app_role()` → rôle **en MAJUSCULE** depuis `auth.jwt() -> app_metadata -> role`.
- Rôles : `DG, RP, RF, RH, COMPTABLE, MANAGER, CONTROLEUR, SURVEILLANT, AGENT, CAISSIER…`
- **Deny-by-default** : les 54 tables publiques ont RLS activé. Une table sans policy est inaccessible (sauf `service_role`/superuser).

### Pièges PostgREST résolus (à reproduire sur toute nouvelle table écrite)
- Colonnes générées côté Prisma (`id`, `updatedAt`) → **pas de défaut DB** → INSERT PostgREST échoue.
  Fix : `alter column id set default gen_random_uuid()` (+ `now()` pour les dates).
- Une écriture filtrée par RLS renvoie **0 ligne** (pas 403). Les fonctions d'écriture font `.select()` et lèvent si 0 ligne.
- Les jointures embarquées reviennent vides si la table liée n'a pas de policy de lecture.

## 3. RPC (SECURITY DEFINER)

Utilisés pour l'atomicité multi-tables et pour calculer des noms d'affichage sans exposer `User`.

| RPC | Rôle | Effet |
|---|---|---|
| `create_direct_conversation(other_user)` | authenticated | Crée/retrouve un DM 1-1 |
| `my_conversations()` | authenticated | Liste des conversations + nom d'affichage |
| `create_vente(_lines,_payments,_client)` | DG/RF/COMPTABLE | Vente atomique + décrément stock (garde stock) |
| `commentaires_for(_entite,_id)` | authenticated | Fil de commentaires + nom d'auteur |
| `generer_ticket_plan(_plan)` | DG/RP/MANAGER/CONTROLEUR | Ticket préventif + avance l'échéance |
| `enregistrer_engagement(_pub,_rows)` | DG/RP/RH/MANAGER | Remplace la ventilation d'engagement CM |
| `cron_generer_tickets_preventifs()` | **service_role only** | Génère les tickets préventifs dus |
| `cron_flag_factures_retard()` | **service_role only** | Passe les factures échues en EN_RETARD |

## 4. Modèle de données (domaines clés)

- **Opérations** : `AgentSecurite` (67 agents réels), `Site`, `Vacation` (planning), `Pointage`, `RondeAgent`, `IncidentSecurite`.
- **Finance** : `Facture`, `Contrat`, `CompteBancaire`, `Encaissement`, `Fournisseur`, `BulletinPaie`.
- **POS** : `Vente` + `LigneVente` + `Paiement` (remplacent `TicketCaisse`), `Produit`.
- **CRM** : `Client`, `Contact`, `Prospect`.
- **Projets** : `Projet`, lien `Tache.projetId`, `Commentaire` (polymorphe).
- **Maintenance** : `Ticket`, `Intervention`, `Materiel`, `PlanMaintenance` (préventif).
- **CM** : `Publication`, `Plateforme`, `Interaction`.
- **Documents** : `Document` (contenu JSON), `DocumentVersion` (historique immuable).
- **Fichiers** : `Fichier` (polymorphe `entite`/`idEntite`) + Storage bucket privé `pilotepme-files`.
- **Messagerie** : `Canal` (type canal|direct), `_CanalMembres`, `Message`.

## 5. Migrations

Toutes dans `supabase/migrations/` (horodatées). Sprint S2+ (2026-07-20) :
`messagerie_unifiee`, `pos_vente_lignevente_paiement`, `projets_commentaires`,
`plan_maintenance`, `cm_plateforme_interaction`, `fichiers_generiques`,
`cron_jobs`, `document_versions`.

Application : `psql "$DATABASE_URL" -f supabase/migrations/<fichier>.sql`.

## 6. Qualité

- `pnpm typecheck` (tsc) · `pnpm test` (Vitest, 22 tests) · `pnpm build`.
- CI GitHub : typecheck + tests + build bloquants ; lint informatif.
- Sécurité web : en-têtes HSTS/X-Frame-Options/nosniff/Referrer/Permissions (voir `next.config.ts`).
