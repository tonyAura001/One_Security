-- ════════════════════════════════════════════════════════════════════════
-- Devis pour un CLIENT existant (pas seulement un prospect)
-- ════════════════════════════════════════════════════════════════════════
-- Un devis pouvait uniquement viser un Prospect (prospectId). On ajoute un
-- lien optionnel vers un Client existant (renouvellement, upsell, avenant),
-- pour que la fiche client 360° retrouve ses devis par lien direct.
-- Les policies d'écriture/lecture existantes (devis_insert / devis_read_commerce)
-- couvrent la table ; un simple ajout de colonne ne les change pas.

alter table public."Devis"
  add column if not exists "clientId" uuid references public."Client"(id) on delete set null;

create index if not exists "Devis_clientId_idx" on public."Devis"("clientId");
