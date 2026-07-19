-- ============================================================================
-- Migration Supabase-native #5 — clients EN ÉCRITURE
--
-- Prisma gère `updatedAt` (@updatedAt) et `createdAt` côté application. Pour un
-- INSERT/UPDATE direct via PostgREST, il faut des défauts/triggers DB.
-- ============================================================================

-- 1) id + updatedAt : Prisma les génère côté application (@default(uuid()),
--    @updatedAt). Pour un INSERT direct via PostgREST, il faut des défauts DB.
--    ⚠️ Systémique : toute table écrite via PostgREST aura besoin de ces défauts.
alter table public."Client" alter column id set default gen_random_uuid();
alter table public."Client" alter column "updatedAt" set default now();
create extension if not exists moddatetime schema extensions;
drop trigger if exists client_set_updated_at on public."Client";
create trigger client_set_updated_at
  before update on public."Client"
  for each row execute function extensions.moddatetime("updatedAt");

-- 2) Écriture réservée aux rôles commerciaux (DG, RP).
--    (RF/COMPTABLE peuvent LIRE les clients mais pas les créer/modifier.)
drop policy if exists "clients_insert_commerce" on public."Client";
create policy "clients_insert_commerce"
  on public."Client" for insert to authenticated
  with check ( public.current_app_role() in ('DG', 'RP') );

drop policy if exists "clients_update_commerce" on public."Client";
create policy "clients_update_commerce"
  on public."Client" for update to authenticated
  using ( public.current_app_role() in ('DG', 'RP') )
  with check ( public.current_app_role() in ('DG', 'RP') );
