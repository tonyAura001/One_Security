-- ════════════════════════════════════════════════════════════════════════
-- PresenceJour : feuille de pointage journalière éditable (agent × jour)
-- ════════════════════════════════════════════════════════════════════════
-- Le modèle `Pointage` ne stocke que des événements horodatés (ARRIVEE/DEPART).
-- On ajoute une synthèse journalière saisissable : statut, heures d'arrivée/
-- départ, heures supplémentaires, notes. Une ligne unique par agent et par jour.
-- Alimente le Pointage journalier (saisie) et les Présences (synthèse mensuelle).

create table if not exists public."PresenceJour" (
  id           uuid primary key default gen_random_uuid(),
  "agentId"    uuid not null references public."AgentSecurite"(id) on delete cascade,
  date         date not null,
  statut       text not null default 'present'
    check (statut in ('present','retard','absent','conge','repos')),
  arrivee      time,
  depart       time,
  "heuresSup"  numeric not null default 0,
  notes        text,
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now(),
  unique ("agentId", date)
);
create index if not exists "PresenceJour_date_idx" on public."PresenceJour"(date);

alter table public."PresenceJour" enable row level security;

drop policy if exists "presencejour_read"  on public."PresenceJour";
drop policy if exists "presencejour_write" on public."PresenceJour";
create policy "presencejour_read" on public."PresenceJour" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT','RH','COMPTABLE') );
create policy "presencejour_write" on public."PresenceJour" for all to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT') )
  with check ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT') );
