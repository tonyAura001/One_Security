-- Messagerie : création de canaux (Canal). Message a déjà message_insert.
create policy "canal_insert" on "Canal" for insert to authenticated
  with check ( public.current_app_role() in ('DG','RP','RH','MANAGER') );
create policy "canal_update" on "Canal" for update to authenticated
  using ( public.current_app_role() in ('DG','RP','RH','MANAGER') )
  with check ( public.current_app_role() in ('DG','RP','RH','MANAGER') );
