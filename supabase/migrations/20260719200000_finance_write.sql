-- Finance — activation des écritures (création/édition) via PostgREST.
-- 1) Défauts DB manquants (Prisma génère id/updatedAt côté app, pas en base) :
--    sans eux, tout INSERT PostgREST échoue (NOT NULL sans valeur).
-- 2) Colonnes de suivi des relances sur les factures.
-- 3) Policies RLS INSERT/UPDATE par rôle (le read existait déjà).

-- ── 1. Défauts DB ─────────────────────────────────────────────────────────
alter table "Facture"      alter column id set default gen_random_uuid();
alter table "Facture"      alter column "updatedAt" set default now();
alter table "Encaissement" alter column id set default gen_random_uuid();
alter table "Depense"      alter column id set default gen_random_uuid();
alter table "Depense"      alter column "updatedAt" set default now();
alter table "Devis"        alter column id set default gen_random_uuid();
alter table "Devis"        alter column "updatedAt" set default now();
alter table "Contrat"      alter column id set default gen_random_uuid();
alter table "Contrat"      alter column "updatedAt" set default now();

-- ── 2. Suivi des relances ─────────────────────────────────────────────────
alter table "Facture" add column if not exists "derniereRelance" timestamptz;
alter table "Facture" add column if not exists "nombreRelances" integer not null default 0;

-- ── 3. RLS écriture ───────────────────────────────────────────────────────
-- Factures : finance (DG/RF/COMPTABLE)
create policy "facture_insert" on "Facture" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RF','COMPTABLE') );
create policy "facture_update" on "Facture" for update to authenticated
  using ( public.current_app_role() in ('DG','RF','COMPTABLE') )
  with check ( public.current_app_role() in ('DG','RF','COMPTABLE') );

-- Encaissements & dépenses : finance
create policy "encaissement_insert" on "Encaissement" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RF','COMPTABLE') );
create policy "depense_insert" on "Depense" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RF','COMPTABLE') );

-- Devis : commerce (DG/RP/MANAGER)
create policy "devis_insert" on "Devis" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER') );
create policy "devis_update" on "Devis" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','MANAGER') );

-- Contrats : direction/production/finance (DG/RP/RF)
create policy "contrat_insert" on "Contrat" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','RF') );
create policy "contrat_update" on "Contrat" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','RF') )
  with check ( public.current_app_role() in ('DG','RP','RF') );
