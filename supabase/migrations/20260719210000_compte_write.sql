-- Création de comptes bancaires via PostgREST (défauts DB + RLS insert/update).
-- Nécessaire depuis la purge des comptes de démo : sans compte, le formulaire
-- de mouvement de trésorerie est inutilisable.
alter table "CompteBancaire" alter column id set default gen_random_uuid();
alter table "CompteBancaire" alter column "updatedAt" set default now();

create policy "compte_insert" on "CompteBancaire" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RF') );
create policy "compte_update" on "CompteBancaire" for update to authenticated
  using ( public.current_app_role() in ('DG','RF') )
  with check ( public.current_app_role() in ('DG','RF') );
