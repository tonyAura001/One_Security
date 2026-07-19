-- ============================================================================
-- Migration #13 — Table AgentSecurite (agents de sécurité déployés sur le
-- terrain). Entité distincte de User (utilisateurs app) et des employés.
-- ============================================================================
create table if not exists public."AgentSecurite" (
  id             uuid primary key default gen_random_uuid(),
  prenom         text not null,
  nom            text,
  "dateNaissance" date,
  "lieuNaissance" text,
  "numeroCni"    text,          -- texte : formats variés (CNI, passeport, étranger)
  matricule      text,
  telephone      text,
  telephone2     text,
  adresse        text,
  "dateDebut"    date,          -- parsée au mieux (voir dateDebutRaw pour l'original)
  "dateDebutRaw" text,          -- valeur brute exacte du PDF (fidélité)
  salaire        integer,
  poste          text,          -- affectation (⚠ certaines tronquées dans le PDF source)
  statut         text not null default 'actif' check (statut in ('actif','inactif','suspendu')),
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);
alter table public."AgentSecurite" enable row level security;

-- Lecture : direction + rôles opérationnels + RH.
drop policy if exists "agents_securite_read" on public."AgentSecurite";
create policy "agents_securite_read" on public."AgentSecurite" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT','RH') );
