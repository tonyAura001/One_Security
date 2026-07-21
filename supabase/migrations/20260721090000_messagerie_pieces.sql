-- Pièces jointes des messages (photos, vidéos légères, documents).
alter table public."Message"
  add column if not exists "pieceChemin" text,
  add column if not exists "pieceType"   text,
  add column if not exists "pieceNom"    text,
  add column if not exists "pieceTaille" integer;

-- Storage : dossier messagerie/ (staff authentifié ; chemins en UUID + URLs signées).
drop policy if exists "files_messagerie_read"   on storage.objects;
drop policy if exists "files_messagerie_write"  on storage.objects;
drop policy if exists "files_messagerie_delete" on storage.objects;
create policy "files_messagerie_read" on storage.objects for select to authenticated
  using ( bucket_id = 'pilotepme-files' and (storage.foldername(name))[1] = 'messagerie' );
create policy "files_messagerie_write" on storage.objects for insert to authenticated
  with check ( bucket_id = 'pilotepme-files' and (storage.foldername(name))[1] = 'messagerie' );
create policy "files_messagerie_delete" on storage.objects for delete to authenticated
  using ( bucket_id = 'pilotepme-files' and (storage.foldername(name))[1] = 'messagerie' );
