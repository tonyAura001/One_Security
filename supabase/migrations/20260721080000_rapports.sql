-- ════════════════════════════════════════════════════════════════════════
-- Rapports rédigés — tout le monde crée ; l'AUTEUR choisit qui voit ;
-- le DG voit TOUT par défaut.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public."Rapport" (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null,
  corps        text,
  categorie    text not null default 'general',   -- general|securite|incident|operationnel|financier|rh
  visibilite   text not null default 'prive'       -- prive | choisis | tous
               check (visibilite in ('prive','choisis','tous')),
  "auteurId"   uuid not null references public."User"(id) on delete cascade,
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);
create index if not exists "Rapport_auteur_idx" on public."Rapport"("auteurId");

create table if not exists public."RapportLecteur" (
  "rapportId" uuid not null references public."Rapport"(id) on delete cascade,
  "userId"    uuid not null references public."User"(id) on delete cascade,
  primary key ("rapportId","userId")
);
create index if not exists "RapportLecteur_user_idx" on public."RapportLecteur"("userId");

-- Fonctions SECURITY DEFINER (évitent la récursion entre policies).
create or replace function public.is_rapport_lecteur(rid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from public."RapportLecteur" l
                 where l."rapportId" = rid and l."userId" = auth.uid());
$$;
create or replace function public.is_rapport_auteur(rid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from public."Rapport" r
                 where r.id = rid and r."auteurId" = auth.uid());
$$;
grant execute on function public.is_rapport_lecteur(uuid) to authenticated;
grant execute on function public.is_rapport_auteur(uuid) to authenticated;

alter table public."Rapport" enable row level security;
alter table public."RapportLecteur" enable row level security;

-- Lecture : auteur, OU DG (voit tout), OU visibilité 'tous', OU lecteur choisi.
drop policy if exists "rapport_read"   on public."Rapport";
drop policy if exists "rapport_insert" on public."Rapport";
drop policy if exists "rapport_write"  on public."Rapport";
drop policy if exists "rapport_delete" on public."Rapport";
create policy "rapport_read" on public."Rapport" for select to authenticated using (
  "auteurId" = auth.uid()
  or public.current_app_role() = 'DG'
  or visibilite = 'tous'
  or (visibilite = 'choisis' and public.is_rapport_lecteur(id))
);
-- Tout le monde (authentifié) peut créer son rapport.
create policy "rapport_insert" on public."Rapport" for insert to authenticated
  with check ("auteurId" = auth.uid());
create policy "rapport_write" on public."Rapport" for update to authenticated
  using ("auteurId" = auth.uid() or public.current_app_role() = 'DG')
  with check ("auteurId" = auth.uid() or public.current_app_role() = 'DG');
create policy "rapport_delete" on public."Rapport" for delete to authenticated
  using ("auteurId" = auth.uid() or public.current_app_role() = 'DG');

-- Lecteurs : chacun voit son invitation ; l'auteur (ou le DG) gère la liste.
drop policy if exists "rl_read"   on public."RapportLecteur";
drop policy if exists "rl_insert" on public."RapportLecteur";
drop policy if exists "rl_delete" on public."RapportLecteur";
create policy "rl_read" on public."RapportLecteur" for select to authenticated
  using ("userId" = auth.uid() or public.is_rapport_auteur("rapportId") or public.current_app_role() = 'DG');
create policy "rl_insert" on public."RapportLecteur" for insert to authenticated
  with check (public.is_rapport_auteur("rapportId") or public.current_app_role() = 'DG');
create policy "rl_delete" on public."RapportLecteur" for delete to authenticated
  using (public.is_rapport_auteur("rapportId") or public.current_app_role() = 'DG');
