-- Migration #19 — Photo de fiche agent (chemin de l'objet Storage).
alter table public."AgentSecurite" add column if not exists "photoPath" text;
