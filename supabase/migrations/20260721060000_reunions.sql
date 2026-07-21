-- ════════════════════════════════════════════════════════════════════════
-- Réunions avec participants — visibilité RESTREINTE aux concernés (RLS)
-- ════════════════════════════════════════════════════════════════════════
-- Une réunion n'est visible (et donc notifiée) qu'à son organisateur et à ses
-- participants. Les autres utilisateurs ne voient pas qu'elle existe.

create table if not exists public."Reunion" (
  id              uuid primary key default gen_random_uuid(),
  titre           text not null,
  "dateHeure"     timestamptz not null,
  "dureeMin"      integer not null default 60,
  lieu            text,
  mode            text not null default 'presentiel',   -- presentiel|visio
  "ordreDuJour"   text,
  "compteRendu"   text,
  "organisateurId" uuid not null references public."User"(id) on delete cascade,
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);
create index if not exists "Reunion_date_idx" on public."Reunion"("dateHeure");

create table if not exists public."ReunionParticipant" (
  "reunionId" uuid not null references public."Reunion"(id) on delete cascade,
  "userId"    uuid not null references public."User"(id) on delete cascade,
  primary key ("reunionId", "userId")
);
create index if not exists "ReunionParticipant_user_idx" on public."ReunionParticipant"("userId");

-- Fonctions SECURITY DEFINER : évitent la récursion entre les deux policies.
create or replace function public.is_reunion_member(rid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from public."ReunionParticipant" p
                 where p."reunionId" = rid and p."userId" = auth.uid());
$$;
create or replace function public.is_reunion_organizer(rid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from public."Reunion" r
                 where r.id = rid and r."organisateurId" = auth.uid());
$$;
grant execute on function public.is_reunion_member(uuid) to authenticated;
grant execute on function public.is_reunion_organizer(uuid) to authenticated;

alter table public."Reunion" enable row level security;
alter table public."ReunionParticipant" enable row level security;

-- Réunion : lecture réservée à l'organisateur OU un participant.
drop policy if exists "reunion_read"   on public."Reunion";
drop policy if exists "reunion_insert" on public."Reunion";
drop policy if exists "reunion_write"  on public."Reunion";
drop policy if exists "reunion_delete" on public."Reunion";
create policy "reunion_read" on public."Reunion" for select to authenticated
  using ("organisateurId" = auth.uid() or public.is_reunion_member(id));
create policy "reunion_insert" on public."Reunion" for insert to authenticated
  with check ("organisateurId" = auth.uid());
create policy "reunion_write" on public."Reunion" for update to authenticated
  using ("organisateurId" = auth.uid() or public.current_app_role() = 'DG')
  with check ("organisateurId" = auth.uid() or public.current_app_role() = 'DG');
create policy "reunion_delete" on public."Reunion" for delete to authenticated
  using ("organisateurId" = auth.uid() or public.current_app_role() = 'DG');

-- Participants : chacun voit sa propre invitation ; l'organisateur gère la liste.
drop policy if exists "rp_read"   on public."ReunionParticipant";
drop policy if exists "rp_insert" on public."ReunionParticipant";
drop policy if exists "rp_delete" on public."ReunionParticipant";
create policy "rp_read" on public."ReunionParticipant" for select to authenticated
  using ("userId" = auth.uid() or public.is_reunion_organizer("reunionId"));
create policy "rp_insert" on public."ReunionParticipant" for insert to authenticated
  with check (public.is_reunion_organizer("reunionId"));
create policy "rp_delete" on public."ReunionParticipant" for delete to authenticated
  using (public.is_reunion_organizer("reunionId"));
