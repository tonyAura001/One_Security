# PilotePME — Manuel administrateur

Exploitation, configuration et maintenance de la plateforme.

## 1. Environnements

| Composant | Emplacement |
|---|---|
| Frontend + cron | Vercel — projet `pilotepme` (alias prod `pilotepme-sandy.vercel.app`) |
| Base de données / Auth / Storage | Supabase — projet `wypoifuwyylvbzuwmuct` (région eu-west-1) |
| API fallback (historique) | Render (NestJS/Prisma) |

## 2. Variables d'environnement (Vercel — Production **et** Preview)

| Variable | Rôle | Sensibilité |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | publique — **non « Sensitive »** (voir ⚠️) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon | publique — **non « Sensitive »** |
| `DEMO_AUTH` | `false` en prod (login réel via table `User`) | — |
| `CRON_SECRET` | Secret partagé Vercel Cron ↔ route `/api/cron` | secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (cron uniquement, jamais navigateur) | **secret critique** |

⚠️ **Piège Vercel connu** : une variable `NEXT_PUBLIC_*` marquée « Sensitive » est **runtime-only** → non injectée dans le bundle client → écrans vides. Les recréer en `--no-sensitive` :
```
vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes
vercel env add NEXT_PUBLIC_SUPABASE_URL production --no-sensitive --value "https://…" --yes
```

## 3. Déploiement

Automatique sur push `main` (Vercel). Manuel : `npx vercel --prod`.
Suivi : `npx vercel ls pilotepme --prod` puis `npx vercel inspect <url>` jusqu'à `Ready`.

## 4. Base de données

- Connexion (pooler) : `postgresql://postgres.<ref>:<mdp>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`
- Appliquer une migration : `psql "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/<fichier>.sql`
- **Toujours tester une écriture RLS en transaction `begin; … rollback;`** avant de livrer.

## 5. Tâches planifiées (Vercel Cron)

- Planifié dans `vercel.json` : `/api/cron` chaque jour à 06:00 UTC.
- Prérequis : `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` posés sur Vercel.
- Actions : génération des tickets de maintenance préventive dus + passage des factures échues en `EN_RETARD`.
- Vérification manuelle : `curl -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/cron`.
- Sécurité : les fonctions `cron_*` ne sont exécutables que par `service_role` (EXECUTE révoqué de anon/authenticated).

## 6. 🔒 Rotation des clés (à faire en fin de projet)

Le mot de passe DB Supabase et les clés ont pu transiter en clair pendant le développement. À la clôture :
1. Régénérer le **mot de passe DB** (Supabase → Settings → Database) et le ré-saisir dans Render (`DATABASE_URL`/`DIRECT_URL`, pooler eu-west-1, mot de passe URL-encodé).
2. Régénérer les **clés API** (anon + service_role) si exposées ; mettre à jour Vercel.
3. Créer un **PAT Supabase** (`sbp_…`, PAS service_role) → secret GitHub `SUPABASE_ACCESS_TOKEN` pour débloquer la CI `gen-types`.

## 7. Comptes & rôles

- Login réel via table `User` (RLS `users_read_self`). Le rôle est porté par `app_metadata.role` du JWT.
- Le DG dispose d'un mode **« Voir en tant que »** (UI d'un autre rôle ; les données restent celles du DG).

## 8. Sauvegarde / restauration

- Supabase assure des sauvegardes automatiques (selon le plan). Export ponctuel : `pg_dump "$DB" > backup.sql`.
- Storage `pilotepme-files` (bucket privé) : à inclure dans toute stratégie de sauvegarde des pièces jointes.
