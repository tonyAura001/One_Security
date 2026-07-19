-- Migration #10 — MODULE pointage/présences (lecture)
-- Pointage est événementiel ; l'écran agrège en présences journalières.
-- Lecture Pointage + join User/Site pour les rôles opérationnels.
drop policy if exists "pointage_read_ops" on public."Pointage";
create policy "pointage_read_ops" on public."Pointage" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT') );
-- Annuaire : les rôles ops peuvent lire les infos de base des agents (User).
drop policy if exists "users_read_ops" on public."User";
create policy "users_read_ops" on public."User" for select to authenticated
  using ( public.current_app_role() in ('RP','MANAGER','CONTROLEUR','SURVEILLANT') );
-- Sites lisibles par les rôles ops (pour le nom du site).
drop policy if exists "sites_read_ops" on public."Site";
create policy "sites_read_ops" on public."Site" for select to authenticated
  using ( public.current_app_role() in ('RP','MANAGER','CONTROLEUR','SURVEILLANT') );
