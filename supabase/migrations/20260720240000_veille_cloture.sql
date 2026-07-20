-- ════════════════════════════════════════════════════════════════════════
-- Lot C · Veille réputation (CM) + Clôture de caisse (boutique)
-- ════════════════════════════════════════════════════════════════════════

-- Veille : mentions / articles / posts surveillés (sentiment).
create table if not exists public."Veille" (
  id          uuid primary key default gen_random_uuid(),
  extrait     text not null,
  source      text,
  url         text,
  sentiment   text not null default 'neutre',   -- positif|neutre|négatif
  date        date not null default current_date,
  "createdAt" timestamptz not null default now()
);
alter table public."Veille" enable row level security;
drop policy if exists "veille_read"  on public."Veille";
drop policy if exists "veille_write" on public."Veille";
create policy "veille_read" on public."Veille"
  for select using (current_app_role() = any (array['DG','RP','RH','MANAGER']));
create policy "veille_write" on public."Veille"
  for all
  using (current_app_role() = any (array['DG','RP','RH','MANAGER']))
  with check (current_app_role() = any (array['DG','RP','RH','MANAGER']));

-- Clôture de caisse journalière.
create table if not exists public."ClotureCaisse" (
  id             uuid primary key default gen_random_uuid(),
  date           date not null default current_date,
  "fondCaisse"   integer not null default 0,
  "ventesEspeces" integer not null default 0,
  "compteEspeces" integer not null default 0,
  ecart          integer not null default 0,
  "totalVentes"  integer not null default 0,
  "nbTransactions" integer not null default 0,
  "clotureParId" uuid references public."User"(id) on delete set null,
  "createdAt"    timestamptz not null default now()
);
alter table public."ClotureCaisse" enable row level security;
drop policy if exists "cloture_read"  on public."ClotureCaisse";
drop policy if exists "cloture_write" on public."ClotureCaisse";
create policy "cloture_read" on public."ClotureCaisse"
  for select using (current_app_role() = any (array['DG','RF','COMPTABLE']));
create policy "cloture_write" on public."ClotureCaisse"
  for all
  using (current_app_role() = any (array['DG','RF','COMPTABLE']))
  with check (current_app_role() = any (array['DG','RF','COMPTABLE']));
