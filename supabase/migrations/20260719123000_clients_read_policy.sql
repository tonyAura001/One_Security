-- ============================================================================
-- Migration Supabase-native #2 — MODULE PILOTE : clients (lecture)
--
-- Prouve le pattern RLS + PostgREST + rôle JWT sur la table Client.
-- ============================================================================

-- 1) Normaliser le helper de rôle en MAJUSCULE.
--    Le JWT porte `app_metadata.role` en minuscule (ex. "dg"), alors que l'enum
--    RoleName et nos policies utilisent les MAJUSCULES (DG). On normalise ici
--    pour écrire les policies avec les valeurs de l'enum.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(upper(auth.jwt() -> 'app_metadata' ->> 'role'), '');
$$;

-- 2) Lecture des clients réservée aux rôles commerciaux/finance.
--    (agent, surveillant, etc. → aucun accès, vérifié.)
drop policy if exists "clients_read_commerce" on public."Client";
create policy "clients_read_commerce"
  on public."Client"
  for select
  to authenticated
  using ( public.current_app_role() in ('DG', 'RP', 'RF', 'COMPTABLE', 'MANAGER') );

-- Écriture (insert/update/delete) : PAS de policy pour l'instant → interdite via
-- PostgREST. À ajouter par rôle quand le front passera en écriture.
