-- Migration #25 — Messagerie (Canal + Message) : comms internes.
alter table public."Canal" alter column id set default gen_random_uuid();
alter table public."Canal" alter column "updatedAt" set default now();
alter table public."Message" alter column id set default gen_random_uuid();
-- Lecture : tout utilisateur authentifié (comms d'équipe). Écriture : ses propres messages.
drop policy if exists "canal_read" on public."Canal";
create policy "canal_read" on public."Canal" for select to authenticated using ( true );
drop policy if exists "message_read" on public."Message";
create policy "message_read" on public."Message" for select to authenticated using ( true );
drop policy if exists "message_insert" on public."Message";
create policy "message_insert" on public."Message" for insert to authenticated
  with check ( "auteurId" = auth.uid() );
