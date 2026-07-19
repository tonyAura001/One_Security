-- Création/édition de sites gardés via PostgREST (défauts DB + RLS write).
alter table "Site" alter column id set default gen_random_uuid();
alter table "Site" alter column "updatedAt" set default now();

create policy "site_insert" on "Site" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER') );
create policy "site_update" on "Site" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','MANAGER') );
