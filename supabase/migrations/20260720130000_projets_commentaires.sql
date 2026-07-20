-- ════════════════════════════════════════════════════════════════════════
-- S2 · J1.4 — Projets (déploiements) réels + fil de commentaires
-- ════════════════════════════════════════════════════════════════════════
-- 1. Table `Projet` (déploiement de dispositif) + lien `Tache.projetId`.
-- 2. Extension de l'enum `EntiteCommentaire` : TACHE, PROJET.
-- 3. RLS `Projet` (lecture staff, écriture DG/MANAGER/RP) + RLS `Commentaire`
--    (lecture staff, écriture par l'auteur uniquement) — jusqu'ici Commentaire
--    avait RLS activé SANS aucune policy (donc inaccessible).

-- ── Projet ───────────────────────────────────────────────────────────────
create table if not exists public."Projet" (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  description    text,
  "siteClient"   text,
  "responsableId" uuid references public."User"(id) on delete set null,
  statut         text not null default 'planifie',   -- planifie|en_cours|a_risque|en_avance|termine
  "avancementPct" integer not null default 0,
  "budgetTotal"  integer not null default 0,
  "budgetEngage" integer not null default 0,
  echeance       date,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

-- lien Tâche → Projet (optionnel)
alter table public."Tache" add column if not exists "projetId" uuid
  references public."Projet"(id) on delete set null;
create index if not exists "Tache_projetId_idx" on public."Tache"("projetId");

-- ── Enum commentaire : nouvelles entités ────────────────────────────────
alter type public."EntiteCommentaire" add value if not exists 'TACHE';
alter type public."EntiteCommentaire" add value if not exists 'PROJET';

-- ── Défauts PostgREST pour Commentaire (id/datePublication) ──────────────
alter table public."Commentaire" alter column id set default gen_random_uuid();
alter table public."Commentaire" alter column "datePublication" set default now();

-- ── RLS Projet ───────────────────────────────────────────────────────────
alter table public."Projet" enable row level security;
drop policy if exists "Projet_read"  on public."Projet";
drop policy if exists "Projet_write" on public."Projet";
create policy "Projet_read" on public."Projet"
  for select using (auth.uid() is not null);
create policy "Projet_write" on public."Projet"
  for all
  using (current_app_role() = any (array['DG','MANAGER','RP']))
  with check (current_app_role() = any (array['DG','MANAGER','RP']));

-- ── RLS Commentaire (auteur = auth.uid()) ────────────────────────────────
drop policy if exists "Commentaire_read"   on public."Commentaire";
drop policy if exists "Commentaire_insert" on public."Commentaire";
drop policy if exists "Commentaire_modify" on public."Commentaire";
drop policy if exists "Commentaire_delete" on public."Commentaire";
create policy "Commentaire_read" on public."Commentaire"
  for select using (auth.uid() is not null);
create policy "Commentaire_insert" on public."Commentaire"
  for insert with check ("auteurId" = auth.uid());
create policy "Commentaire_modify" on public."Commentaire"
  for update using ("auteurId" = auth.uid()) with check ("auteurId" = auth.uid());
create policy "Commentaire_delete" on public."Commentaire"
  for delete using ("auteurId" = auth.uid());

-- ── Lecture d'un fil de commentaires avec nom d'auteur (sans exposer User) ─
create or replace function public.commentaires_for(_entite public."EntiteCommentaire", _id uuid)
returns table (id uuid, contenu text, "datePublication" timestamp, "auteurId" uuid, auteur text)
language sql
security definer
set search_path = public
as $$
  select c.id, c.contenu, c."datePublication", c."auteurId",
         coalesce(nullif(btrim(u.prenom || ' ' || coalesce(u.nom, '')), ''), 'Utilisateur')
  from public."Commentaire" c
  left join public."User" u on u.id = c."auteurId"
  where c.entite = _entite and c."idEntite" = _id
  order by c."datePublication" asc;
$$;
grant execute on function public.commentaires_for(public."EntiteCommentaire", uuid) to authenticated;
