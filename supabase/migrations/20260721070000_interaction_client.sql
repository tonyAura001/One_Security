-- Journal des interactions clients (appels, emails, réunions, visites, notes).
create table if not exists public."InteractionClient" (
  id          uuid primary key default gen_random_uuid(),
  "clientId"  uuid references public."Client"(id) on delete cascade,
  type        text not null default 'appel'
              check (type in ('appel','email','reunion','visite','note')),
  "dateHeure" timestamptz not null default now(),
  resume      text,
  notes       text,
  "auteurId"  uuid references public."User"(id) on delete set null,
  "createdAt" timestamptz not null default now()
);
create index if not exists "InteractionClient_client_idx" on public."InteractionClient"("clientId");
create index if not exists "InteractionClient_date_idx" on public."InteractionClient"("dateHeure");

alter table public."InteractionClient" enable row level security;
drop policy if exists "interaction_read"  on public."InteractionClient";
drop policy if exists "interaction_write" on public."InteractionClient";
create policy "interaction_read" on public."InteractionClient" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','RF','COMPTABLE','MANAGER') );
create policy "interaction_write" on public."InteractionClient" for all to authenticated
  using ( public.current_app_role() in ('DG','RP','RF','COMPTABLE','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','RF','COMPTABLE','MANAGER') );
