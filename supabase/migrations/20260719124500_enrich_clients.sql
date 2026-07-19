-- ============================================================================
-- Migration Supabase-native #3 — ENRICHISSEMENT du module clients
--
-- Rend l'écran CRM 100% réel : colonnes intrinsèques manquantes sur Client +
-- policies de lecture sur les tables liées (Contact/Site/Contrat) — sinon les
-- jointures PostgREST reviennent vides à cause du RLS deny-by-default.
-- ============================================================================

-- 1) Colonnes UI intrinsèques au client (absentes du schéma Prisma initial).
alter table public."Client" add column if not exists secteur text;
alter table public."Client" add column if not exists statut text
  not null default 'actif' check (statut in ('actif', 'prospect', 'risque'));
alter table public."Client" add column if not exists "scoreSante" integer
  not null default 75 check ("scoreSante" between 0 and 100);

-- 2) Lecture des tables liées, réservée aux mêmes rôles que Client.
--    (Nécessaire pour que les jointures PostgREST — contact principal, nb de
--    sites, contrats/CA — retournent des données.)
do $$
declare tbl text;
begin
  foreach tbl in array array['Contact', 'Site', 'Contrat'] loop
    execute format('drop policy if exists %I on public.%I', tbl || '_read_commerce', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using ( public.current_app_role() in (''DG'',''RP'',''RF'',''COMPTABLE'',''MANAGER'') )',
      tbl || '_read_commerce', tbl);
  end loop;
end $$;
