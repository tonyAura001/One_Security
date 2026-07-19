-- Migration #17 — MODULE matériel/équipements (lecture)
alter table public."Materiel" alter column id set default gen_random_uuid();
drop policy if exists "materiel_read" on public."Materiel";
create policy "materiel_read" on public."Materiel" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','RF','COMPTABLE') );
