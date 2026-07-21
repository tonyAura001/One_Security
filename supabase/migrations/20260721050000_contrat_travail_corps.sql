-- Contrat de travail : corps éditable (texte légal WYSIWYG) + date de fin (CDD).
alter table public."ContratTravail"
  add column if not exists corps text,
  add column if not exists "dateFin" date;
