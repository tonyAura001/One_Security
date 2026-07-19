-- Opérations : écritures Pointage & Incidents (main courante).

-- Pointage : repointer agentId vers AgentSecurite (roster réel des 67 agents)
-- — la table est vide, le repointage est sûr. + défaut id + RLS insert.
alter table "Pointage" drop constraint "Pointage_agentId_fkey";
alter table "Pointage" add constraint "Pointage_agentId_fkey"
  foreign key ("agentId") references "AgentSecurite"(id) on delete cascade;
alter table "Pointage" alter column id set default gen_random_uuid();

create policy "pointage_insert" on "Pointage" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT','AGENT') );

-- Incidents / main courante : défauts + RLS insert/update.
alter table "IncidentSecurite" alter column id set default gen_random_uuid();
alter table "IncidentSecurite" alter column "updatedAt" set default now();

create policy "incident_insert" on "IncidentSecurite" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT','AGENT') );
create policy "incident_update" on "IncidentSecurite" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT') )
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT') );
