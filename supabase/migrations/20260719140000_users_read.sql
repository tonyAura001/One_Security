-- Migration #8 — MODULE membres : lecture de la table User
-- (gestion des membres/habilitations, réservée à la direction / RH).
drop policy if exists "users_read_admin" on public."User";
create policy "users_read_admin" on public."User" for select to authenticated
  using ( public.current_app_role() in ('DG', 'RH') );
