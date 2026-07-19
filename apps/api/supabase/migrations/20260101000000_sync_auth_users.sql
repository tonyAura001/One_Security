-- Synchronise Supabase Auth (auth.users) → public."User".
-- À la création d'un compte, crée la fiche métier correspondante.
-- Le rôle primaire et le nom/prénom viennent des métadonnées Supabase.
-- ⚠️ À appliquer APRÈS les migrations Prisma (les tables doivent exister).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."User" (
    id, email, nom, prenom, role, "dateEmbauche", actif, "createdAt", "updatedAt"
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nom', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public."RoleName", 'AGENT'),
    current_date,
    true,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
