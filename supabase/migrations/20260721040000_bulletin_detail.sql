-- ════════════════════════════════════════════════════════════════════════
-- Bulletins de paie éditables : décomposition du brut + policy UPDATE
-- ════════════════════════════════════════════════════════════════════════
-- Le bulletin ne stockait que brut/net. On ajoute la décomposition éditable
-- (salaire de base, heures sup, prime d'ancienneté, autres primes) pour
-- permettre l'édition d'un bulletin avec recalcul. On ouvre aussi l'UPDATE
-- (absent) aux mêmes rôles que l'insertion (DG/RF/RH).

alter table public."BulletinPaie"
  add column if not exists "salaireBase"     integer not null default 0,
  add column if not exists "heuresSup"       integer not null default 0,
  add column if not exists "primeAnciennete" integer not null default 0,
  add column if not exists "autresPrimes"    integer not null default 0;

-- Backfill : base = brut existant (les primes restent à 0).
update public."BulletinPaie" set "salaireBase" = "salaireBrut" where "salaireBase" = 0;

drop policy if exists "bulletin_update" on public."BulletinPaie";
create policy "bulletin_update" on public."BulletinPaie" for update to authenticated
  using ( public.current_app_role() in ('DG','RF','RH') )
  with check ( public.current_app_role() in ('DG','RF','RH') );
