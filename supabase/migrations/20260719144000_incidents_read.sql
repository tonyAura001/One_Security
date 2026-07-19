-- Migration #12 — MODULE incidents / main courante (lecture)
drop policy if exists "incidents_read_ops" on public."IncidentSecurite";
create policy "incidents_read_ops" on public."IncidentSecurite" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT','JURISTE') );
