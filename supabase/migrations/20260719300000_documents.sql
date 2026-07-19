-- Éditeur de documents PilotePME : table Document (contenu structuré en JSON).
create table if not exists "Document" (
  id uuid primary key default gen_random_uuid(),
  type text not null,                       -- devis | facture_proforma | rapport | fiche_engagement | communique
  numero text,
  titre text not null,
  statut text not null default 'brouillon', -- brouillon | finalise | signe
  donnees jsonb not null default '{}'::jsonb,
  "clientId" uuid references "Client"(id) on delete set null,
  "creeParId" uuid,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists "Document_type_idx" on "Document"(type);

alter table "Document" enable row level security;

create policy "document_read" on "Document" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','RF','RH','COMPTABLE','MANAGER') );
create policy "document_insert" on "Document" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','RF','RH','COMPTABLE','MANAGER') );
create policy "document_update" on "Document" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','RF','RH','COMPTABLE','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','RF','RH','COMPTABLE','MANAGER') );
create policy "document_delete" on "Document" for delete to authenticated
  using ( public.current_app_role() in ('DG','RP') );
