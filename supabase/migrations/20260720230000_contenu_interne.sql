-- ════════════════════════════════════════════════════════════════════════
-- Lot C · Contenu interne générique (notes, décisions, annonces, réunions)
-- ════════════════════════════════════════════════════════════════════════
-- Une table unique discriminée par `type` alimente plusieurs écrans « liste de
-- contenu daté ». Champs communs + `meta` JSON pour les spécificités
-- (couleur/épingle des notes, audience des annonces, mode/heure des réunions,
-- catégorie des décisions).
-- RLS : lecture staff authentifié ; écriture = auteur (ou DG).

create table if not exists public."ContenuInterne" (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,               -- note|decision|annonce|reunion
  titre       text not null,
  corps       text,
  categorie   text,                         -- catégorie/couleur/audience selon type
  statut      text not null default 'actif',
  "dateEvenement" timestamptz,              -- date de réunion / d'effet
  epingle     boolean not null default false,
  meta        jsonb not null default '{}',
  "auteurId"  uuid references public."User"(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists "ContenuInterne_type_idx" on public."ContenuInterne"(type, "createdAt" desc);

alter table public."ContenuInterne" enable row level security;
drop policy if exists "contenu_read"   on public."ContenuInterne";
drop policy if exists "contenu_insert" on public."ContenuInterne";
drop policy if exists "contenu_modify" on public."ContenuInterne";
drop policy if exists "contenu_delete" on public."ContenuInterne";
create policy "contenu_read" on public."ContenuInterne"
  for select using (auth.uid() is not null);
create policy "contenu_insert" on public."ContenuInterne"
  for insert with check ("auteurId" = auth.uid());
create policy "contenu_modify" on public."ContenuInterne"
  for update using ("auteurId" = auth.uid() or current_app_role() = 'DG')
           with check ("auteurId" = auth.uid() or current_app_role() = 'DG');
create policy "contenu_delete" on public."ContenuInterne"
  for delete using ("auteurId" = auth.uid() or current_app_role() = 'DG');
