-- ════════════════════════════════════════════════════════════════════════
-- S4 · J4.1 — Versionnage des documents
-- ════════════════════════════════════════════════════════════════════════
-- Historique immuable des versions d'un document : chaque enregistrement crée
-- un instantané (titre + statut + contenu JSON). RLS alignée sur Document ;
-- pas de policy update/delete → historique non modifiable (DG peut purger via
-- suppression du Document, cascade).

create table if not exists public."DocumentVersion" (
  id           uuid primary key default gen_random_uuid(),
  "documentId" uuid not null references public."Document"(id) on delete cascade,
  version      integer not null,
  titre        text,
  statut       text,
  donnees      jsonb,
  "creeParId"  uuid references public."User"(id) on delete set null,
  "createdAt"  timestamptz not null default now(),
  unique ("documentId", version)
);
create index if not exists "DocumentVersion_documentId_idx"
  on public."DocumentVersion"("documentId", version desc);

alter table public."DocumentVersion" enable row level security;

drop policy if exists "docver_read"   on public."DocumentVersion";
drop policy if exists "docver_insert" on public."DocumentVersion";
create policy "docver_read" on public."DocumentVersion"
  for select using (
    current_app_role() = any (array['DG','RP','RF','RH','COMPTABLE','MANAGER'])
  );
create policy "docver_insert" on public."DocumentVersion"
  for insert with check (
    current_app_role() = any (array['DG','RP','RF','RH','COMPTABLE','MANAGER'])
  );
