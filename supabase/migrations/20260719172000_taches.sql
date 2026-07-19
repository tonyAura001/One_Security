-- Migration #20 — Domaine TÂCHES partagées
create table if not exists public."Tache" (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null,
  description  text,
  priorite     text not null default 'moyenne' check (priorite in ('basse','moyenne','haute')),
  echeance     date,
  terminee     boolean not null default false,
  "assigneAId" uuid references public."User"(id) on delete set null,
  "creeParId"  uuid references public."User"(id) on delete set null,
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);
create index if not exists idx_tache_assigne on public."Tache"("assigneAId");
alter table public."Tache" enable row level security;
create extension if not exists moddatetime schema extensions;
drop trigger if exists set_updated_at on public."Tache";
create trigger set_updated_at before update on public."Tache"
  for each row execute function extensions.moddatetime('updatedAt');

-- RLS : mes tâches (assignées/créées) + les managers voient tout.
drop policy if exists "tache_read" on public."Tache";
create policy "tache_read" on public."Tache" for select to authenticated
  using ( "assigneAId" = auth.uid() or "creeParId" = auth.uid()
    or public.current_app_role() in ('DG','MANAGER','RP','RH') );
drop policy if exists "tache_write" on public."Tache";
create policy "tache_write" on public."Tache" for all to authenticated
  using ( "assigneAId" = auth.uid() or "creeParId" = auth.uid()
    or public.current_app_role() in ('DG','MANAGER','RP','RH') )
  with check ( "creeParId" = auth.uid()
    or public.current_app_role() in ('DG','MANAGER','RP','RH') );
