# PilotePME — couche Supabase-native

Migration progressive (strangler) de l'API NestJS (`apps/api`, gardée en fallback)
vers une architecture **100% Supabase** :

- **Données** : le front lit/écrit les tables via **`supabase-js` → PostgREST**.
- **Autorisation** : **RLS policies** basées sur le rôle JWT (`app_metadata.role`).
- **Règles métier** : contraintes Postgres (CHECK/FK) + fonctions/triggers SQL.
- **Logique spéciale** (docs, intégrations, workflows) : **Edge Functions** (Deno), au cas par cas.

## Migrations (`supabase/migrations/`)

| Ordre | Fichier | Objet |
|---|---|---|
| 1 | `…_enable_rls_all_tables.sql` | 🔒 Active RLS partout (deny-by-default) + helper `current_app_role()` |

> Les policies fines sont ajoutées **module par module** (à mesure que le front bascule
> sur `supabase-js`). Tant qu'une table n'a pas de policy, seul le superuser (API NestJS
> fallback) y accède — le front continue via l'API en attendant.

## Convention RLS

`public.current_app_role()` renvoie le rôle métier (DG, RP, …) depuis le JWT.
Exemple de policy (lecture réservée à certains rôles) :

```sql
alter table public."Facture" enable row level security; -- déjà fait (migration 1)

create policy "factures_read_finance"
  on public."Facture" for select
  to authenticated
  using ( public.current_app_role() in ('DG','RF','COMPTABLE') );
```

## État de la migration (strangler)

- [x] **Fondation** : RLS activé partout (faille PostgREST/anon fermée), helper rôle.
- [ ] Types TS générés (`supabase gen types typescript`).
- [ ] Client `supabase-js` data côté front (lecture) + 1er module pilote.
- [ ] Policies + bascule module par module (lecture puis écriture).
- [ ] Edge Functions pour la logique non exprimable en table+RLS.
- [ ] Retrait de `apps/api` une fois tous les modules portés.
