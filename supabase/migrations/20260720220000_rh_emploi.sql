-- ════════════════════════════════════════════════════════════════════════
-- Lot B · RH/Recrutement — Contrats de travail + Onboarding
-- ════════════════════════════════════════════════════════════════════════
-- ContratTravail : contrat d'embauche (CDI/CDD) d'un candidat recruté.
-- Onboarding     : checklist d'intégration (une ligne / candidature, étapes JSON).
-- RLS : équipe recrutement (DG / RH / MANAGER).

create table if not exists public."ContratTravail" (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique,
  "candidatureId" uuid references public."Candidature"(id) on delete set null,
  employe        text not null,
  poste          text,
  type           text not null default 'CDI',     -- CDI|CDD
  site           text,
  salaire        integer not null default 0,
  "dateDebut"    date,
  statut         text not null default 'brouillon', -- brouillon|attente|signe
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

create table if not exists public."Onboarding" (
  "candidatureId" uuid primary key references public."Candidature"(id) on delete cascade,
  employe        text,
  etapes         jsonb not null default '[]',       -- [{libelle, fait}]
  "updatedAt"    timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['ContratTravail','Onboarding'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_rh_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_rh_write', t);
    execute format($f$create policy %I on public.%I for select
      using (current_app_role() = any (array['DG','RH','MANAGER']))$f$, t||'_rh_read', t);
    execute format($f$create policy %I on public.%I for all
      using (current_app_role() = any (array['DG','RH','MANAGER']))
      with check (current_app_role() = any (array['DG','RH','MANAGER']))$f$, t||'_rh_write', t);
  end loop;
end $$;
