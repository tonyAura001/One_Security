// ============================================================
// Types TypeScript — Sama Digital / Aurantir Platform
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── ENUMS ────────────────────────────────────────────────────

export type Role =
  | 'super_admin'
  | 'fondateur'
  | 'manager'
  | 'employe_interne'
  | 'client_externe'
  | 'prestataire'
  | 'invite_lecture'

export type UserStatut = 'actif' | 'inactif' | 'revoque' | 'bloque'
export type Langue = 'fr' | 'en'
export type Theme = 'clair' | 'sombre'
export type Devise = 'FCFA' | 'EUR' | 'USD'
export type Visibilite = 'public' | 'interne' | 'collaborateur' | 'employe' | 'sensible' | 'confidentiel'
export type ProjetStatut = 'planifie' | 'en_cours' | 'en_pause' | 'termine' | 'annule'
export type TacheStatut = 'backlog' | 'a_faire' | 'en_cours' | 'en_review' | 'termine'
export type Priorite = 'basse' | 'normale' | 'haute' | 'urgente'
export type FactureStatut = 'brouillon' | 'envoyee' | 'signee' | 'payee' | 'en_retard' | 'annulee' | 'avoir_emis' | 'recue' | 'validee' | 'partiellement_payee'
export type FactureType = 'facture_client' | 'facture_depense' | 'avoir' | 'facture_fournisseur' | 'avoir_client' | 'avoir_fournisseur'
export type DevisStatut = 'brouillon' | 'envoye' | 'en_negociation' | 'accepte' | 'refuse' | 'expire' | 'annule' | 'converti'
export type ContratStatut = 'en_negociation' | 'valide' | 'expire' | 'resilie'
export type ProspectStatut = 'contact' | 'qualification' | 'proposition' | 'negociation' | 'gagne' | 'perdu'
export type NpsCategorie = 'promoteur' | 'passif' | 'detracteur'
export type FournisseurStatut = 'actif' | 'inactif' | 'blackliste' | 'archive' | 'en_evaluation'
export type DossierVisibilite = 'prive' | 'partage' | 'fondateurs' | 'tous_membres'
export type RessourceCategorie = 'juridique' | 'finance' | 'communication' | 'technique' | 'ressources_humaines' | 'commercial' | 'formation' | 'autre'
export type CongeType = 'conge_paye' | 'conge_maladie' | 'absence' | 'formation' | 'autre'
export type CongeStatut = 'en_attente' | 'approuve' | 'refuse' | 'annule'
export type OkrStatut = 'en_cours' | 'atteint' | 'manque' | 'abandonne'
export type PublicationStatut = 'brouillon' | 'planifie' | 'publie' | 'archive' | 'annule'
export type Reseau = 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok'
export type IncidentPriorite = 'P0' | 'P1' | 'P2' | 'P3'
export type SeuilApplique = 'solo' | 'deux_fondateurs' | 'trois_fondateurs'
export type Frequence = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'
export type Densite = 'compact' | 'confortable'
export type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json'
export type DomaineActivite = 'administration' | 'finance' | 'education' | 'agriculture' | 'commerce' | 'sante' | 'tech' | 'autre'
export type SourceAcquisition = 'bouche_a_oreille' | 'reseau' | 'appel_offre' | 'evenement' | 'reseaux_sociaux' | 'site_web' | 'autre'

// ── SHARED ───────────────────────────────────────────────────

export interface AttachmentMeta {
  nom: string
  path: string
  taille: number
  mime: string
}

// ── ENTITIES ─────────────────────────────────────────────────

export interface EntiteLegale {
  id: string
  nom: string
  couleur: string
  email_contact?: string
  telephone?: string
  adresse?: string
  ninea?: string
  rc?: string
  capital_social?: number
  cgv_texte?: string
  mentions_legales?: string
  prefixe_facture?: string
  logo_url?: string
  documents_legaux?: AttachmentMeta[]
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  auth_user_id?: string
  nom?: string
  prenom: string
  email: string
  telephone?: string
  role: Role
  entite_principale_id?: string
  avatar_url?: string
  statut: UserStatut
  premiere_connexion: boolean
  deux_fa_actif: boolean
  langue: Langue
  theme: Theme
  timezone: string
  documents_justificatifs?: AttachmentMeta[]
  created_at: string
  updated_at: string
  // Relations
  entite_principale?: EntiteLegale
}

