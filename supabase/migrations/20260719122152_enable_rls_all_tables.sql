-- ============================================================================
-- Migration Supabase-native #1 — FONDATION SÉCURITÉ
--
-- Contexte : les tables ont été créées par les migrations Prisma (API NestJS),
-- donc SANS RLS. Sur Supabase, une table `public` sans RLS est exposée en
-- lecture/écriture via PostgREST avec la simple clé anon (publique). Faille
-- critique corrigée ici : on active RLS partout (deny-by-default). Sans policy,
-- `anon`/`authenticated` n'ont plus AUCUN accès via PostgREST.
--
-- Note : l'API NestJS (fallback pendant la migration) se connecte en superuser
-- (`postgres`) et BYPASSE le RLS → elle continue de fonctionner sans changement.
-- Les policies fines seront ajoutées module par module (strangler).
-- ============================================================================

-- 1) Activer RLS sur TOUTES les tables du schéma public (idempotent).
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security;', t.relname);
  end loop;
end $$;

-- 2) Helper : rôle métier de l'appelant, lu depuis le claim JWT
--    `app_metadata.role` (posé par Supabase Auth). Renvoie NULL si non connecté.
--    Utilisé par les futures policies : `using ( public.current_app_role() = 'DG' )`.
--    SECURITY DEFINER + search_path vide = bonne pratique Supabase.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    ''
  );
$$;

comment on function public.current_app_role() is
  'Rôle métier (app_metadata.role) de l''utilisateur courant, depuis le JWT Supabase. Base des RLS policies.';
