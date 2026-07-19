-- Migration #16 — MODULE paie/bulletins (lecture) : finance + RH.
alter table public."BulletinPaie" alter column id set default gen_random_uuid();
drop policy if exists "bulletins_read_paie" on public."BulletinPaie";
create policy "bulletins_read_paie" on public."BulletinPaie" for select to authenticated
  using ( public.current_app_role() in ('DG','RF','COMPTABLE','RH') );
