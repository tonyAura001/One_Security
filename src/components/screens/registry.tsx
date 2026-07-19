"use client";

import type { ComponentType } from "react";
import type { ScreenKey } from "@/lib/rbac";
import { PlaceholderScreen } from "./placeholder-screen";

// DG + shared core
import { DgDashboard } from "./dg/dashboard";
import { RoleHome } from "./role-home";

// Finance / CRM / Ops
import { FinanceFacturation } from "./finance/facturation";
import { CrmClients } from "./crm/crm";
import { OpsPlanning } from "./ops/planning";
import { OpsPresences } from "./ops/presences";
import { OpsPointage } from "./ops/pointage";
import { IncidentsScreen } from "./ops/incidents";

// Écrans de démonstration (Trésorerie, Fournisseurs, Contrats, Prospects,
// Accès clients, Satisfaction, Agents, Catalogue, Sécurité, Données)
import { TresorerieScreen } from "./finance/tresorerie";
import { FournisseursScreen } from "./finance/fournisseurs";
import { ContratsScreen } from "./finance/contrats";
import { ProspectsScreen } from "./crm/prospects";
import { AccesClientsScreen } from "./crm/acces";
import { SatisfactionScreen } from "./crm/satisfaction";
import { AgentsScreen } from "./ops/agents";
import { CatalogueScreen } from "./caissier/catalogue";
import { SecuriteScreen } from "./admin/securite";
import { DonneesScreen } from "./admin/donnees";

// Comptabilité
import { ComptaRelances } from "./compta/relances";
import { ComptaBudget } from "./compta/budget";
import { ComptaExportPaie } from "./compta/export-paie";

// Secrétaire / commercial
import { SecretaireDevis } from "./secretaire/devis";
import { SecretaireContratEditor } from "./secretaire/contrat-editor";
import { SecretaireReclamations } from "./secretaire/reclamations";

// Recrutement
import { RecrutementScreen } from "./recruteur/recrutement";
import { RecruteurEntretiens } from "./recruteur/entretiens";
import { RecruteurContratsTravail } from "./recruteur/contrats-travail";
import { RecruteurOnboarding } from "./recruteur/onboarding";

// Paie (circuit 3 niveaux)
import { PayrollPrepaie } from "./payroll/prepaie";
import { PayrollSoumission } from "./payroll/soumission";
import { PayrollValidPresences } from "./payroll/valid-presences";
import { PayrollPaie } from "./payroll/paie";

// Communication
import { CmCalendrier } from "./cm/calendrier";
import { CmComposer } from "./cm/composer";
import { CmVeille } from "./cm/veille";
import { CmNotifications } from "./cm/notifications";

// Maintenance
import { MaintenanceTickets } from "./maintenance/tickets";
import { MaintenanceInterventions } from "./maintenance/interventions";
import { MaintenanceRapportsSite } from "./maintenance/rapports-site";

// Boutique / caisse
import { CaissierPos } from "./caissier/pos";
import { CaissierStock } from "./caissier/stock";
import { CaissierRecus } from "./caissier/recus";
import { CaissierCloture } from "./caissier/cloture";

// Administration
import { AdminMembres } from "./admin/membres";

// Pilotage (DG / Super Admin)
import { DecisionScreen } from "./dg/decision";
import { DiffusionScreen } from "./dg/diffusion";
import { AnalyticsScreen } from "./dg/analytics";

// Espace de travail — Messagerie (commun)
import { MessagerieScreen } from "./shared/messagerie";

// Finance — Rentabilité par site (DG + Comptable)
import { RentabiliteScreen } from "./finance/rentabilite";

// Projets (DG + Secrétaire + Chef de contrôle)
import { ProjetsListe } from "./projets/liste";

// Modules communs (Ressources)
import { BibliothequeScreen } from "./shared/bibliotheque";
import { NotesScreen } from "./shared/notes";

// Espace de travail (commun à tous les rôles)
import { AlertesScreen } from "./shared/alertes";
import { MesTachesScreen } from "./shared/mes-taches";
import { ReunionsScreen } from "./shared/reunions";

// Organisation / système
import { SharedTaches } from "./shared/taches";
import { SharedRapports } from "./shared/rapports";
import { SharedParametres } from "./shared/parametres";

/**
 * Screen registry — maps a screen key to its component. Anything not
 * registered falls back to the placeholder.
 */
const SCREENS: Partial<Record<ScreenKey, ComponentType>> = {
  dashboard: DgDashboard,
  home: RoleHome,
  finance: FinanceFacturation,
  crm: CrmClients,
  planning: OpsPlanning,
  presences: OpsPresences,
  pointage: OpsPointage,
  incidents: IncidentsScreen,
  relances: ComptaRelances,
  budget: ComptaBudget,
  exportpaie: ComptaExportPaie,
  devisform: SecretaireDevis,
  contratedit: SecretaireContratEditor,
  reclamations: SecretaireReclamations,
  recrutement: RecrutementScreen,
  entretiens: RecruteurEntretiens,
  contrattravail: RecruteurContratsTravail,
  onboarding: RecruteurOnboarding,
  prepaie: PayrollPrepaie,
  soumission: PayrollSoumission,
  validpresences: PayrollValidPresences,
  paie: PayrollPaie,
  approbation: PayrollPaie,
  calendrier: CmCalendrier,
  composer: CmComposer,
  veille: CmVeille,
  notifications: CmNotifications,
  tickets: MaintenanceTickets,
  interventions: MaintenanceInterventions,
  histsite: MaintenanceRapportsSite,
  pos: CaissierPos,
  stock: CaissierStock,
  recus: CaissierRecus,
  cloture: CaissierCloture,
  membres: AdminMembres,
  decision: DecisionScreen,
  diffusion: DiffusionScreen,
  analytics: AnalyticsScreen,
  bibliotheque: BibliothequeScreen,
  notes: NotesScreen,
  alertes: AlertesScreen,
  mestaches: MesTachesScreen,
  reunions: ReunionsScreen,
  messagerie: MessagerieScreen,
  rentabilite: RentabiliteScreen,
  projets: ProjetsListe,
  taches: SharedTaches,
  rapports: SharedRapports,
  parametres: SharedParametres,
  // Écrans de démonstration nouvellement branchés
  tresorerie: TresorerieScreen,
  fournisseurs: FournisseursScreen,
  contrats: ContratsScreen,
  prospects: ProspectsScreen,
  acces: AccesClientsScreen,
  satisfaction: SatisfactionScreen,
  agents: AgentsScreen,
  catalogue: CatalogueScreen,
  securite: SecuriteScreen,
  donnees: DonneesScreen,
};

export function ScreenRenderer({ screenKey }: { screenKey: ScreenKey }) {
  const Screen = SCREENS[screenKey];
  if (Screen) return <Screen />;
  return <PlaceholderScreen screenKey={screenKey} />;
}
