-- ============================================================================
-- Migration Supabase-native #6 — MODULE fournisseurs (lecture)
-- Colonnes UI intrinsèques + policies lecture Fournisseur + Depense
-- (l'encours/nb de factures ouvertes sont dérivés des dépenses non payées).
-- ============================================================================

-- 1) Colonnes UI intrinsèques au fournisseur (absentes du schéma Prisma).
alter table public."Fournisseur" add column if not exists categorie text;
alter table public."Fournisseur" add column if not exists statut text
  not null default 'actif' check (statut in ('actif', 'en_attente', 'bloque'));
alter table public."Fournisseur" add column if not exists contact text;
alter table public."Fournisseur" add column if not exists "delaiMoyenJours" integer
  not null default 0;

-- 2) Lecture réservée aux rôles finance/direction.
drop policy if exists "fournisseurs_read_finance" on public."Fournisseur";
create policy "fournisseurs_read_finance"
  on public."Fournisseur" for select to authenticated
  using ( public.current_app_role() in ('DG', 'RF', 'COMPTABLE') );

drop policy if exists "depenses_read_finance" on public."Depense";
create policy "depenses_read_finance"
  on public."Depense" for select to authenticated
  using ( public.current_app_role() in ('DG', 'RF', 'COMPTABLE') );
