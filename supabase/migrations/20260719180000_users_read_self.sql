-- Migration #26 — Chaque utilisateur peut lire SA propre fiche User
-- (nécessaire au cutover DEMO_AUTH=false : le profil vient de la table User).
drop policy if exists "users_read_self" on public."User";
create policy "users_read_self" on public."User" for select to authenticated
  using ( id = auth.uid() );
