-- Migration #14 — AgentSecurite en écriture (les responsables mettent à jour
-- les fiches agents dans la plateforme). updatedAt auto + policies insert/update.
create extension if not exists moddatetime schema extensions;
drop trigger if exists agents_securite_set_updated_at on public."AgentSecurite";
create trigger agents_securite_set_updated_at
  before update on public."AgentSecurite"
  for each row execute function extensions.moddatetime("updatedAt");

drop policy if exists "agents_securite_insert" on public."AgentSecurite";
create policy "agents_securite_insert" on public."AgentSecurite" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','RH','MANAGER') );

drop policy if exists "agents_securite_update" on public."AgentSecurite";
create policy "agents_securite_update" on public."AgentSecurite" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','RH','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','RH','MANAGER') );
