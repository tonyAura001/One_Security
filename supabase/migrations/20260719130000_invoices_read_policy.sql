-- ============================================================================
-- Migration Supabase-native #4 — MODULE factures (lecture)
-- Lecture des factures réservée aux rôles finance/direction/commerce.
-- ============================================================================
drop policy if exists "factures_read_finance" on public."Facture";
create policy "factures_read_finance"
  on public."Facture"
  for select
  to authenticated
  using ( public.current_app_role() in ('DG', 'RF', 'COMPTABLE', 'RP', 'MANAGER') );
