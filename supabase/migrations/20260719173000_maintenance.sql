-- Migration #21 — Domaine MAINTENANCE (tickets + interventions)
create table if not exists public."Ticket" (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  titre text not null,
  "siteId" uuid references public."Site"(id) on delete set null,
  criticite text not null default 'normale' check (criticite in ('critique','haute','normale','basse')),
  stage text not null default 'ouvert' check (stage in ('ouvert','encours','attente','resolu')),
  "dateOuverture" date not null default current_date,
  equipement text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table if not exists public."Intervention" (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  "siteId" uuid references public."Site"(id) on delete set null,
  "technicienId" uuid references public."User"(id) on delete set null,
  "dateHeure" timestamptz not null default now(),
  resume text,
  statut text not null default 'planifiee' check (statut in ('planifiee','terminee')),
  "dureeMin" integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create extension if not exists moddatetime schema extensions;
do $$ declare t text; begin
  foreach t in array array['Ticket','Intervention'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function extensions.moddatetime(''updatedAt'')', t);
    execute format('drop policy if exists %I on public.%I', t||'_maint_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ( public.current_app_role() in (''DG'',''RP'',''MANAGER'',''CONTROLEUR'',''SURVEILLANT'') )', t||'_maint_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_maint_write', t);
    execute format('create policy %I on public.%I for all to authenticated using ( public.current_app_role() in (''DG'',''RP'',''MANAGER'',''CONTROLEUR'') ) with check ( public.current_app_role() in (''DG'',''RP'',''MANAGER'',''CONTROLEUR'') )', t||'_maint_write', t);
  end loop;
end $$;
