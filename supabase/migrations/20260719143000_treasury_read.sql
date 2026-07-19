-- Migration #11 — MODULE trésorerie (lecture)
-- Colonne type (bank/wave/om/cash) sur CompteBancaire + policies lecture
-- CompteBancaire + Encaissement (Depense a déjà depenses_read_finance).
alter table public."CompteBancaire" add column if not exists type text
  not null default 'bank' check (type in ('bank','wave','om','cash'));
drop policy if exists "comptes_read_finance" on public."CompteBancaire";
create policy "comptes_read_finance" on public."CompteBancaire" for select to authenticated
  using ( public.current_app_role() in ('DG','RF','COMPTABLE') );
drop policy if exists "encaissements_read_finance" on public."Encaissement";
create policy "encaissements_read_finance" on public."Encaissement" for select to authenticated
  using ( public.current_app_role() in ('DG','RF','COMPTABLE') );
