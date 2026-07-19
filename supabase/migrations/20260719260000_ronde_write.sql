-- Planning : affectation de vacations (RondeAgent).
-- Repointer agentId User -> AgentSecurite (table vide) + RLS insert/update.
alter table "RondeAgent" drop constraint "RondeAgent_agentId_fkey";
alter table "RondeAgent" add constraint "RondeAgent_agentId_fkey"
  foreign key ("agentId") references "AgentSecurite"(id) on delete cascade;

create policy "ronde_insert" on "RondeAgent" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR') );
create policy "ronde_update" on "RondeAgent" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR') )
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR') );
