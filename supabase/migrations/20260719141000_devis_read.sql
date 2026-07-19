-- Migration #9 — MODULE devis (lecture) : policy commerce (DG/RP).
drop policy if exists "devis_read_commerce" on public."Devis";
create policy "devis_read_commerce" on public."Devis" for select to authenticated
  using ( public.current_app_role() in ('DG', 'RP', 'MANAGER') );
