/**
 * Agents de sécurité — annuaire opérationnel. Carte professionnelle
 * (Décret 2018-671), affectations et présence. Données démo « Dakar Sécurité ».
 * Les noms recoupent le roster de supervision (`data.ts`).
 */
import type { PillVariant } from "@/components/ui/status-pill";

/** Date de référence de la démo (pour l'échéance des cartes pro). */
const TODAY = new Date("2026-07-13");
/** Seuil « à renouveler » : carte pro expirant sous 90 jours. */
const RENEW_THRESHOLD_DAYS = 90;

export type AgentPoste =
  | "agent"
  | "maitre_chien"
  | "superviseur"
  | "chef_poste"
  | "rondier";

export type AgentStatus = "en_poste" | "repos" | "conge" | "suspendu";

export interface Agent {
  id: string;
  name: string;
  initials: string;
  matricule: string;
  poste: AgentPoste;
  site: string;
  status: AgentStatus;
  phone: string;
  /** Échéance de la carte professionnelle (Décret 2018-671), ISO. */
  cardExpiry: string;
  certifications: string[];
  /** Taux de présence sur 30 jours (%). */
  attendanceRate: number;
}

const AGENTS: Agent[] = [
  {
    id: "ag1",
    name: "Modou Faye",
    initials: "MF",
    matricule: "DS-0142",
    poste: "chef_poste",
    site: "Radisson Blu",
    status: "en_poste",
    phone: "+221 77 512 44 01",
    cardExpiry: "2026-09-20",
    certifications: ["SST", "Incendie EPI", "Décret 2018-671"],
    attendanceRate: 98,
  },
  {
    id: "ag2",
    name: "Awa Diagne",
    initials: "AD",
    matricule: "DS-0143",
    poste: "agent",
    site: "CBAO Plateau",
    status: "en_poste",
    phone: "+221 78 640 22 10",
    cardExpiry: "2027-03-14",
    certifications: ["Décret 2018-671"],
    attendanceRate: 95,
  },
  {
    id: "ag3",
    name: "Cheikh Ndoye",
    initials: "CN",
    matricule: "DS-0121",
    poste: "rondier",
    site: "Terrou-Bi",
    status: "en_poste",
    phone: "+221 77 330 88 45",
    cardExpiry: "2026-08-05",
    certifications: ["SST", "Décret 2018-671"],
    attendanceRate: 92,
  },
  {
    id: "ag4",
    name: "Ibou Sarr",
    initials: "IS",
    matricule: "DS-0098",
    poste: "maitre_chien",
    site: "Port Autonome de Dakar",
    status: "en_poste",
    phone: "+221 76 908 12 33",
    cardExpiry: "2026-10-02",
    certifications: ["Cynophile K9", "Décret 2018-671"],
    attendanceRate: 97,
  },
  {
    id: "ag5",
    name: "Cheikh Guèye",
    initials: "CG",
    matricule: "DS-0055",
    poste: "superviseur",
    site: "Zone Plateau · Almadies",
    status: "en_poste",
    phone: "+221 77 640 55 00",
    cardExpiry: "2027-01-18",
    certifications: ["SST", "Management sécurité", "Décret 2018-671"],
    attendanceRate: 99,
  },
  {
    id: "ag6",
    name: "Ousmane Diop",
    initials: "OD",
    matricule: "DS-0160",
    poste: "chef_poste",
    site: "Radisson Blu",
    status: "repos",
    phone: "+221 78 145 90 21",
    cardExpiry: "2026-07-30",
    certifications: ["Incendie EPI", "Décret 2018-671"],
    attendanceRate: 90,
  },
  {
    id: "ag7",
    name: "Mariama Sow",
    initials: "MS",
    matricule: "DS-0161",
    poste: "agent",
    site: "Résidence Les Almadies",
    status: "en_poste",
    phone: "+221 77 220 71 08",
    cardExpiry: "2027-05-11",
    certifications: ["Décret 2018-671"],
    attendanceRate: 94,
  },
  {
    id: "ag8",
    name: "Abdou Kane",
    initials: "AK",
    matricule: "DS-0110",
    poste: "chef_poste",
    site: "CBAO Plateau",
    status: "en_poste",
    phone: "+221 76 512 33 90",
    cardExpiry: "2026-08-28",
    certifications: ["SST", "Décret 2018-671"],
    attendanceRate: 96,
  },
  {
    id: "ag9",
    name: "Aïda Ndiaye",
    initials: "AN",
    matricule: "DS-0175",
    poste: "chef_poste",
    site: "King Fahd Palace",
    status: "en_poste",
    phone: "+221 78 908 45 12",
    cardExpiry: "2027-02-09",
    certifications: ["Incendie EPI", "Décret 2018-671"],
    attendanceRate: 93,
  },
  {
    id: "ag10",
    name: "Serigne Fall",
    initials: "SF",
    matricule: "DS-0132",
    poste: "rondier",
    site: "CBAO Plateau",
    status: "conge",
    phone: "+221 77 445 61 77",
    cardExpiry: "2026-12-01",
    certifications: ["Décret 2018-671"],
    attendanceRate: 88,
  },
  {
    id: "ag11",
    name: "Khadija Ba",
    initials: "KB",
    matricule: "DS-0148",
    poste: "rondier",
    site: "Sonatel (Siège)",
    status: "en_poste",
    phone: "+221 76 330 09 54",
    cardExpiry: "2026-09-02",
    certifications: ["SST", "Décret 2018-671"],
    attendanceRate: 91,
  },
  {
    id: "ag12",
    name: "Pape Guèye",
    initials: "PG",
    matricule: "DS-0166",
    poste: "agent",
    site: "King Fahd Palace",
    status: "en_poste",
    phone: "+221 78 145 22 66",
    cardExpiry: "2027-04-20",
    certifications: ["Décret 2018-671"],
    attendanceRate: 89,
  },
  {
    id: "ag13",
    name: "Lamine Cissé",
    initials: "LC",
    matricule: "DS-0154",
    poste: "agent",
    site: "Terrou-Bi",
    status: "suspendu",
    phone: "+221 77 512 88 30",
    cardExpiry: "2026-06-15",
    certifications: ["Décret 2018-671"],
    attendanceRate: 71,
  },
  {
    id: "ag14",
    name: "Bineta Thiam",
    initials: "BT",
    matricule: "DS-0170",
    poste: "chef_poste",
    site: "Auchan Sea Plaza",
    status: "en_poste",
    phone: "+221 76 640 71 42",
    cardExpiry: "2027-06-30",
    certifications: ["SST", "Incendie EPI", "Décret 2018-671"],
    attendanceRate: 95,
  },
  {
    id: "ag15",
    name: "Alioune Sène",
    initials: "AS",
    matricule: "DS-0171",
    poste: "agent",
    site: "Auchan Sea Plaza",
    status: "repos",
    phone: "+221 78 220 33 15",
    cardExpiry: "2026-08-18",
    certifications: ["Décret 2018-671"],
    attendanceRate: 90,
  },
  {
    id: "ag16",
    name: "Coumba Diallo",
    initials: "CD",
    matricule: "DS-0178",
    poste: "rondier",
    site: "Résidence Les Almadies",
    status: "en_poste",
    phone: "+221 77 908 61 20",
    cardExpiry: "2027-03-01",
    certifications: ["Décret 2018-671"],
    attendanceRate: 92,
  },
];

