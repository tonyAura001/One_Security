-- ════════════════════════════════════════════════════════════════════════
-- S2 · J1.6 — Community Management : Plateforme + Interaction
-- ════════════════════════════════════════════════════════════════════════
-- Approfondit le module CM (Publication au canal libre) :
--   Plateforme  : comptes/réseaux gérés (Facebook, LinkedIn, site web…).
--   Interaction : ventilation de l'engagement d'une publication (vues, j'aime,
--                 commentaires, partages, clics).
-- Le RPC `enregistrer_engagement` remplace la ventilation d'une publication et
-- recalcule le total `Publication.engagement` de façon atomique + role-gardée.

-- ── Plateforme ───────────────────────────────────────────────────────────
create table if not exists public."Plateforme" (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  type        text not null default 'facebook',  -- facebook|linkedin|instagram|site_web|tiktok|youtube
  handle      text,
  url         text,
  actif       boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- lien Publication → Plateforme (canal libre conservé pour compat)
alter table public."Publication" add column if not exists "plateformeId" uuid
  references public."Plateforme"(id) on delete set null;

-- ── Interaction ──────────────────────────────────────────────────────────
create table if not exists public."Interaction" (
  id              uuid primary key default gen_random_uuid(),
  "publicationId" uuid not null references public."Publication"(id) on delete cascade,
  type            text not null,               -- vue|jaime|commentaire|partage|clic
  nombre          integer not null default 0,
  "createdAt"     timestamptz not null default now()
);
create index if not exists "Interaction_publicationId_idx"
  on public."Interaction"("publicationId");

-- ── RLS (mêmes rôles que Publication : DG/RP/RH/MANAGER) ──────────────────
do $$
declare t text;
begin
  foreach t in array array['Plateforme','Interaction'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_cm_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_cm_write', t);
    execute format($f$create policy %I on public.%I for select
      using (current_app_role() = any (array['DG','RP','RH','MANAGER']))$f$, t||'_cm_read', t);
    execute format($f$create policy %I on public.%I for all
      using (current_app_role() = any (array['DG','RP','RH','MANAGER']))
      with check (current_app_role() = any (array['DG','RP','RH','MANAGER']))$f$, t||'_cm_write', t);
  end loop;
end $$;

-- ── RPC : enregistrer la ventilation d'engagement d'une publication ──────
create or replace function public.enregistrer_engagement(_pub uuid, _rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _role  text := current_app_role();
  _row   jsonb;
  _total int := 0;
begin
  if _role is null or _role not in ('DG','RP','RH','MANAGER') then
    raise exception 'accès refusé (rôle CM requis)' using errcode = '42501';
  end if;
  if not exists (select 1 from public."Publication" where id = _pub) then
    raise exception 'publication introuvable';
  end if;

  delete from public."Interaction" where "publicationId" = _pub;
  for _row in select * from jsonb_array_elements(coalesce(_rows, '[]'::jsonb)) loop
    insert into public."Interaction"(id, "publicationId", type, nombre)
      values (gen_random_uuid(), _pub, _row->>'type', greatest(0, coalesce((_row->>'nombre')::int, 0)));
    _total := _total + greatest(0, coalesce((_row->>'nombre')::int, 0));
  end loop;

  update public."Publication" set engagement = _total, "updatedAt" = now() where id = _pub;
  return _total;
end;
$$;
grant execute on function public.enregistrer_engagement(uuid, jsonb) to authenticated;
