-- ============================================================================
-- Migration #18 — Supabase Storage : bucket privé + policies par dossier/rôle
--
-- Upload navigateur → Storage (supabase-js), gâté par RLS sur storage.objects.
-- Bucket privé : accès uniquement via URLs signées (pas de lien public).
-- Organisation : <domaine>/<ressourceId>/<fichier>  (ex. candidatures/<id>/cv.pdf)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('pilotepme-files', 'pilotepme-files', false)
on conflict (id) do nothing;

-- Dossier candidatures/* : équipe recrutement (DG/RH/MANAGER).
drop policy if exists "files_candidatures_read" on storage.objects;
create policy "files_candidatures_read" on storage.objects for select to authenticated
  using ( bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'candidatures'
    and public.current_app_role() in ('DG','RH','MANAGER') );

drop policy if exists "files_candidatures_write" on storage.objects;
create policy "files_candidatures_write" on storage.objects for insert to authenticated
  with check ( bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'candidatures'
    and public.current_app_role() in ('DG','RH','MANAGER') );

drop policy if exists "files_candidatures_delete" on storage.objects;
create policy "files_candidatures_delete" on storage.objects for delete to authenticated
  using ( bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'candidatures'
    and public.current_app_role() in ('DG','RH','MANAGER') );

-- Dossier agents/* : direction + ops + RH (photos de fiches agents).
drop policy if exists "files_agents_read" on storage.objects;
create policy "files_agents_read" on storage.objects for select to authenticated
  using ( bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'agents'
    and public.current_app_role() in ('DG','RP','RH','MANAGER','CONTROLEUR','SURVEILLANT') );

drop policy if exists "files_agents_write" on storage.objects;
create policy "files_agents_write" on storage.objects for insert to authenticated
  with check ( bucket_id = 'pilotepme-files'
    and (storage.foldername(name))[1] = 'agents'
    and public.current_app_role() in ('DG','RP','RH','MANAGER') );

-- Métadonnées fichiers : défaut id (insert PostgREST).
alter table public."Fichier" alter column id set default gen_random_uuid();
