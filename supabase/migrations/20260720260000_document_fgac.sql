-- ════════════════════════════════════════════════════════════════════════
-- FGAC Documents — contrôle d'accès granulaire (Supabase-natif, RLS)
-- ════════════════════════════════════════════════════════════════════════
-- Architecture : l'autorisation est imposée par le RLS (au niveau de la base),
-- pas par un middleware applicatif → INCONTOURNABLE côté client (exigence
-- « toute la logique de permission côté backend »).
--
--   Document.visibility ∈ DG | Direction | Managers | Tous
--   DocumentRole  : rôles explicitement autorisés (fine-grained)
--   DocumentUser  : utilisateurs individuellement autorisés
--   DocumentAccessLog : audit (créations/permissions/accès autorisés & refusés)
--
-- Seul le DG modifie visibilité/rôles (RPC set_document_permissions + trigger
-- de défense en profondeur). Le journal est réservé au DG en lecture.

-- ── 1) Colonne visibility ────────────────────────────────────────────────
alter table public."Document" add column if not exists visibility text not null default 'Tous';
do $$ begin
  alter table public."Document" add constraint "Document_visibility_chk"
    check (visibility in ('DG','Direction','Managers','Tous'));
exception when duplicate_object then null; end $$;

-- ── 2) Tables de liaison ─────────────────────────────────────────────────
create table if not exists public."DocumentRole" (
  "documentId" uuid not null references public."Document"(id) on delete cascade,
  role text not null,
  primary key ("documentId", role)
);
create table if not exists public."DocumentUser" (
  "documentId" uuid not null references public."Document"(id) on delete cascade,
  "userId" uuid not null references public."User"(id) on delete cascade,
  primary key ("documentId", "userId")
);

-- ── 3) Journal d'accès ───────────────────────────────────────────────────
create table if not exists public."DocumentAccessLog" (
  id          uuid primary key default gen_random_uuid(),
  "documentId" uuid references public."Document"(id) on delete set null,
  "userId"    uuid references public."User"(id) on delete set null,
  action      text not null,               -- open|denied|permissions|create|update|delete
  allowed     boolean not null default true,
  detail      text,
  "createdAt" timestamptz not null default now()
);
create index if not exists "DocAccessLog_doc_idx" on public."DocumentAccessLog"("documentId","createdAt" desc);
create index if not exists "DocAccessLog_denied_idx" on public."DocumentAccessLog"(allowed,"createdAt" desc);

-- ── 4) RLS Document : lecture selon la visibilité ────────────────────────
drop policy if exists "document_read" on public."Document";
create policy "document_read" on public."Document"
  for select using (
    current_app_role() = 'DG'
    or "creeParId" = auth.uid()
    or visibility = 'Tous'
    or (visibility = 'Managers' and current_app_role() = any (array['DG','RP','RF','RH','MANAGER','CONTROLEUR']))
    or (visibility = 'Direction' and current_app_role() = any (array['DG','RP','RF']))
    or exists (select 1 from public."DocumentRole" dr where dr."documentId" = id and dr.role = current_app_role())
    or exists (select 1 from public."DocumentUser" du where du."documentId" = id and du."userId" = auth.uid())
  );

-- Défense en profondeur : seul le DG peut changer la visibilité (même via PostgREST direct).
create or replace function public.tg_document_visibility_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility is distinct from old.visibility and current_app_role() <> 'DG' then
    raise exception 'seul le Directeur Général peut modifier la visibilité d''un document' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists document_visibility_guard on public."Document";
create trigger document_visibility_guard before update on public."Document"
  for each row execute function public.tg_document_visibility_guard();

-- ── 5) RLS liaisons + journal ────────────────────────────────────────────
alter table public."DocumentRole" enable row level security;
alter table public."DocumentUser" enable row level security;
alter table public."DocumentAccessLog" enable row level security;

drop policy if exists "docrole_read" on public."DocumentRole";
create policy "docrole_read" on public."DocumentRole" for select using (auth.uid() is not null);
-- écriture liaisons : DG uniquement (aussi couvert par le RPC)
drop policy if exists "docrole_write" on public."DocumentRole";
create policy "docrole_write" on public."DocumentRole" for all
  using (current_app_role() = 'DG') with check (current_app_role() = 'DG');
drop policy if exists "docuser_read" on public."DocumentUser";
create policy "docuser_read" on public."DocumentUser" for select using (auth.uid() is not null);
drop policy if exists "docuser_write" on public."DocumentUser";
create policy "docuser_write" on public."DocumentUser" for all
  using (current_app_role() = 'DG') with check (current_app_role() = 'DG');

drop policy if exists "doclog_read" on public."DocumentAccessLog";
create policy "doclog_read" on public."DocumentAccessLog" for select
  using (current_app_role() = 'DG');
-- insertion du journal : via RPC SECURITY DEFINER (pas d'insert direct client)

-- ── 6) RPC : le DG règle les permissions d'un document (atomique + audit) ─
create or replace function public.set_document_permissions(
  _doc uuid, _visibility text, _roles text[] default '{}', _users uuid[] default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare _r text; _u uuid;
begin
  if current_app_role() <> 'DG' then
    raise exception 'réservé au Directeur Général' using errcode = '42501';
  end if;
  if _visibility not in ('DG','Direction','Managers','Tous') then
    raise exception 'visibilité invalide';
  end if;
  update public."Document" set visibility = _visibility, "updatedAt" = now() where id = _doc;
  delete from public."DocumentRole" where "documentId" = _doc;
  foreach _r in array coalesce(_roles, '{}') loop
    insert into public."DocumentRole"("documentId", role) values (_doc, upper(_r)) on conflict do nothing;
  end loop;
  delete from public."DocumentUser" where "documentId" = _doc;
  foreach _u in array coalesce(_users, '{}') loop
    insert into public."DocumentUser"("documentId","userId") values (_doc, _u) on conflict do nothing;
  end loop;
  insert into public."DocumentAccessLog"("documentId","userId",action,allowed,detail)
    values (_doc, auth.uid(), 'permissions', true, 'visibility=' || _visibility);
end $$;
grant execute on function public.set_document_permissions(uuid,text,text[],uuid[]) to authenticated;

-- ── 7) RPC : journaliser un accès (ouverture / refus) ────────────────────
create or replace function public.log_document_access(_doc uuid, _action text, _allowed boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public."DocumentAccessLog"("documentId","userId",action,allowed)
    values (_doc, auth.uid(), coalesce(_action,'open'), coalesce(_allowed,true));
end $$;
grant execute on function public.log_document_access(uuid,text,boolean) to authenticated;
