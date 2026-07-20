-- Messagerie unifiée : Canal.type = 'canal' (groupe) | 'direct' (DM 1-1).
-- Un DM = un Canal type='direct' à 2 membres (_CanalMembres). RLS scopé aux
-- membres via fonctions SECURITY DEFINER (évite la récursion RLS).

alter table "Canal" add column if not exists type text not null default 'canal';
alter table "Canal" alter column nom drop not null; -- les DM n'ont pas de nom

-- Helpers (definer : contournent le RLS sans récursion)
create or replace function public.is_conv_member(canal uuid) returns boolean
  language sql security definer stable set search_path = public as
$$ select exists(select 1 from "_CanalMembres" where "A" = canal and "B" = auth.uid()) $$;

create or replace function public.can_read_canal(canal uuid) returns boolean
  language sql security definer stable set search_path = public as
$$ select exists(
     select 1 from "Canal" c
     where c.id = canal and (c.type = 'canal' or public.is_conv_member(canal))
   ) $$;

-- Canal : lecture = groupes (tous) OU DM dont je suis membre
drop policy if exists "canal_read" on "Canal";
create policy "canal_read" on "Canal" for select to authenticated
  using ( type = 'canal' or public.is_conv_member(id) );

-- Canal : création de groupe réservée ; les DM passent par le RPC
drop policy if exists "canal_insert" on "Canal";
create policy "canal_insert" on "Canal" for insert to authenticated
  with check ( type = 'canal' and public.current_app_role() in ('DG','RP','RH','MANAGER') );

-- Message : lecture/écriture scopées par le canal
drop policy if exists "message_read" on "Message";
create policy "message_read" on "Message" for select to authenticated
  using ( public.can_read_canal("canalId") );
drop policy if exists "message_insert" on "Message";
create policy "message_insert" on "Message" for insert to authenticated
  with check ( "auteurId" = auth.uid() and public.can_read_canal("canalId") );

-- _CanalMembres : je vois les membres des conversations dont je fais partie
alter table "_CanalMembres" enable row level security;
drop policy if exists "canalmembres_read" on "_CanalMembres";
create policy "canalmembres_read" on "_CanalMembres" for select to authenticated
  using ( public.is_conv_member("A") );

-- RPC : créer/retrouver une conversation directe (2 membres), sûr par construction
create or replace function public.create_direct_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); existing uuid; new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_user = me then raise exception 'cannot DM yourself'; end if;
  select c.id into existing from "Canal" c
   where c.type = 'direct'
     and exists(select 1 from "_CanalMembres" m where m."A" = c.id and m."B" = me)
     and exists(select 1 from "_CanalMembres" m where m."A" = c.id and m."B" = other_user)
   limit 1;
  if existing is not null then return existing; end if;
  insert into "Canal"(nom, type, prive) values (null, 'direct', true) returning id into new_id;
  insert into "_CanalMembres"("A","B") values (new_id, me), (new_id, other_user);
  return new_id;
end $$;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- Liste des conversations de l'utilisateur courant, avec nom d'affichage calculé
-- (nom du canal, ou nom du correspondant pour un DM) — sans exposer la table User.
create or replace function public.my_conversations()
returns table(id uuid, type text, nom text, partner text, description text)
language sql security definer stable set search_path = public as $$
  select c.id, c.type, c.nom,
    case when c.type = 'direct' then (
      select nullif(trim(u.prenom || ' ' || coalesce(u.nom, '')), '')
      from "_CanalMembres" m join "User" u on u.id = m."B"
      where m."A" = c.id and m."B" <> auth.uid() limit 1
    ) else null end,
    c.description
  from "Canal" c
  where c.type = 'canal'
     or exists (select 1 from "_CanalMembres" m where m."A" = c.id and m."B" = auth.uid())
$$;
grant execute on function public.my_conversations() to authenticated;
