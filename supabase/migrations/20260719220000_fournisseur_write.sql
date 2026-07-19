-- Création/édition de fournisseurs via PostgREST (défauts DB + RLS write).
alter table "Fournisseur" alter column id set default gen_random_uuid();
alter table "Fournisseur" alter column "updatedAt" set default now();

create policy "fournisseur_insert" on "Fournisseur" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RF','COMPTABLE') );
create policy "fournisseur_update" on "Fournisseur" for update to authenticated
  using ( public.current_app_role() in ('DG','RF','COMPTABLE') )
  with check ( public.current_app_role() in ('DG','RF','COMPTABLE') );
