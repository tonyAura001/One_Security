-- ════════════════════════════════════════════════════════════════════════
-- Tâches : statut multi-étapes (kanban) au lieu du simple booléen `terminee`
-- ════════════════════════════════════════════════════════════════════════
-- Colonnes : à faire → en cours → en révision → terminé. On garde `terminee`
-- synchronisé (termine ⇔ terminee=true) pour ne casser aucun consommateur.
-- La policy tache_write existante (assigné/créateur/DG/MANAGER/RP/RH) couvre
-- déjà la mise à jour du statut par glisser-déposer.

alter table public."Tache"
  add column if not exists statut text not null default 'a_faire'
  check (statut in ('a_faire', 'en_cours', 'en_revision', 'termine'));

-- Backfill : les tâches déjà terminées passent en 'termine'.
update public."Tache" set statut = 'termine' where terminee = true and statut = 'a_faire';

create index if not exists idx_tache_statut on public."Tache"(statut);
