// Types générés par introspection de la base Supabase (public).
// Régénérer avec supabase gen types dès que Docker/CLI dispo.
// eslint-disable

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      "AgentSecurite": {
        Row: {
          "id": string;
          "prenom": string;
          "nom": string | null;
          "dateNaissance": string | null;
          "lieuNaissance": string | null;
          "numeroCni": string | null;
          "matricule": string | null;
          "telephone": string | null;
          "telephone2": string | null;
          "adresse": string | null;
          "dateDebut": string | null;
          "dateDebutRaw": string | null;
          "salaire": number | null;
          "poste": string | null;
          "statut": string;
          "createdAt": string;
          "updatedAt": string;
          "photoPath": string | null;
        };
        Insert: {
          "id"?: string;
          "prenom": string;
          "nom"?: string | null;
          "dateNaissance"?: string | null;
          "lieuNaissance"?: string | null;
          "numeroCni"?: string | null;
          "matricule"?: string | null;
          "telephone"?: string | null;
          "telephone2"?: string | null;
          "adresse"?: string | null;
          "dateDebut"?: string | null;
          "dateDebutRaw"?: string | null;
          "salaire"?: number | null;
          "poste"?: string | null;
          "statut"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
          "photoPath"?: string | null;
        };
        Update: {
          "id"?: string;
          "prenom"?: string;
          "nom"?: string | null;
          "dateNaissance"?: string | null;
          "lieuNaissance"?: string | null;
          "numeroCni"?: string | null;
          "matricule"?: string | null;
          "telephone"?: string | null;
          "telephone2"?: string | null;
          "adresse"?: string | null;
          "dateDebut"?: string | null;
          "dateDebutRaw"?: string | null;
          "salaire"?: number | null;
          "poste"?: string | null;
          "statut"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
          "photoPath"?: string | null;
        };
        Relationships: [];
      };
      "AvanceSalaire": {
        Row: {
          "id": string;
          "montant": number;
          "date": string;
          "motif": string | null;
          "statut": Database["public"]["Enums"]["StatutAvance"];
          "agentId": string;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "montant": number;
          "date": string;
          "motif"?: string | null;
          "statut"?: Database["public"]["Enums"]["StatutAvance"];
          "agentId": string;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "montant"?: number;
          "date"?: string;
          "motif"?: string | null;
          "statut"?: Database["public"]["Enums"]["StatutAvance"];
          "agentId"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Banque": {
        Row: {
          "id": string;
          "nom": string;
          "bic": string | null;
        };
        Insert: {
          "id": string;
          "nom": string;
          "bic"?: string | null;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "bic"?: string | null;
        };
        Relationships: [];
      };
      "BulletinPaie": {
        Row: {
          "id": string;
          "periode": string;
          "salaireBrut": number;
          "salaireNet": number;
          "cotisationsSociales": number;
          "heuresTravaillees": number;
          "agentId": string;
          "fichierId": string | null;
          "createdAt": string;
        };
        Insert: {
          "id"?: string;
          "periode": string;
          "salaireBrut": number;
          "salaireNet": number;
          "cotisationsSociales": number;
          "heuresTravaillees"?: number;
          "agentId": string;
          "fichierId"?: string | null;
          "createdAt"?: string;
        };
        Update: {
          "id"?: string;
          "periode"?: string;
          "salaireBrut"?: number;
          "salaireNet"?: number;
          "cotisationsSociales"?: number;
          "heuresTravaillees"?: number;
          "agentId"?: string;
          "fichierId"?: string | null;
          "createdAt"?: string;
        };
        Relationships: [];
      };
      "Canal": {
        Row: {
          "id": string;
          "nom": string;
          "description": string | null;
          "prive": boolean;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "nom": string;
          "description"?: string | null;
          "prive"?: boolean;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "description"?: string | null;
          "prive"?: boolean;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Candidat": {
        Row: {
          "id": string;
          "nom": string;
          "prenom": string;
          "email": string | null;
          "telephone": string | null;
          "adresse": string | null;
          "dateNaissance": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "nom": string;
          "prenom": string;
          "email"?: string | null;
          "telephone"?: string | null;
          "adresse"?: string | null;
          "dateNaissance"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "prenom"?: string;
          "email"?: string | null;
          "telephone"?: string | null;
          "adresse"?: string | null;
          "dateNaissance"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Candidature": {
        Row: {
          "id": string;
          "posteId": string;
          "candidatId": string;
          "statut": string;
          "datePostulation": string;
          "messageMotivation": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "posteId": string;
          "candidatId": string;
          "statut"?: string;
          "datePostulation"?: string;
          "messageMotivation"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "posteId"?: string;
          "candidatId"?: string;
          "statut"?: string;
          "datePostulation"?: string;
          "messageMotivation"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Checkpoint": {
        Row: {
          "id": string;
          "nom": string;
          "ordre": number;
          "latitude": number | null;
          "longitude": number | null;
          "statut": Database["public"]["Enums"]["StatutCheckpoint"];
          "heurePassage": string | null;
          "rondeId": string;
        };
        Insert: {
          "id": string;
          "nom": string;
          "ordre": number;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "statut"?: Database["public"]["Enums"]["StatutCheckpoint"];
          "heurePassage"?: string | null;
          "rondeId": string;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "ordre"?: number;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "statut"?: Database["public"]["Enums"]["StatutCheckpoint"];
          "heurePassage"?: string | null;
          "rondeId"?: string;
        };
        Relationships: [];
      };
      "Client": {
        Row: {
          "id": string;
          "raisonSociale": string;
          "formeJuridique": Database["public"]["Enums"]["FormeJuridique"];
          "siret": string | null;
          "nafCode": string | null;
          "adresseFacturation": string;
          "adresseSiege": string | null;
          "createdAt": string;
          "updatedAt": string;
          "secteur": string | null;
          "statut": string;
          "scoreSante": number;
        };
        Insert: {
          "id"?: string;
          "raisonSociale": string;
          "formeJuridique": Database["public"]["Enums"]["FormeJuridique"];
          "siret"?: string | null;
          "nafCode"?: string | null;
          "adresseFacturation": string;
          "adresseSiege"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "secteur"?: string | null;
          "statut"?: string;
          "scoreSante"?: number;
        };
        Update: {
          "id"?: string;
          "raisonSociale"?: string;
          "formeJuridique"?: Database["public"]["Enums"]["FormeJuridique"];
          "siret"?: string | null;
          "nafCode"?: string | null;
          "adresseFacturation"?: string;
          "adresseSiege"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "secteur"?: string | null;
          "statut"?: string;
          "scoreSante"?: number;
        };
        Relationships: [];
      };
      "Commentaire": {
        Row: {
          "id": string;
          "contenu": string;
          "datePublication": string;
          "entite": Database["public"]["Enums"]["EntiteCommentaire"];
          "idEntite": string;
          "auteurId": string;
          "parentId": string | null;
        };
        Insert: {
          "id": string;
          "contenu": string;
          "datePublication"?: string;
          "entite": Database["public"]["Enums"]["EntiteCommentaire"];
          "idEntite": string;
          "auteurId": string;
          "parentId"?: string | null;
        };
        Update: {
          "id"?: string;
          "contenu"?: string;
          "datePublication"?: string;
          "entite"?: Database["public"]["Enums"]["EntiteCommentaire"];
          "idEntite"?: string;
          "auteurId"?: string;
          "parentId"?: string | null;
        };
        Relationships: [];
      };
      "CompteBancaire": {
        Row: {
          "id": string;
          "nom": string;
          "iban": string;
          "bicSwift": string | null;
          "soldeInitial": number;
          "banqueId": string | null;
          "createdAt": string;
          "updatedAt": string;
          "type": string;
        };
        Insert: {
          "id": string;
          "nom": string;
          "iban": string;
          "bicSwift"?: string | null;
          "soldeInitial"?: number;
          "banqueId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
          "type"?: string;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "iban"?: string;
          "bicSwift"?: string | null;
          "soldeInitial"?: number;
          "banqueId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "type"?: string;
        };
        Relationships: [];
      };
      "Contact": {
        Row: {
          "id": string;
          "civilite": Database["public"]["Enums"]["Civilite"];
          "nom": string;
          "prenom": string;
          "fonction": string | null;
          "email": string | null;
          "telephoneFixe": string | null;
          "telephoneMobile": string | null;
          "roleContact": Database["public"]["Enums"]["RoleContact"];
          "clientId": string | null;
          "prospectId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "civilite": Database["public"]["Enums"]["Civilite"];
          "nom": string;
          "prenom": string;
          "fonction"?: string | null;
          "email"?: string | null;
          "telephoneFixe"?: string | null;
          "telephoneMobile"?: string | null;
          "roleContact"?: Database["public"]["Enums"]["RoleContact"];
          "clientId"?: string | null;
          "prospectId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "civilite"?: Database["public"]["Enums"]["Civilite"];
          "nom"?: string;
          "prenom"?: string;
          "fonction"?: string | null;
          "email"?: string | null;
          "telephoneFixe"?: string | null;
          "telephoneMobile"?: string | null;
          "roleContact"?: Database["public"]["Enums"]["RoleContact"];
          "clientId"?: string | null;
          "prospectId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Contrat": {
        Row: {
          "id": string;
          "numero": string;
          "dateSignature": string;
          "dateDebut": string;
          "dateFin": string | null;
          "type": Database["public"]["Enums"]["ContratType"];
          "description": string | null;
          "montantHT": number;
          "tauxTVA": number;
          "frequenceFacturation": Database["public"]["Enums"]["FrequenceFacturation"];
          "clientId": string;
          "siteId": string;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "numero": string;
          "dateSignature": string;
          "dateDebut": string;
          "dateFin"?: string | null;
          "type": Database["public"]["Enums"]["ContratType"];
          "description"?: string | null;
          "montantHT": number;
          "tauxTVA"?: number;
          "frequenceFacturation": Database["public"]["Enums"]["FrequenceFacturation"];
          "clientId": string;
          "siteId": string;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "numero"?: string;
          "dateSignature"?: string;
          "dateDebut"?: string;
          "dateFin"?: string | null;
          "type"?: Database["public"]["Enums"]["ContratType"];
          "description"?: string | null;
          "montantHT"?: number;
          "tauxTVA"?: number;
          "frequenceFacturation"?: Database["public"]["Enums"]["FrequenceFacturation"];
          "clientId"?: string;
          "siteId"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Depense": {
        Row: {
          "id": string;
          "dateEngagement": string;
          "datePaiement": string | null;
          "objet": string;
          "montantHT": number;
          "montantTVA": number;
          "categorie": Database["public"]["Enums"]["CategorieDepense"];
          "fournisseurId": string | null;
          "compteBancaireId": string | null;
          "justificatifId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "dateEngagement": string;
          "datePaiement"?: string | null;
          "objet": string;
          "montantHT": number;
          "montantTVA"?: number;
          "categorie": Database["public"]["Enums"]["CategorieDepense"];
          "fournisseurId"?: string | null;
          "compteBancaireId"?: string | null;
          "justificatifId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "dateEngagement"?: string;
          "datePaiement"?: string | null;
          "objet"?: string;
          "montantHT"?: number;
          "montantTVA"?: number;
          "categorie"?: Database["public"]["Enums"]["CategorieDepense"];
          "fournisseurId"?: string | null;
          "compteBancaireId"?: string | null;
          "justificatifId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Devis": {
        Row: {
          "id": string;
          "numero": string;
          "dateEnvoi": string | null;
          "totalHT": number;
          "totalTTC": number;
          "statut": Database["public"]["Enums"]["StatutDevis"];
          "prospectId": string | null;
          "siteId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "numero": string;
          "dateEnvoi"?: string | null;
          "totalHT"?: number;
          "totalTTC"?: number;
          "statut"?: Database["public"]["Enums"]["StatutDevis"];
          "prospectId"?: string | null;
          "siteId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "numero"?: string;
          "dateEnvoi"?: string | null;
          "totalHT"?: number;
          "totalTTC"?: number;
          "statut"?: Database["public"]["Enums"]["StatutDevis"];
          "prospectId"?: string | null;
          "siteId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "DevisLigne": {
        Row: {
          "id": string;
          "description": string;
          "quantite": number;
          "prixUnitaireHT": number;
          "tauxTVA": number;
          "devisId": string;
        };
        Insert: {
          "id": string;
          "description": string;
          "quantite"?: number;
          "prixUnitaireHT": number;
          "tauxTVA"?: number;
          "devisId": string;
        };
        Update: {
          "id"?: string;
          "description"?: string;
          "quantite"?: number;
          "prixUnitaireHT"?: number;
          "tauxTVA"?: number;
          "devisId"?: string;
        };
        Relationships: [];
      };
      "Encaissement": {
        Row: {
          "id": string;
          "dateEncaissement": string;
          "montant": number;
          "reference": string | null;
          "factureId": string;
          "compteBancaireId": string;
          "createdAt": string;
        };
        Insert: {
          "id": string;
          "dateEncaissement": string;
          "montant": number;
          "reference"?: string | null;
          "factureId": string;
          "compteBancaireId": string;
          "createdAt"?: string;
        };
        Update: {
          "id"?: string;
          "dateEncaissement"?: string;
          "montant"?: number;
          "reference"?: string | null;
          "factureId"?: string;
          "compteBancaireId"?: string;
          "createdAt"?: string;
        };
        Relationships: [];
      };
      "Entretien": {
        Row: {
          "id": string;
          "candidatureId": string;
          "recruteurId": string;
          "dateHeure": string;
          "type": string;
          "statut": string;
          "compteRendu": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "candidatureId": string;
          "recruteurId": string;
          "dateHeure": string;
          "type"?: string;
          "statut"?: string;
          "compteRendu"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "candidatureId"?: string;
          "recruteurId"?: string;
          "dateHeure"?: string;
          "type"?: string;
          "statut"?: string;
          "compteRendu"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Facture": {
        Row: {
          "id": string;
          "numero": string;
          "dateEmission": string;
          "dateEcheance": string;
          "montantHT": number;
          "montantTVA": number;
          "montantTTC": number;
          "type": Database["public"]["Enums"]["FactureType"];
          "statut": Database["public"]["Enums"]["StatutFacture"];
          "moyenPaiement": Database["public"]["Enums"]["MoyenPaiement"] | null;
          "clientId": string;
          "devisId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "numero": string;
          "dateEmission": string;
          "dateEcheance": string;
          "montantHT": number;
          "montantTVA": number;
          "montantTTC": number;
          "type"?: Database["public"]["Enums"]["FactureType"];
          "statut"?: Database["public"]["Enums"]["StatutFacture"];
          "moyenPaiement"?: Database["public"]["Enums"]["MoyenPaiement"] | null;
          "clientId": string;
          "devisId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "numero"?: string;
          "dateEmission"?: string;
          "dateEcheance"?: string;
          "montantHT"?: number;
          "montantTVA"?: number;
          "montantTTC"?: number;
          "type"?: Database["public"]["Enums"]["FactureType"];
          "statut"?: Database["public"]["Enums"]["StatutFacture"];
          "moyenPaiement"?: Database["public"]["Enums"]["MoyenPaiement"] | null;
          "clientId"?: string;
          "devisId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Fichier": {
        Row: {
          "id": string;
          "nom": string;
          "bucket": string;
          "chemin": string;
          "mimeType": string | null;
          "taille": number | null;
          "uploadedById": string | null;
          "createdAt": string;
          "incidentId": string | null;
          "candidatureId": string | null;
        };
        Insert: {
          "id"?: string;
          "nom": string;
          "bucket": string;
          "chemin": string;
          "mimeType"?: string | null;
          "taille"?: number | null;
          "uploadedById"?: string | null;
          "createdAt"?: string;
          "incidentId"?: string | null;
          "candidatureId"?: string | null;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "bucket"?: string;
          "chemin"?: string;
          "mimeType"?: string | null;
          "taille"?: number | null;
          "uploadedById"?: string | null;
          "createdAt"?: string;
          "incidentId"?: string | null;
          "candidatureId"?: string | null;
        };
        Relationships: [];
      };
      "Fournisseur": {
        Row: {
          "id": string;
          "raisonSociale": string;
          "siret": string | null;
          "email": string | null;
          "telephone": string | null;
          "adresse": string | null;
          "createdAt": string;
          "updatedAt": string;
          "categorie": string | null;
          "statut": string;
          "contact": string | null;
          "delaiMoyenJours": number;
        };
        Insert: {
          "id": string;
          "raisonSociale": string;
          "siret"?: string | null;
          "email"?: string | null;
          "telephone"?: string | null;
          "adresse"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
          "categorie"?: string | null;
          "statut"?: string;
          "contact"?: string | null;
          "delaiMoyenJours"?: number;
        };
        Update: {
          "id"?: string;
          "raisonSociale"?: string;
          "siret"?: string | null;
          "email"?: string | null;
          "telephone"?: string | null;
          "adresse"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "categorie"?: string | null;
          "statut"?: string;
          "contact"?: string | null;
          "delaiMoyenJours"?: number;
        };
        Relationships: [];
      };
      "IncidentSecurite": {
        Row: {
          "id": string;
          "dateHeure": string;
          "type": Database["public"]["Enums"]["TypeIncident"];
          "description": string;
          "criticite": Database["public"]["Enums"]["CriticiteIncident"];
          "statut": Database["public"]["Enums"]["StatutIncident"];
          "intervenantsExternes": string[] | null;
          "dommagesMateriels": string | null;
          "dommagesCorporels": string | null;
          "mesuresPrises": string | null;
          "siteId": string | null;
          "rondeId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "dateHeure"?: string;
          "type": Database["public"]["Enums"]["TypeIncident"];
          "description": string;
          "criticite"?: Database["public"]["Enums"]["CriticiteIncident"];
          "statut"?: Database["public"]["Enums"]["StatutIncident"];
          "intervenantsExternes"?: string[] | null;
          "dommagesMateriels"?: string | null;
          "dommagesCorporels"?: string | null;
          "mesuresPrises"?: string | null;
          "siteId"?: string | null;
          "rondeId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "dateHeure"?: string;
          "type"?: Database["public"]["Enums"]["TypeIncident"];
          "description"?: string;
          "criticite"?: Database["public"]["Enums"]["CriticiteIncident"];
          "statut"?: Database["public"]["Enums"]["StatutIncident"];
          "intervenantsExternes"?: string[] | null;
          "dommagesMateriels"?: string | null;
          "dommagesCorporels"?: string | null;
          "mesuresPrises"?: string | null;
          "siteId"?: string | null;
          "rondeId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Intervention": {
        Row: {
          "id": string;
          "ref": string;
          "siteId": string | null;
          "technicienId": string | null;
          "dateHeure": string;
          "resume": string | null;
          "statut": string;
          "dureeMin": number | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "ref": string;
          "siteId"?: string | null;
          "technicienId"?: string | null;
          "dateHeure"?: string;
          "resume"?: string | null;
          "statut"?: string;
          "dureeMin"?: number | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "ref"?: string;
          "siteId"?: string | null;
          "technicienId"?: string | null;
          "dateHeure"?: string;
          "resume"?: string | null;
          "statut"?: string;
          "dureeMin"?: number | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Materiel": {
        Row: {
          "id": string;
          "type": Database["public"]["Enums"]["MaterielType"];
          "marque": string | null;
          "modele": string | null;
          "numeroSerie": string | null;
          "quantite": number;
          "coutAcquisition": number | null;
          "dateAcquisition": string | null;
          "etat": Database["public"]["Enums"]["EtatMateriel"];
          "disponible": boolean;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "type": Database["public"]["Enums"]["MaterielType"];
          "marque"?: string | null;
          "modele"?: string | null;
          "numeroSerie"?: string | null;
          "quantite"?: number;
          "coutAcquisition"?: number | null;
          "dateAcquisition"?: string | null;
          "etat"?: Database["public"]["Enums"]["EtatMateriel"];
          "disponible"?: boolean;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "type"?: Database["public"]["Enums"]["MaterielType"];
          "marque"?: string | null;
          "modele"?: string | null;
          "numeroSerie"?: string | null;
          "quantite"?: number;
          "coutAcquisition"?: number | null;
          "dateAcquisition"?: string | null;
          "etat"?: Database["public"]["Enums"]["EtatMateriel"];
          "disponible"?: boolean;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Message": {
        Row: {
          "id": string;
          "contenu": string;
          "canalId": string;
          "auteurId": string;
          "createdAt": string;
        };
        Insert: {
          "id": string;
          "contenu": string;
          "canalId": string;
          "auteurId": string;
          "createdAt"?: string;
        };
        Update: {
          "id"?: string;
          "contenu"?: string;
          "canalId"?: string;
          "auteurId"?: string;
          "createdAt"?: string;
        };
        Relationships: [];
      };
      "Permission": {
        Row: {
          "id": string;
          "nom": string;
          "description": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "nom": string;
          "description"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "description"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Pointage": {
        Row: {
          "id": string;
          "type": Database["public"]["Enums"]["TypePointage"];
          "dateHeure": string;
          "latitude": number | null;
          "longitude": number | null;
          "agentId": string;
          "siteId": string | null;
        };
        Insert: {
          "id": string;
          "type": Database["public"]["Enums"]["TypePointage"];
          "dateHeure"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "agentId": string;
          "siteId"?: string | null;
        };
        Update: {
          "id"?: string;
          "type"?: Database["public"]["Enums"]["TypePointage"];
          "dateHeure"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "agentId"?: string;
          "siteId"?: string | null;
        };
        Relationships: [];
      };
      "Poste": {
        Row: {
          "id": string;
          "titre": string;
          "description": string | null;
          "salaireMin": number | null;
          "salaireMax": number | null;
          "lieu": string | null;
          "typeContrat": string;
          "statut": string;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "titre": string;
          "description"?: string | null;
          "salaireMin"?: number | null;
          "salaireMax"?: number | null;
          "lieu"?: string | null;
          "typeContrat"?: string;
          "statut"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "titre"?: string;
          "description"?: string | null;
          "salaireMin"?: number | null;
          "salaireMax"?: number | null;
          "lieu"?: string | null;
          "typeContrat"?: string;
          "statut"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Prospect": {
        Row: {
          "id": string;
          "raisonSociale": string;
          "siret": string | null;
          "adresse": string | null;
          "statut": Database["public"]["Enums"]["StatutProspect"];
          "origine": Database["public"]["Enums"]["OrigineProspect"];
          "notes": string | null;
          "chiffreAffairesPotentiel": number | null;
          "createdAt": string;
          "updatedAt": string;
          "stage": string;
          "besoin": string | null;
          "owner": string | null;
          "ownerInitials": string | null;
        };
        Insert: {
          "id"?: string;
          "raisonSociale": string;
          "siret"?: string | null;
          "adresse"?: string | null;
          "statut"?: Database["public"]["Enums"]["StatutProspect"];
          "origine"?: Database["public"]["Enums"]["OrigineProspect"];
          "notes"?: string | null;
          "chiffreAffairesPotentiel"?: number | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "stage"?: string;
          "besoin"?: string | null;
          "owner"?: string | null;
          "ownerInitials"?: string | null;
        };
        Update: {
          "id"?: string;
          "raisonSociale"?: string;
          "siret"?: string | null;
          "adresse"?: string | null;
          "statut"?: Database["public"]["Enums"]["StatutProspect"];
          "origine"?: Database["public"]["Enums"]["OrigineProspect"];
          "notes"?: string | null;
          "chiffreAffairesPotentiel"?: number | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "stage"?: string;
          "besoin"?: string | null;
          "owner"?: string | null;
          "ownerInitials"?: string | null;
        };
        Relationships: [];
      };
      "Role": {
        Row: {
          "id": string;
          "nom": Database["public"]["Enums"]["RoleName"];
          "description": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "nom": Database["public"]["Enums"]["RoleName"];
          "description"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "nom"?: Database["public"]["Enums"]["RoleName"];
          "description"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "RolePermission": {
        Row: {
          "id": string;
          "roleId": string;
          "permissionId": string;
        };
        Insert: {
          "id": string;
          "roleId": string;
          "permissionId": string;
        };
        Update: {
          "id"?: string;
          "roleId"?: string;
          "permissionId"?: string;
        };
        Relationships: [];
      };
      "RondeAgent": {
        Row: {
          "id": string;
          "statut": Database["public"]["Enums"]["StatutRonde"];
          "debut": string | null;
          "fin": string | null;
          "commentaires": string | null;
          "agentId": string;
          "siteId": string | null;
          "pointageId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "statut"?: Database["public"]["Enums"]["StatutRonde"];
          "debut"?: string | null;
          "fin"?: string | null;
          "commentaires"?: string | null;
          "agentId": string;
          "siteId"?: string | null;
          "pointageId"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "statut"?: Database["public"]["Enums"]["StatutRonde"];
          "debut"?: string | null;
          "fin"?: string | null;
          "commentaires"?: string | null;
          "agentId"?: string;
          "siteId"?: string | null;
          "pointageId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Site": {
        Row: {
          "id": string;
          "nom": string;
          "adresse": string;
          "latitude": number | null;
          "longitude": number | null;
          "type": Database["public"]["Enums"]["SiteType"];
          "superficie": number | null;
          "photoUrl": string | null;
          "clientId": string;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id": string;
          "nom": string;
          "adresse": string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "type": Database["public"]["Enums"]["SiteType"];
          "superficie"?: number | null;
          "photoUrl"?: string | null;
          "clientId": string;
          "createdAt"?: string;
          "updatedAt": string;
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "adresse"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "type"?: Database["public"]["Enums"]["SiteType"];
          "superficie"?: number | null;
          "photoUrl"?: string | null;
          "clientId"?: string;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Tache": {
        Row: {
          "id": string;
          "titre": string;
          "description": string | null;
          "priorite": string;
          "echeance": string | null;
          "terminee": boolean;
          "assigneAId": string | null;
          "creeParId": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "titre": string;
          "description"?: string | null;
          "priorite"?: string;
          "echeance"?: string | null;
          "terminee"?: boolean;
          "assigneAId"?: string | null;
          "creeParId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "titre"?: string;
          "description"?: string | null;
          "priorite"?: string;
          "echeance"?: string | null;
          "terminee"?: boolean;
          "assigneAId"?: string | null;
          "creeParId"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "Ticket": {
        Row: {
          "id": string;
          "ref": string;
          "titre": string;
          "siteId": string | null;
          "criticite": string;
          "stage": string;
          "dateOuverture": string;
          "equipement": string | null;
          "createdAt": string;
          "updatedAt": string;
        };
        Insert: {
          "id"?: string;
          "ref": string;
          "titre": string;
          "siteId"?: string | null;
          "criticite"?: string;
          "stage"?: string;
          "dateOuverture"?: string;
          "equipement"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Update: {
          "id"?: string;
          "ref"?: string;
          "titre"?: string;
          "siteId"?: string | null;
          "criticite"?: string;
          "stage"?: string;
          "dateOuverture"?: string;
          "equipement"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
        };
        Relationships: [];
      };
      "User": {
        Row: {
          "id": string;
          "nom": string;
          "prenom": string;
          "email": string;
          "dateEmbauche": string;
          "dateDepart": string | null;
          "actif": boolean;
          "telephone": string | null;
          "avatarUrl": string | null;
          "createdAt": string;
          "updatedAt": string;
          "role": Database["public"]["Enums"]["RoleName"];
        };
        Insert: {
          "id": string;
          "nom": string;
          "prenom": string;
          "email": string;
          "dateEmbauche": string;
          "dateDepart"?: string | null;
          "actif"?: boolean;
          "telephone"?: string | null;
          "avatarUrl"?: string | null;
          "createdAt"?: string;
          "updatedAt": string;
          "role": Database["public"]["Enums"]["RoleName"];
        };
        Update: {
          "id"?: string;
          "nom"?: string;
          "prenom"?: string;
          "email"?: string;
          "dateEmbauche"?: string;
          "dateDepart"?: string | null;
          "actif"?: boolean;
          "telephone"?: string | null;
          "avatarUrl"?: string | null;
          "createdAt"?: string;
          "updatedAt"?: string;
          "role"?: Database["public"]["Enums"]["RoleName"];
        };
        Relationships: [];
      };
      "UtilisateurRole": {
        Row: {
          "id": string;
          "dateAttribution": string;
          "dateRetrait": string | null;
          "utilisateurId": string;
          "roleId": string;
          "attribueParId": string | null;
        };
        Insert: {
          "id": string;
          "dateAttribution"?: string;
          "dateRetrait"?: string | null;
          "utilisateurId": string;
          "roleId": string;
          "attribueParId"?: string | null;
        };
        Update: {
          "id"?: string;
          "dateAttribution"?: string;
          "dateRetrait"?: string | null;
          "utilisateurId"?: string;
          "roleId"?: string;
          "attribueParId"?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [k: string]: never };
    Functions: { [k: string]: never };
    Enums: {
      "CategorieDepense": "CARBURANT" | "FOURNITURES" | "ASSURANCES" | "LOYER" | "MAINTENANCE" | "EQUIPEMENT" | "AUTRE";
      "Civilite": "M" | "MME" | "MLLE";
      "ContratType": "PRESTATION" | "MISE_A_DISPOSITION" | "PONCTUEL";
      "CriticiteIncident": "FAIBLE" | "MODEREE" | "ELEVEE" | "CRITIQUE";
      "EntiteCommentaire": "PROSPECT" | "CLIENT" | "CONTRAT" | "FACTURE" | "DEVIS" | "SITE" | "INCIDENT";
      "EtatMateriel": "NEUF" | "BON" | "USE" | "HORS_SERVICE";
      "FactureType": "ACOMPTE" | "SOLDE" | "COMPLETE" | "AVOIR";
      "FormeJuridique": "SA" | "SARL" | "SAS" | "SASU" | "EURL" | "EI" | "ASSOCIATION" | "AUTRE";
      "FrequenceFacturation": "MENSUELLE" | "TRIMESTRIELLE" | "SEMESTRIELLE" | "ANNUELLE" | "PONCTUELLE";
      "MaterielType": "VEHICULE" | "ARME" | "EQUIPEMENT" | "UNIFORME" | "RADIO" | "AUTRE";
      "MoyenPaiement": "VIREMENT" | "CHEQUE" | "ESPECES" | "CARTE" | "PRELEVEMENT";
      "OrigineProspect": "APPEL_ENTRANT" | "PROSPECTION" | "RECOMMANDATION" | "SITE_WEB" | "SALON" | "AUTRE";
      "RoleContact": "DECIDEUR" | "PRESCRIPTEUR" | "SIGNATAIRE" | "AUTRE";
      "RoleName": "DG" | "RP" | "RF" | "RH" | "MANAGER" | "CONTROLEUR" | "SURVEILLANT" | "JURISTE" | "COMPTABLE" | "AGENT";
      "SiteType": "ENTREPRISE" | "CHANTIER" | "EVENEMENT" | "RESIDENTIEL" | "COMMERCE" | "AUTRE";
      "StatutAvance": "DEMANDEE" | "VALIDEE" | "REFUSEE" | "REMBOURSEE";
      "StatutCheckpoint": "EN_ATTENTE" | "VALIDE" | "MANQUE";
      "StatutDevis": "BROUILLON" | "ENVOYE" | "RELANCE" | "ACCEPTE" | "REFUSE" | "EXPIRE";
      "StatutFacture": "EMISE" | "ENVOYEE" | "PAYEE" | "EN_RETARD" | "LITIGE" | "ANNULEE";
      "StatutIncident": "NOUVEAU" | "EN_COURS" | "CLOTURE";
      "StatutProspect": "NOUVEAU" | "CONTACTE" | "RELANCE" | "PERDU" | "TRANSFORME";
      "StatutRonde": "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "MANQUEE";
      "TypeIncident": "AGRESSION" | "MALVEILLANCE" | "INCENDIE" | "RIXE" | "INTRUSION" | "VOL" | "ACCIDENT" | "AUTRE";
      "TypePointage": "ARRIVEE" | "DEPART";
    };
    CompositeTypes: { [k: string]: never };
  };
};
