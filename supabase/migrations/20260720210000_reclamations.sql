-- ════════════════════════════════════════════════════════════════════════
-- Lot B · Secrétariat — Réclamations clients
-- ════════════════════════════════════════════════════════════════════════
-- Suivi des réclamations clients (objet, sévérité, statut ouverte→en_cours→
-- résolue). RLS : lecture/écriture DG / RP / MANAGER (+ lecture COMPTABLE).

create table if not exists public."Reclamation" (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique,
  "clientId"  uuid references public."Client"(id) on delete set null,
  objet       text not null,
  description text,
  severite    text not null default 'moyenne',   -- elevee|moyenne|faible
  statut      text not null default 'ouverte',    -- ouverte|en_cours|resolue
  "resoluLe"  timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists "Reclamation_statut_idx" on public."Reclamation"(statut);

alter table public."Reclamation" enable row level security;
drop policy if exists "reclamation_read"  on public."Reclamation";
drop policy if exists "reclamation_write" on public."Reclamation";
create policy "reclamation_read" on public."Reclamation"
  for select using (current_app_role() = any (array['DG','RP','MANAGER','COMPTABLE']));
create policy "reclamation_write" on public."Reclamation"
  for all
  using (current_app_role() = any (array['DG','RP','MANAGER']))
  with check (current_app_role() = any (array['DG','RP','MANAGER']));
