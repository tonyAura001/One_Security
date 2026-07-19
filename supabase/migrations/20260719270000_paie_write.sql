-- Paie : génération de bulletins pour les agents réels.
-- Repointer agentId User -> AgentSecurite (table vide) + RLS insert.
alter table "BulletinPaie" drop constraint "BulletinPaie_agentId_fkey";
alter table "BulletinPaie" add constraint "BulletinPaie_agentId_fkey"
  foreign key ("agentId") references "AgentSecurite"(id) on delete cascade;

create policy "bulletin_insert" on "BulletinPaie" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RF','RH') );
