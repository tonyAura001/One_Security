-- Création de prospects via PostgREST (id/updatedAt ont déjà des défauts DB).
create policy "prospect_insert" on "Prospect" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','MANAGER') );
