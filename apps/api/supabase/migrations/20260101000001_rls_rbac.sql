-- RLS (Row Level Security) — défense en profondeur sur les tables sensibles.
-- L'API Nest se connecte avec le rôle `service_role` (contourne la RLS) et
-- reste le gardien principal. Ces politiques protègent tout accès DIRECT
-- (PostgREST) et cloisonnent les données par utilisateur.
-- ⚠️ Starter à valider/étendre sur votre projet Supabase.

-- 1) Activer RLS (par défaut : tout refusé sans policy).
alter table public."User"            enable row level security;
alter table public."Role"            enable row level security;
alter table public."UtilisateurRole" enable row level security;
alter table public."Permission"      enable row level security;
alter table public."RolePermission"  enable row level security;

-- 2) Lecture cloisonnée : un utilisateur ne voit que ses propres données.
create policy "user_read_self" on public."User"
  for select using (auth.uid() = id);

create policy "utilisateurrole_read_self" on public."UtilisateurRole"
  for select using (auth.uid() = "utilisateurId");

-- 3) Référentiels (rôles/permissions) lisibles par tout utilisateur connecté.
create policy "role_read_authenticated" on public."Role"
  for select to authenticated using (true);

create policy "permission_read_authenticated" on public."Permission"
  for select to authenticated using (true);

create policy "rolepermission_read_authenticated" on public."RolePermission"
  for select to authenticated using (true);

-- 4) Aucune policy d'écriture : les créations/modifications passent
--    exclusivement par l'API (service_role). À ouvrir finement si besoin.
