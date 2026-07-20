-- Planning unifié : entité Vacation (créneau planifié d'un agent sur un site).
-- Distincte de RondeAgent (ronde de contrôle, liée aux incidents). Le planning
-- s'appuie désormais sur Vacation ; RondeAgent conserve son rôle de patrouille.
create table if not exists "Vacation" (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references "AgentSecurite"(id) on delete cascade,
  "siteId" uuid references "Site"(id) on delete set null,
  debut timestamptz not null,
  fin timestamptz not null,
  type text not null default 'jour',       -- jour | nuit | renfort
  statut text not null default 'planifiee',-- planifiee | confirmee | annulee
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists "Vacation_agent_idx" on "Vacation"("agentId");
create index if not exists "Vacation_debut_idx" on "Vacation"(debut);

alter table "Vacation" enable row level security;

create policy "vacation_read" on "Vacation" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT','AGENT','RH') );
create policy "vacation_insert" on "Vacation" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR') );
create policy "vacation_update" on "Vacation" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR') )
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR') );
create policy "vacation_delete" on "Vacation" for delete to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER') );
