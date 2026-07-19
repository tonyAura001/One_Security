-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DG', 'RP', 'RF', 'RH', 'MANAGER', 'CONTROLEUR', 'SURVEILLANT', 'JURISTE', 'COMPTABLE', 'AGENT');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('ENTREPRISE', 'CHANTIER', 'EVENEMENT', 'RESIDENTIEL', 'COMMERCE', 'AUTRE');

-- CreateEnum
CREATE TYPE "ContratType" AS ENUM ('PRESTATION', 'MISE_A_DISPOSITION', 'PONCTUEL');

-- CreateEnum
CREATE TYPE "FrequenceFacturation" AS ENUM ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE', 'PONCTUELLE');

-- CreateEnum
CREATE TYPE "MaterielType" AS ENUM ('VEHICULE', 'ARME', 'EQUIPEMENT', 'UNIFORME', 'RADIO', 'AUTRE');

-- CreateEnum
CREATE TYPE "EtatMateriel" AS ENUM ('NEUF', 'BON', 'USE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "FormeJuridique" AS ENUM ('SA', 'SARL', 'SAS', 'SASU', 'EURL', 'EI', 'ASSOCIATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "Civilite" AS ENUM ('M', 'MME', 'MLLE');

-- CreateEnum
CREATE TYPE "RoleContact" AS ENUM ('DECIDEUR', 'PRESCRIPTEUR', 'SIGNATAIRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutProspect" AS ENUM ('NOUVEAU', 'CONTACTE', 'RELANCE', 'PERDU', 'TRANSFORME');

-- CreateEnum
CREATE TYPE "OrigineProspect" AS ENUM ('APPEL_ENTRANT', 'PROSPECTION', 'RECOMMANDATION', 'SITE_WEB', 'SALON', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutDevis" AS ENUM ('BROUILLON', 'ENVOYE', 'RELANCE', 'ACCEPTE', 'REFUSE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "FactureType" AS ENUM ('ACOMPTE', 'SOLDE', 'COMPLETE', 'AVOIR');

-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('EMISE', 'ENVOYEE', 'PAYEE', 'EN_RETARD', 'LITIGE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('VIREMENT', 'CHEQUE', 'ESPECES', 'CARTE', 'PRELEVEMENT');

-- CreateEnum
CREATE TYPE "CategorieDepense" AS ENUM ('CARBURANT', 'FOURNITURES', 'ASSURANCES', 'LOYER', 'MAINTENANCE', 'EQUIPEMENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutAvance" AS ENUM ('DEMANDEE', 'VALIDEE', 'REFUSEE', 'REMBOURSEE');

-- CreateEnum
CREATE TYPE "StatutRonde" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'MANQUEE');

-- CreateEnum
CREATE TYPE "StatutCheckpoint" AS ENUM ('EN_ATTENTE', 'VALIDE', 'MANQUE');

-- CreateEnum
CREATE TYPE "TypePointage" AS ENUM ('ARRIVEE', 'DEPART');

-- CreateEnum
CREATE TYPE "TypeIncident" AS ENUM ('AGRESSION', 'MALVEILLANCE', 'INCENDIE', 'RIXE', 'INTRUSION', 'VOL', 'ACCIDENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "CriticiteIncident" AS ENUM ('FAIBLE', 'MODEREE', 'ELEVEE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatutIncident" AS ENUM ('NOUVEAU', 'EN_COURS', 'CLOTURE');

-- CreateEnum
CREATE TYPE "EntiteCommentaire" AS ENUM ('PROSPECT', 'CLIENT', 'CONTRAT', 'FACTURE', 'DEVIS', 'SITE', 'INCIDENT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "dateEmbauche" DATE NOT NULL,
    "dateDepart" DATE,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "telephone" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "formeJuridique" "FormeJuridique" NOT NULL,
    "siret" TEXT,
    "nafCode" TEXT,
    "adresseFacturation" TEXT NOT NULL,
    "adresseSiege" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "civilite" "Civilite" NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "fonction" TEXT,
    "email" TEXT,
    "telephoneFixe" TEXT,
    "telephoneMobile" TEXT,
    "roleContact" "RoleContact" NOT NULL DEFAULT 'AUTRE',
    "clientId" UUID,
    "prospectId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" "SiteType" NOT NULL,
    "superficie" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "clientId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "dateSignature" DATE NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE,
    "type" "ContratType" NOT NULL,
    "description" TEXT,
    "montantHT" DECIMAL(12,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "frequenceFacturation" "FrequenceFacturation" NOT NULL,
    "clientId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materiel" (
    "id" UUID NOT NULL,
    "type" "MaterielType" NOT NULL,
    "marque" TEXT,
    "modele" TEXT,
    "numeroSerie" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "coutAcquisition" DECIMAL(12,2),
    "dateAcquisition" DATE,
    "etat" "EtatMateriel" NOT NULL DEFAULT 'BON',
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Materiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" UUID NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "statut" "StatutProspect" NOT NULL DEFAULT 'NOUVEAU',
    "origine" "OrigineProspect" NOT NULL DEFAULT 'AUTRE',
    "notes" TEXT,
    "chiffreAffairesPotentiel" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "dateEnvoi" DATE,
    "totalHT" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTTC" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "statut" "StatutDevis" NOT NULL DEFAULT 'BROUILLON',
    "prospectId" UUID,
    "siteId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "prixUnitaireHT" DECIMAL(12,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "devisId" UUID NOT NULL,

    CONSTRAINT "DevisLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "dateEmission" DATE NOT NULL,
    "dateEcheance" DATE NOT NULL,
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTVA" DECIMAL(12,2) NOT NULL,
    "montantTTC" DECIMAL(12,2) NOT NULL,
    "type" "FactureType" NOT NULL DEFAULT 'COMPLETE',
    "statut" "StatutFacture" NOT NULL DEFAULT 'EMISE',
    "moyenPaiement" "MoyenPaiement",
    "clientId" UUID NOT NULL,
    "devisId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encaissement" (
    "id" UUID NOT NULL,
    "dateEncaissement" DATE NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "factureId" UUID NOT NULL,
    "compteBancaireId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encaissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" UUID NOT NULL,
    "dateEngagement" DATE NOT NULL,
    "datePaiement" DATE,
    "objet" TEXT NOT NULL,
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "categorie" "CategorieDepense" NOT NULL,
    "fournisseurId" UUID,
    "compteBancaireId" UUID,
    "justificatifId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" UUID NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banque" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "bic" TEXT,

    CONSTRAINT "Banque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteBancaire" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bicSwift" TEXT,
    "soldeInitial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "banqueId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompteBancaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvanceSalaire" (
    "id" UUID NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "motif" TEXT,
    "statut" "StatutAvance" NOT NULL DEFAULT 'DEMANDEE',
    "agentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvanceSalaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinPaie" (
    "id" UUID NOT NULL,
    "periode" TEXT NOT NULL,
    "salaireBrut" DECIMAL(12,2) NOT NULL,
    "salaireNet" DECIMAL(12,2) NOT NULL,
    "cotisationsSociales" DECIMAL(12,2) NOT NULL,
    "heuresTravaillees" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "agentId" UUID NOT NULL,
    "fichierId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinPaie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canal" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Canal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "canalId" UUID NOT NULL,
    "auteurId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commentaire" (
    "id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "datePublication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entite" "EntiteCommentaire" NOT NULL,
    "idEntite" UUID NOT NULL,
    "auteurId" UUID NOT NULL,
    "parentId" UUID,

    CONSTRAINT "Commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pointage" (
    "id" UUID NOT NULL,
    "type" "TypePointage" NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "agentId" UUID NOT NULL,
    "siteId" UUID,

    CONSTRAINT "Pointage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RondeAgent" (
    "id" UUID NOT NULL,
    "statut" "StatutRonde" NOT NULL DEFAULT 'PLANIFIEE',
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "commentaires" TEXT,
    "agentId" UUID NOT NULL,
    "siteId" UUID,
    "pointageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RondeAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "statut" "StatutCheckpoint" NOT NULL DEFAULT 'EN_ATTENTE',
    "heurePassage" TIMESTAMP(3),
    "rondeId" UUID NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentSecurite" (
    "id" UUID NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TypeIncident" NOT NULL,
    "description" TEXT NOT NULL,
    "criticite" "CriticiteIncident" NOT NULL DEFAULT 'MODEREE',
    "statut" "StatutIncident" NOT NULL DEFAULT 'NOUVEAU',
    "intervenantsExternes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dommagesMateriels" TEXT,
    "dommagesCorporels" TEXT,
    "mesuresPrises" TEXT,
    "siteId" UUID,
    "rondeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentSecurite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fichier" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "chemin" TEXT NOT NULL,
    "mimeType" TEXT,
    "taille" INTEGER,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentId" UUID,

    CONSTRAINT "Fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContratAgents" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ContratAgents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContratMateriels" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ContratMateriels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CanalMembres" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CanalMembres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_IncidentIntervenants" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_IncidentIntervenants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_actif_idx" ON "User"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "Client_siret_key" ON "Client"("siret");

-- CreateIndex
CREATE INDEX "Client_raisonSociale_idx" ON "Client"("raisonSociale");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Contact_prospectId_idx" ON "Contact"("prospectId");

-- CreateIndex
CREATE INDEX "Site_clientId_idx" ON "Site"("clientId");

-- CreateIndex
CREATE INDEX "Site_type_idx" ON "Site"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_numero_key" ON "Contrat"("numero");

-- CreateIndex
CREATE INDEX "Contrat_clientId_idx" ON "Contrat"("clientId");

-- CreateIndex
CREATE INDEX "Contrat_siteId_idx" ON "Contrat"("siteId");

-- CreateIndex
CREATE INDEX "Contrat_dateDebut_dateFin_idx" ON "Contrat"("dateDebut", "dateFin");

-- CreateIndex
CREATE UNIQUE INDEX "Materiel_numeroSerie_key" ON "Materiel"("numeroSerie");

-- CreateIndex
CREATE INDEX "Materiel_type_idx" ON "Materiel"("type");

-- CreateIndex
CREATE INDEX "Materiel_disponible_idx" ON "Materiel"("disponible");

-- CreateIndex
CREATE INDEX "Prospect_statut_idx" ON "Prospect"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE INDEX "Devis_prospectId_idx" ON "Devis"("prospectId");

-- CreateIndex
CREATE INDEX "Devis_statut_idx" ON "Devis"("statut");

-- CreateIndex
CREATE INDEX "DevisLigne_devisId_idx" ON "DevisLigne"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE INDEX "Facture_clientId_idx" ON "Facture"("clientId");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "Facture_dateEcheance_idx" ON "Facture"("dateEcheance");

-- CreateIndex
CREATE INDEX "Encaissement_factureId_idx" ON "Encaissement"("factureId");

-- CreateIndex
CREATE INDEX "Encaissement_compteBancaireId_idx" ON "Encaissement"("compteBancaireId");

-- CreateIndex
CREATE UNIQUE INDEX "Depense_justificatifId_key" ON "Depense"("justificatifId");

-- CreateIndex
CREATE INDEX "Depense_categorie_idx" ON "Depense"("categorie");

-- CreateIndex
CREATE INDEX "Depense_fournisseurId_idx" ON "Depense"("fournisseurId");

-- CreateIndex
CREATE UNIQUE INDEX "CompteBancaire_iban_key" ON "CompteBancaire"("iban");

-- CreateIndex
CREATE INDEX "AvanceSalaire_agentId_idx" ON "AvanceSalaire"("agentId");

-- CreateIndex
CREATE INDEX "AvanceSalaire_statut_idx" ON "AvanceSalaire"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinPaie_fichierId_key" ON "BulletinPaie"("fichierId");

-- CreateIndex
CREATE INDEX "BulletinPaie_periode_idx" ON "BulletinPaie"("periode");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinPaie_agentId_periode_key" ON "BulletinPaie"("agentId", "periode");

-- CreateIndex
CREATE INDEX "Message_canalId_idx" ON "Message"("canalId");

-- CreateIndex
CREATE INDEX "Commentaire_entite_idEntite_idx" ON "Commentaire"("entite", "idEntite");

-- CreateIndex
CREATE INDEX "Commentaire_auteurId_idx" ON "Commentaire"("auteurId");

-- CreateIndex
CREATE INDEX "Pointage_agentId_dateHeure_idx" ON "Pointage"("agentId", "dateHeure");

-- CreateIndex
CREATE UNIQUE INDEX "RondeAgent_pointageId_key" ON "RondeAgent"("pointageId");

-- CreateIndex
CREATE INDEX "RondeAgent_agentId_idx" ON "RondeAgent"("agentId");

-- CreateIndex
CREATE INDEX "RondeAgent_statut_idx" ON "RondeAgent"("statut");

-- CreateIndex
CREATE INDEX "Checkpoint_rondeId_idx" ON "Checkpoint"("rondeId");

-- CreateIndex
CREATE INDEX "IncidentSecurite_type_idx" ON "IncidentSecurite"("type");

-- CreateIndex
CREATE INDEX "IncidentSecurite_criticite_idx" ON "IncidentSecurite"("criticite");

-- CreateIndex
CREATE INDEX "IncidentSecurite_statut_idx" ON "IncidentSecurite"("statut");

-- CreateIndex
CREATE INDEX "IncidentSecurite_siteId_idx" ON "IncidentSecurite"("siteId");

-- CreateIndex
CREATE INDEX "IncidentSecurite_dateHeure_idx" ON "IncidentSecurite"("dateHeure");

-- CreateIndex
CREATE INDEX "Fichier_incidentId_idx" ON "Fichier"("incidentId");

-- CreateIndex
CREATE INDEX "_ContratAgents_B_index" ON "_ContratAgents"("B");

-- CreateIndex
CREATE INDEX "_ContratMateriels_B_index" ON "_ContratMateriels"("B");

-- CreateIndex
CREATE INDEX "_CanalMembres_B_index" ON "_CanalMembres"("B");

-- CreateIndex
CREATE INDEX "_IncidentIntervenants_B_index" ON "_IncidentIntervenants"("B");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLigne" ADD CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "CompteBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "CompteBancaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_justificatifId_fkey" FOREIGN KEY ("justificatifId") REFERENCES "Fichier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteBancaire" ADD CONSTRAINT "CompteBancaire_banqueId_fkey" FOREIGN KEY ("banqueId") REFERENCES "Banque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvanceSalaire" ADD CONSTRAINT "AvanceSalaire_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_fichierId_fkey" FOREIGN KEY ("fichierId") REFERENCES "Fichier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "Canal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commentaire" ADD CONSTRAINT "Commentaire_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commentaire" ADD CONSTRAINT "Commentaire_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Commentaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RondeAgent" ADD CONSTRAINT "RondeAgent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RondeAgent" ADD CONSTRAINT "RondeAgent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RondeAgent" ADD CONSTRAINT "RondeAgent_pointageId_fkey" FOREIGN KEY ("pointageId") REFERENCES "Pointage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_rondeId_fkey" FOREIGN KEY ("rondeId") REFERENCES "RondeAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentSecurite" ADD CONSTRAINT "IncidentSecurite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentSecurite" ADD CONSTRAINT "IncidentSecurite_rondeId_fkey" FOREIGN KEY ("rondeId") REFERENCES "RondeAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentSecurite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContratAgents" ADD CONSTRAINT "_ContratAgents_A_fkey" FOREIGN KEY ("A") REFERENCES "Contrat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContratAgents" ADD CONSTRAINT "_ContratAgents_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContratMateriels" ADD CONSTRAINT "_ContratMateriels_A_fkey" FOREIGN KEY ("A") REFERENCES "Contrat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContratMateriels" ADD CONSTRAINT "_ContratMateriels_B_fkey" FOREIGN KEY ("B") REFERENCES "Materiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CanalMembres" ADD CONSTRAINT "_CanalMembres_A_fkey" FOREIGN KEY ("A") REFERENCES "Canal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CanalMembres" ADD CONSTRAINT "_CanalMembres_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidentIntervenants" ADD CONSTRAINT "_IncidentIntervenants_A_fkey" FOREIGN KEY ("A") REFERENCES "IncidentSecurite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidentIntervenants" ADD CONSTRAINT "_IncidentIntervenants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