/** Jours restants avant expiration de la carte pro (négatif = expirée). */
export function daysUntilCardExpiry(agent: Agent): number {
  const expiry = new Date(agent.cardExpiry);
  return Math.round((expiry.getTime() - TODAY.getTime()) / 86_400_000);
}

export function cardNeedsRenewal(agent: Agent): boolean {
  return daysUntilCardExpiry(agent) < RENEW_THRESHOLD_DAYS;
}

export function getAgents(): Agent[] {
  return AGENTS;
}

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export interface AgentStats {
  active: number;
  onDuty: number;
  cardsToRenew: number;
  attendanceRate: number;
}

export function getAgentStats(): AgentStats {
  const active = AGENTS.filter((a) => a.status !== "suspendu").length;
  const onDuty = AGENTS.filter((a) => a.status === "en_poste").length;
  const cardsToRenew = AGENTS.filter(cardNeedsRenewal).length;
  const attendanceRate = Math.round(
    AGENTS.reduce((s, a) => s + a.attendanceRate, 0) / AGENTS.length,
  );
  return { active, onDuty, cardsToRenew, attendanceRate };
}

export const POSTE_META: Record<
  AgentPoste,
  { label: string; tone: "accent" | "violet" | "warning" | "success" | "muted" }
> = {
  agent: { label: "Agent de sécurité", tone: "accent" },
  maitre_chien: { label: "Maître-chien", tone: "violet" },
  superviseur: { label: "Superviseur", tone: "warning" },
  chef_poste: { label: "Chef de poste", tone: "success" },
  rondier: { label: "Rondier", tone: "muted" },
};

export const AGENT_STATUS_META: Record<
  AgentStatus,
  { label: string; variant: PillVariant }
> = {
  en_poste: { label: "En poste", variant: "success" },
  repos: { label: "Repos", variant: "neutral" },
  conge: { label: "Congé", variant: "info" },
  suspendu: { label: "Suspendu", variant: "danger" },
};
