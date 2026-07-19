-- Migration #22 — Domaine CAISSE / POS
create table if not exists public."Produit" (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null default 'Divers',
  prix integer not null default 0,
  stock integer not null default 0,
  "seuilAlerte" integer not null default 5,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table if not exists public."TicketCaisse" (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  "dateHeure" timestamptz not null default now(),
  "nbArticles" integer not null default 0,
  total integer not null default 0,
  "moyenPaiement" text not null default 'Espèces' check ("moyenPaiement" in ('Espèces','Wave','Orange Money')),
  "caissierId" uuid references public."User"(id) on delete set null,
  "createdAt" timestamptz not null default now()
);
create extension if not exists moddatetime schema extensions;
alter table public."Produit" enable row level security;
alter table public."TicketCaisse" enable row level security;
drop trigger if exists set_updated_at on public."Produit";
create trigger set_updated_at before update on public."Produit" for each row execute function extensions.moddatetime('updatedAt');
-- RLS caisse : DG / RF / COMPTABLE.
do $$ declare t text; begin
  foreach t in array array['Produit','TicketCaisse'] loop
    execute format('drop policy if exists %I on public.%I', t||'_caisse_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ( public.current_app_role() in (''DG'',''RF'',''COMPTABLE'') )', t||'_caisse_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_caisse_write', t);
    execute format('create policy %I on public.%I for all to authenticated using ( public.current_app_role() in (''DG'',''RF'',''COMPTABLE'') ) with check ( public.current_app_role() in (''DG'',''RF'',''COMPTABLE'') )', t||'_caisse_write', t);
  end loop;
end $$;