export interface Fondateur {
  id: string
  user_id: string
  ajoute_par?: string
  ajoute_at: string
  statut: 'actif' | 'revoque'
  revoque_at?: string
  user?: User
}

export interface Notification {
  id: string
  destinataire_id: string
  type: string
  titre: string
  message: string
  lien?: string
  lu: boolean
  created_at: string
}

export interface PreferenceUser {
  id: string
  user_id: string
  theme: Theme
  langue: Langue
  timezone: string
  densite: Densite
  notif_email: boolean
  notif_push: boolean
  updated_at: string
}

// ── FINANCE ──────────────────────────────────────────────────

export interface Budget {
  id: string
  entite_id: string
  annee: number
  mois: number
  categorie: string
  montant_prevu: number
  montant_reel?: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Tresorerie {
  id: string
  entite_id: string
  date_operation: string
  type: 'entree' | 'sortie'
  montant: number
  devise: Devise
  description?: string
  reference_document?: string
  facture_id?: string
  contrat_id?: string
  categorie?: string
  mode_paiement?: string
  tiers_type?: 'client' | 'fournisseur'
  tiers_id?: string
  justificatif_url?: string
  valide_par?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Depense {
  id: string
  entite_id: string
  projet_id?: string
  categorie: string
  montant: number
  description: string
  fournisseur_id?: string
  statut: 'en_attente' | 'valide' | 'refuse' | 'rembourse'
  approbations: ApprobationItem[]
  seuil_applique?: SeuilApplique
  created_by: string
  valide_par?: string
  created_at: string
  updated_at: string
}

export interface ApprobationItem {
  user_id: string
  approuve_at: string
  commentaire?: string
}

export interface Facture {
  id: string
  numero: string
  type: FactureType
  entite_id: string
  projet_id?: string
  depense_id?: string
  client_id?: string
  fournisseur_id?: string
  facture_origine_id?: string
  montant_ht: number
  taux_tva: number
  montant_tva: number
  montant_ttc: number
  devise: Devise
  statut: FactureStatut
  date_emission: string
  date_echeance: string
  date_paiement?: string
  pdf_url?: string
  genere_par: string
  cgv_snapshot?: string
  mentions_legales_snapshot?: string
  note_client?: string
  created_at: string
  updated_at: string
  // Relations
  entite?: EntiteLegale
  lignes?: LigneFacture[]
  client?: EntrepriseCliente
  fournisseur?: { nom: string }
}

export interface LigneFacture {
  id: string
  facture_id: string
  description: string
  quantite: number
  prix_unitaire: number
  taux_tva: number
  total_ht: number
  total_ttc: number
  ordre: number
}

export interface Devis {
  id: string
  numero: string
  entite_id: string
  client_id?: string
  projet_id?: string
  cree_par: string
  montant_ht: number
  remise_globale_pct: number
  remise_globale_montant: number
  base_taxable_ht: number
  taux_tva: number
  montant_tva: number
  montant_ttc: number
  devise: Devise
  statut: DevisStatut
  date_emission: string
  date_validite: string
  note_client?: string
  pdf_url?: string
  facture_id?: string
  cgv_snapshot?: string
  tva_forcee_manuellement: boolean
  created_at: string
  updated_at: string
  // Relations
  entite?: EntiteLegale
  client?: EntrepriseCliente
  lignes?: LigneDevis[]
}

export interface LigneDevis {
  id: string
  devis_id: string
  description: string
  quantite: number
  prix_unitaire: number
  remise_ligne_pct: number
  remise_ligne_montant: number
  taux_tva: number
  total_ht: number
  total_ttc: number
  ordre: number
}

// ── CRM ───────────────────────────────────────────────────────

export interface EntrepriseCliente {
  id: string
  nom_entreprise: string
  domaine_activite: DomaineActivite
  secteur?: string
  adresse?: string
  pays: string
  telephone?: string
  site_web?: string
  ninea?: string
  adresse_facturation?: string
  langue: Langue
  source_acquisition: SourceAcquisition
  note_interne?: string
  entites_liees: string[]
  cree_par?: string
  created_at: string
  updated_at: string
  // Relations
  contacts?: ContactClient[]
}

export interface ContactClient {
  id: string
  entreprise_id: string
  nom?: string
  prenom: string
  email: string
  telephone?: string
  poste?: string
  est_contact_principal: boolean
  projets_acces: string[]
  cree_par?: string
  valide_par?: string
  statut: 'en_attente' | 'actif' | 'inactif' | 'revoque'
  created_at: string
  updated_at: string
}

export interface Contrat {
  id: string
  entite_id: string
  client_id: string
  projet_id?: string
  numero: string
  titre: string
  montant: number
  date_signature?: string
  date_debut: string
  date_fin: string
  statut: ContratStatut
  signe_par?: string
  signe_at?: string
  pdf_url?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  // Relations
  client?: EntrepriseCliente
  entite?: EntiteLegale
}

export interface Prospect {
  id: string
  entite_id: string
  entreprise_id?: string
  nom_contact: string
  email?: string
  telephone?: string
  statut: ProspectStatut
  valeur_estimee?: number
  note?: string
  cree_par: string
  created_at: string
  updated_at: string
}

// ── PROJETS ───────────────────────────────────────────────────

export interface Projet {
  id: string
  titre: string
  description?: string
  entite_id: string
  client_id?: string
  responsable_id: string
  statut: ProjetStatut
  date_debut?: string
  date_fin_prevue?: string
  date_fin_reelle?: string
  budget_prevu: number
  budget_reel: number
  revenus_attendus: number
  avancement: number
  tags: string[]
  parent_id?: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Relations
  entite?: EntiteLegale
  client?: EntrepriseCliente
  responsable?: User
  membres?: MembreProjet[]
}

export interface MembreProjet {
  id: string
  projet_id: string
  user_id?: string
  contact_client_id?: string
  type_collaborateur: string
  role_projet: string
  acces_historique: string
  date_historique_depuis?: string
  ajoute_par: string
  statut: UserStatut
  created_at: string
  revoque_at?: string
  user?: User
}

export interface Tache {
  id: string
  projet_id: string
  titre: string
  description?: string
  assigne_a?: string
  statut: TacheStatut
  priorite: Priorite
  date_debut?: string
  date_echeance?: string
  ordre: number
  tags: string[]
  temps_estime_heures?: number
  temps_passe_heures: number
  created_by: string
  created_at: string
  updated_at: string
  assigne?: User
}

export interface Rapport {
  id: string
  numero: string
  titre: string
  contenu?: string
  redacteur_id: string
  projet_id?: string
  client_id?: string
  entite_id: string
  visibilite: Visibilite
  statut: 'brouillon' | 'publie' | 'archive'
  modele_id?: string
  published_at?: string
  created_at: string
  updated_at: string
  redacteur?: User
  entite?: EntiteLegale
}

// ── BIBLIOTHÈQUE ──────────────────────────────────────────────

export interface Dossier {
  id: string
  nom: string
  description?: string
  parent_id?: string
  createur_id: string
  proprietaire_id: string
  entite_id: string
  mot_de_passe_hash?: string
  visibilite: DossierVisibilite
  created_at: string
  updated_at: string
  // Relations
  enfants?: Dossier[]
  ressources?: Ressource[]
}

export interface Ressource {
  id: string
  nom: string
  description?: string
  dossier_id?: string
  projet_id?: string
  entite_id: string
  categorie: RessourceCategorie
  visibilite: string
  url: string
  taille_bytes?: number
  type_mime?: string
  version_actuelle: number
  watermark: boolean
  telecharger_log: boolean
  upload_par: string
  created_at: string
  updated_at: string
}

// ── FOURNISSEURS ──────────────────────────────────────────────

export interface Fournisseur {
  id: string
  nom: string
  type: string
  domaine?: string
  contact_nom?: string
  email?: string
  telephone?: string
  adresse?: string
  pays: string
  ninea?: string
  entite_liee: string
  statut: FournisseurStatut
  note_interne?: string
  ajoute_par: string
  created_at: string
  updated_at: string
}

export interface FactureFournisseur {
  id: string
  numero: string
  fournisseur_id: string
  projet_id?: string
  entite_id: string
  montant_ht: number
  montant_ttc: number
  date_reception: string
  date_paiement?: string
  scan_url?: string
  notes?: string
  cree_par: string
  valide_par?: string
  statut: string
  created_at: string
  updated_at: string
  fournisseur?: Fournisseur
}

// ── MESSAGERIE ────────────────────────────────────────────────

export interface Conversation {
  id: string
  participants: string[]
  nom?: string
  type: 'prive' | 'groupe'
  created_by: string
  created_at: string
}

export interface MessagePrive {
  id: string
  conversation_id: string
  expediteur_id: string
  contenu: string
  lu_par: string[]
  piece_jointe_url?: string
  created_at: string
  updated_at: string
  expediteur?: User
}

// ── CALENDRIER ────────────────────────────────────────────────

export interface EvenementCalendrier {
  id: string
  proprietaire_id: string
  titre: string
  description?: string
  date_debut: string
  date_fin: string
  type: string
  tache_id?: string
  projet_id?: string
  recurrence: string
  recurrence_config?: Json
  entite_id?: string
  created_at: string
  updated_at: string
}

export interface CongeAbsence {
  id: string
  employe_id: string
  type: CongeType
  date_debut: string
  date_fin: string
  statut: CongeStatut
  valide_par?: string
  note?: string
  created_at: string
  updated_at: string
  employe?: User
}

// ── OKR ───────────────────────────────────────────────────────

export interface OkrFondateur {
  id: string
  fondateur_id: string
  trimestre: number
  annee: number
  objectif: string
  indicateur: string
  valeur_cible: number
  valeur_actuelle: number
  avancement: number
  statut: OkrStatut
  created_at: string
  updated_at: string
  fondateur?: User
}

// ── AUDIT ─────────────────────────────────────────────────────

export interface AuditSecurite {
  id: string
  acteur_id?: string
  action: string
  module: string
  entite_type?: string
  entite_id?: string
  valeur_avant?: Json
  valeur_apres?: Json
  ip?: string
  created_at: string
  acteur?: User
}

// ── DASHBOARD KPIs ────────────────────────────────────────────

export interface DashboardKPIs {
  revenus_mois: number
  revenus_variation_pct: number
  factures_en_attente: number
  factures_en_retard: number
  projets_actifs: number
  taches_urgentes: number
  tresorerie_solde: number
  nps_moyen: number
  devis_taux_conversion: number
  ca_total_annee: number
}

export interface KPICard {
  label: string
  value: string | number
  variation?: number
  variation_label?: string
  icon?: string
  color?: string
  link?: string
}

// ── NUMÉROTATION ─────────────────────────────────────────────

export interface CompteurDocument {
  id: string
  entite_id: string
  type_document: string
  annee: number
  compteur: number
}

// ── FILTRES RECHERCHE ────────────────────────────────────────

export interface FiltresRapport {
  numero?: string
  client_id?: string
  projet_id?: string
  redacteur_id?: string
  date_debut?: string
  date_fin?: string
  entite_id?: string
  visibilite?: Visibilite
  statut?: string
  search?: string
}

export interface FiltresFacture {
  entite_id?: string
  statut?: FactureStatut
  client_id?: string
  date_debut?: string
  date_fin?: string
  search?: string
}

export interface FiltresProjet {
  entite_id?: string
  statut?: ProjetStatut
  client_id?: string
  responsable_id?: string
  search?: string
}

// ── SNAPSHOT FINANCIER ────────────────────────────────────────

export interface SnapshotAnnuel {
  id: string
  entite_id: string
  annee: number
  revenus_par_mois: number[]
  depenses_par_mois: number[]
  resultat_net_par_mois: number[]
  total_annuel: number
  marge_pct: number
  genere_at: string
}
