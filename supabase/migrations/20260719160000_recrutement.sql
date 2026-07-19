-- ============================================================================
-- Migration #15 — Domaine RECRUTEMENT
--
-- Décisions : Recruteur = User (rôle RH) ; Fichier réutilisé (+ candidatureId).
-- Accès : équipe recrutement (DG/RH/MANAGER) sur Poste/Candidat/Candidature ;
-- Entretien = le recruteur voit/édite les siens (recruteurId = auth.uid()),
-- Manager/DG voient tout ; les candidats n'ont aucun accès direct.
-- ============================================================================

-- ── Poste (poste à pourvoir) ──
create table if not exists public."Poste" (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null,
  description  text,
  "salaireMin" integer,
  "salaireMax" integer,
  lieu         text,
  "typeContrat" text not null default 'CDI'
    check ("typeContrat" in ('CDI','CDD','STAGE','INTERIM','FREELANCE')),
  statut       text not null default 'ouvert'
    check (statut in ('ouvert','pourvu','ferme')),
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);

-- ── Candidat ──
create table if not exists public."Candidat" (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  prenom         text not null,
  email          text,
  telephone      text,
  adresse        text,
  "dateNaissance" date,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

-- ── Candidature (candidat -> poste) ──
create table if not exists public."Candidature" (
  id                uuid primary key default gen_random_uuid(),
  "posteId"         uuid not null references public."Poste"(id) on delete cascade,
  "candidatId"      uuid not null references public."Candidat"(id) on delete cascade,
  statut            text not null default 'nouveau'
    check (statut in ('nouveau','preselection','entretien','offre','embauche','refuse')),
  "datePostulation" date not null default current_date,
  "messageMotivation" text,
  "createdAt"       timestamptz not null default now(),
  "updatedAt"       timestamptz not null default now()
);
create index if not exists idx_candidature_poste on public."Candidature"("posteId");
create index if not exists idx_candidature_candidat on public."Candidature"("candidatId");
create index if not exists idx_candidature_statut on public."Candidature"(statut);

-- ── Entretien (candidature -> recruteur=User) ──
create table if not exists public."Entretien" (
  id              uuid primary key default gen_random_uuid(),
  "candidatureId" uuid not null references public."Candidature"(id) on delete cascade,
  "recruteurId"   uuid not null references public."User"(id) on delete restrict,
  "dateHeure"     timestamptz not null,
  type            text not null default 'physique'
    check (type in ('telephonique','visio','physique')),
  statut          text not null default 'planifie'
    check (statut in ('planifie','realise','annule')),
  "compteRendu"   text,
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);
create index if not exists idx_entretien_candidature on public."Entretien"("candidatureId");
create index if not exists idx_entretien_recruteur on public."Entretien"("recruteurId");

-- ── Fichier : rattachement aux candidatures (réutilise la table existante) ──
alter table public."Fichier" add column if not exists "candidatureId" uuid
  references public."Candidature"(id) on delete cascade;

-- ── Triggers updatedAt ──
create extension if not exists moddatetime schema extensions;
do $$
declare t text;
begin
  foreach t in array array['Poste','Candidat','Candidature','Entretien'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function extensions.moddatetime(''updatedAt'')', t);
  end loop;
end $$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public."Poste"       enable row level security;
alter table public."Candidat"    enable row level security;
alter table public."Candidature" enable row level security;
alter table public."Entretien"   enable row level security;

-- Équipe recrutement : DG / RH / MANAGER (lecture + écriture) sur
-- Poste / Candidat / Candidature.
do $$
declare t text;
begin
  foreach t in array array['Poste','Candidat','Candidature'] loop
    execute format('drop policy if exists %I on public.%I', t||'_recrutement_read', t);
    execute format('create policy %I on public.%I for select to authenticated
      using ( public.current_app_role() in (''DG'',''RH'',''MANAGER'') )', t||'_recrutement_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_recrutement_write', t);
    execute format('create policy %I on public.%I for all to authenticated
      using ( public.current_app_role() in (''DG'',''RH'',''MANAGER'') )
      with check ( public.current_app_role() in (''DG'',''RH'',''MANAGER'') )', t||'_recrutement_write', t);
  end loop;
end $$;

-- Entretien : le recruteur voit/gère les SIENS ; Manager & DG voient/gèrent tout.
drop policy if exists "entretien_read" on public."Entretien";
create policy "entretien_read" on public."Entretien" for select to authenticated
  using ( "recruteurId" = auth.uid() or public.current_app_role() in ('DG','MANAGER') );

drop policy if exists "entretien_write" on public."Entretien";
create policy "entretien_write" on public."Entretien" for all to authenticated
  using ( "recruteurId" = auth.uid() or public.current_app_role() in ('DG','MANAGER') )
  with check ( "recruteurId" = auth.uid() or public.current_app_role() in ('DG','MANAGER') );

-- Fichiers de candidature : équipe recrutement.
drop policy if exists "fichier_candidature_read" on public."Fichier";
create policy "fichier_candidature_read" on public."Fichier" for select to authenticated
  using ( "candidatureId" is not null and public.current_app_role() in ('DG','RH','MANAGER') );
drop policy if exists "fichier_candidature_write" on public."Fichier";
create policy "fichier_candidature_write" on public."Fichier" for all to authenticated
  using ( "candidatureId" is not null and public.current_app_role() in ('DG','RH','MANAGER') )
  with check ( "candidatureId" is not null and public.current_app_role() in ('DG','RH','MANAGER') );
