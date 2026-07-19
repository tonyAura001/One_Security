-- Migration #7 — MODULE prospects (kanban, lecture + écriture)
-- Colonnes UI (pipeline stage, besoin, owner) + défauts DB (write) + policies.
alter table public."Prospect" alter column id set default gen_random_uuid();
alter table public."Prospect" alter column "updatedAt" set default now();
alter table public."Prospect" add column if not exists stage text
  not null default 'nouveau'
  check (stage in ('nouveau','qualifie','devis','negociation','gagne','perdu'));
alter table public."Prospect" add column if not exists besoin text;
alter table public."Prospect" add column if not exists owner text;
alter table public."Prospect" add column if not exists "ownerInitials" text;

drop policy if exists "prospects_read_commerce" on public."Prospect";
create policy "prospects_read_commerce" on public."Prospect" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER') );
drop policy if exists "prospects_write_commerce" on public."Prospect";
create policy "prospects_write_commerce" on public."Prospect" for update to authenticated
  using ( public.current_app_role() in ('DG','RP') )
  with check ( public.current_app_role() in ('DG','RP') );
