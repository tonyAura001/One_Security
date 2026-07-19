-- Catalogue équipements (Materiel) : création via PostgREST.
alter table "Materiel" alter column id set default gen_random_uuid();
alter table "Materiel" alter column "updatedAt" set default now();

create policy "materiel_insert" on "Materiel" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','RF','COMPTABLE','MANAGER') );
create policy "materiel_update" on "Materiel" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','RF','COMPTABLE','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','RF','COMPTABLE','MANAGER') );
