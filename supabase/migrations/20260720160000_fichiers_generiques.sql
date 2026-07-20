-- ════════════════════════════════════════════════════════════════════════
-- S3 · J2.1 — Pièces jointes génériques (Supabase Storage)
-- ════════════════════════════════════════════════════════════════════════
-- Généralise `Fichier` (jusqu'ici lié à candidature/incident) en pièce jointe
-- polymorphe (entite + idEntite, comme Commentaire), réutilisable par tous les
-- modules. Dossier Storage dédié `attachments/{entite}/{idEntite}/…`.
--
-- Modèle d'accès : les binaires vivent dans le bucket privé, servis par URL
-- signée courte générée UNIQUEMENT après lecture de la ligne `Fichier` — donc
-- le contrôle fin se fait au niveau des policies de la table `Fichier`. Les
-- policies candidature/incident existantes (plus restrictives) restent
-- intactes : les nouvelles policies ne visent QUE les lignes `entite IS NOT NULL`.

-- ── Colonnes polymorphes ─────────────────────────────────────────────────
alter table public."Fichier" add column if not exists entite     text;
alter table public."Fichier" add column if not exists "idEntite" uuid;
create index if not exists "Fichier_entite_idx"
  on public."Fichier"(entite, "idEntite");

-- ── RLS Fichier : pièces jointes génériques (staff authentifié) ──────────
-- N'affecte pas les lignes candidature/incident (entite NULL).
drop policy if exists "fichier_generic_read"  on public."Fichier";
drop policy if exists "fichier_generic_write" on public."Fichier";
create policy "fichier_generic_read" on public."Fichier"
  for select using (entite is not null and current_app_role() is not null);
create policy "fichier_generic_insert" on public."Fichier"
  for insert with check (entite is not null and "uploadedById" = auth.uid());
create policy "fichier_generic_delete" on public."Fichier"
  for delete using (entite is not null and "uploadedById" = auth.uid());

-- ── Storage : dossier attachments/ (staff authentifié) ───────────────────
drop policy if exists "files_attachments_read"   on storage.objects;
drop policy if exists "files_attachments_write"  on storage.objects;
drop policy if exists "files_attachments_delete" on storage.objects;
create policy "files_attachments_read" on storage.objects
  for select using (
    bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'attachments'
    and auth.uid() is not null
  );
create policy "files_attachments_write" on storage.objects
  for insert with check (
    bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'attachments'
    and auth.uid() is not null
  );
create policy "files_attachments_delete" on storage.objects
  for delete using (
    bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'attachments'
    and auth.uid() is not null
  );
