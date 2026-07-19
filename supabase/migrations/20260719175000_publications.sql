-- Migration #23 — Domaine COMMUNITY MANAGEMENT (publications)
create table if not exists public."Publication" (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  contenu text,
  canal text not null default 'LinkedIn' check (canal in ('Facebook','LinkedIn','Instagram','Site web')),
  "datePublication" date not null default current_date,
  statut text not null default 'brouillon' check (statut in ('planifie','publie','brouillon')),
  engagement integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
alter table public."Publication" enable row level security;
create extension if not exists moddatetime schema extensions;
drop trigger if exists set_updated_at on public."Publication";
create trigger set_updated_at before update on public."Publication" for each row execute function extensions.moddatetime('updatedAt');
drop policy if exists "publication_read" on public."Publication";
create policy "publication_read" on public."Publication" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','RH','MANAGER') );
drop policy if exists "publication_write" on public."Publication";
create policy "publication_write" on public."Publication" for all to authenticated
  using ( public.current_app_role() in ('DG','RP','RH','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','RH','MANAGER') );
