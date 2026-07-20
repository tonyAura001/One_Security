-- ════════════════════════════════════════════════════════════════════════
-- S6 · Écran Paramètres réel — réglages applicatifs + gestion des membres
-- ════════════════════════════════════════════════════════════════════════
-- 1. Table `Parametre` (clé/valeur) pour les réglages opérationnels éditables
--    (format de numérotation, devise, thème par défaut…). Lecture staff,
--    écriture DG/RP. L'identité légale reste dans ONE_SECURITY (code, fixe).
-- 2. Policy UPDATE sur `User` : DG/RH peuvent activer/suspendre un membre.

create table if not exists public."Parametre" (
  cle         text primary key,
  valeur      text,
  "updatedAt" timestamptz not null default now()
);

alter table public."Parametre" enable row level security;
drop policy if exists "parametre_read"  on public."Parametre";
drop policy if exists "parametre_write" on public."Parametre";
create policy "parametre_read" on public."Parametre"
  for select using (current_app_role() is not null);
create policy "parametre_write" on public."Parametre"
  for all
  using (current_app_role() = any (array['DG','RP']))
  with check (current_app_role() = any (array['DG','RP']));

-- Valeurs par défaut (ne pas écraser si déjà présentes)
insert into public."Parametre"(cle, valeur) values
  ('format_facture', 'FAC-2026-XXX'),
  ('format_devis',   'DEV-2026-XXX'),
  ('devise',         'Franc CFA (XOF)'),
  ('theme_defaut',   'sombre'),
  ('delai_relance_jours', '30')
on conflict (cle) do nothing;

-- Gestion des membres : DG/RH peuvent mettre à jour un utilisateur (ex. actif)
drop policy if exists "users_update_admin" on public."User";
create policy "users_update_admin" on public."User"
  for update
  using (current_app_role() = any (array['DG','RH']))
  with check (current_app_role() = any (array['DG','RH']));
