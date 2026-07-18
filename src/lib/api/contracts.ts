/**
 * Contrats de gardiennage — un seul module pour les deux points d'entrée
 * (Finance → Contrats et CRM → Contrats). Vue liste + détail (sites couverts,
 * agents affectés). Données démo « Dakar Sécurité ».
 */
import type { PillVariant } from "@/components/ui/status-pill";

export type ContractType =
  | "statique"
  | "rondes"
  | "evenementiel"
  | "cynophile";

export type ContractStatus = "actif" | "a_renouveler" | "expire" | "suspendu";

export interface ContractSiteCoverage {
  site: string;
  zone: string;
  agents: number;
  regime: string; // ex. "24/7", "Nuit 19h-07h"
}

export interface AssignedAgent {
  name: string;
  initials: string;
  role: string;
}

export interface GuardingContract {
  id: string;
  ref: string;
  client: string;
  type: ContractType;
  agentsDeployed: number;
  monthly: number;
  start: string; // ISO
  end: string; // ISO
  status: ContractStatus;
  sites: ContractSiteCoverage[];
  agents: AssignedAgent[];
}

const CONTRACTS: GuardingContract[] = [
  {
    id: "ctr-cbao",
    ref: "CTR-2026-014",
    client: "CBAO Plateau",
    type: "statique",
    agentsDeployed: 6,
    monthly: 1_800_000,
    start: "2026-01-15",
    end: "2027-01-15",
    status: "actif",
    sites: [
      { site: "CBAO — Agence Plateau", zone: "Plateau", agents: 4, regime: "24/7" },
      { site: "CBAO — Siège Indépendance", zone: "Plateau", agents: 2, regime: "Jour 07h-19h" },
    ],
    agents: [
      { name: "Abdou Kane", initials: "AK", role: "Chef de poste" },
      { name: "Ibrahima Ba", initials: "IB", role: "Agent de sécurité" },
      { name: "Awa Diagne", initials: "AD", role: "Agent de sécurité" },
      { name: "Serigne Fall", initials: "SF", role: "Rondier" },
    ],
  },
  {
    id: "ctr-radisson",
    ref: "CTR-2025-041",
    client: "Radisson Blu",
    type: "statique",
    agentsDeployed: 8,
    monthly: 2_400_000,
    start: "2025-09-01",
    end: "2026-09-01",
    status: "actif",
    sites: [
      { site: "Radisson Blu — Corniche", zone: "Corniche", agents: 8, regime: "24/7" },
    ],
    agents: [
      { name: "Ousmane Diop", initials: "OD", role: "Chef de poste" },
      { name: "Mariama Sow", initials: "MS", role: "Agent de sécurité" },
      { name: "Modou Faye", initials: "MF", role: "Agent de sécurité" },
    ],
  },
  {
    id: "ctr-terroubi",
    ref: "CTR-2025-033",
    client: "Terrou-Bi",
    type: "rondes",
    agentsDeployed: 5,
    monthly: 1_450_000,
    start: "2025-08-20",
    end: "2026-08-20",
    status: "a_renouveler",
    sites: [
      { site: "Terrou-Bi — Resort & Casino", zone: "Corniche Ouest", agents: 5, regime: "Nuit 19h-07h" },
    ],
    agents: [
      { name: "Cheikh Ndoye", initials: "CN", role: "Rondier" },
      { name: "Lamine Cissé", initials: "LC", role: "Agent de sécurité" },
    ],
  },
  {
    id: "ctr-kingfahd",
    ref: "CTR-2025-028",
    client: "King Fahd Palace",
    type: "statique",
    agentsDeployed: 7,
    monthly: 1_650_000,
    start: "2025-07-10",
    end: "2026-07-10",
    status: "a_renouveler",
    sites: [
      { site: "King Fahd Palace — Almadies", zone: "Almadies", agents: 7, regime: "24/7" },
    ],
    agents: [
      { name: "Aïda Ndiaye", initials: "AN", role: "Chef de poste" },
      { name: "Pape Guèye", initials: "PG", role: "Agent de sécurité" },
    ],
  },
  {
    id: "ctr-seaplaza",
    ref: "CTR-2026-006",
    client: "Auchan Sea Plaza",
    type: "statique",
    agentsDeployed: 5,
    monthly: 1_350_000,
    start: "2026-03-22",
    end: "2027-03-22",
    status: "actif",
    sites: [
      { site: "Auchan — Sea Plaza", zone: "Corniche", agents: 5, regime: "Jour 08h-22h" },
    ],
    agents: [
      { name: "Bineta Thiam", initials: "BT", role: "Chef de poste" },
      { name: "Alioune Sène", initials: "AS", role: "Agent de sécurité" },
    ],
  },
  {
    id: "ctr-sonatel",
    ref: "CTR-2024-018",
    client: "Sonatel (Siège)",
    type: "statique",
    agentsDeployed: 6,
    monthly: 2_100_000,
    start: "2024-01-10",
    end: "2027-01-10",
    status: "actif",
    sites: [
      { site: "Siège Sonatel — Médina", zone: "Médina", agents: 4, regime: "24/7" },
      { site: "Sonatel — Datacenter Rufisque", zone: "Rufisque", agents: 2, regime: "Nuit 19h-07h" },
    ],
    agents: [
      { name: "Fatou Sarr", initials: "FS", role: "Chef de poste" },
      { name: "Khadija Ba", initials: "KB", role: "Rondier" },
    ],
  },
  {
    id: "ctr-almadies",
    ref: "CTR-2026-011",
    client: "Résidence Les Almadies",
    type: "rondes",
    agentsDeployed: 4,
    monthly: 1_100_000,
    start: "2026-02-01",
    end: "2027-02-01",
    status: "actif",
    sites: [
      { site: "Résidence Les Almadies — Ngor", zone: "Ngor", agents: 4, regime: "Nuit 20h-06h" },
    ],
    agents: [
      { name: "Coumba Diallo", initials: "CD", role: "Rondier" },
      { name: "Modou Kane", initials: "MK", role: "Agent de sécurité" },
    ],
  },
  {
    id: "ctr-pad",
    ref: "CTR-2025-007",
    client: "Port Autonome de Dakar",
    type: "cynophile",
    agentsDeployed: 12,
    monthly: 4_200_000,
    start: "2025-07-15",
    end: "2026-07-15",
    status: "a_renouveler",
    sites: [
      { site: "Port Autonome — Môle 3", zone: "Dakar — Môle", agents: 8, regime: "24/7" },
      { site: "Port Autonome — Zone conteneurs", zone: "Dakar — Môle", agents: 4, regime: "Nuit 19h-07h" },
    ],
    agents: [
      { name: "Cheikh Guèye", initials: "CG", role: "Superviseur" },
      { name: "Ibou Sarr", initials: "IS", role: "Maître-chien" },
    ],
  },
  {
    id: "ctr-ambfr",
    ref: "CTR-2023-004",
    client: "Ambassade de France",
    type: "statique",
    agentsDeployed: 4,
    monthly: 1_875_000,
    start: "2022-11-20",
    end: "2026-05-20",
    status: "expire",
    sites: [
      { site: "Ambassade de France — Plateau", zone: "Plateau", agents: 4, regime: "24/7" },
    ],
    agents: [{ name: "Awa Gueye", initials: "AG", role: "Chef de poste" }],
  },
];

export function getContracts(): GuardingContract[] {
  return CONTRACTS;
}

export function getContract(id: string): GuardingContract | undefined {
  return CONTRACTS.find((c) => c.id === id);
}

export interface ContractStats {
  active: number;
  mrr: number;
  toRenew: number;
  renewalRate: number;
}

export function getContractStats(): ContractStats {
  const active = CONTRACTS.filter(
    (c) => c.status === "actif" || c.status === "a_renouveler",
  );
  const mrr = active.reduce((s, c) => s + c.monthly, 0);
  const toRenew = CONTRACTS.filter((c) => c.status === "a_renouveler").length;
  return { active: active.length, mrr, toRenew, renewalRate: 92 };
}

export const CONTRACT_TYPE_META: Record<
  ContractType,
  { label: string; tone: "accent" | "violet" | "warning" | "success" }
> = {
  statique: { label: "Gardiennage statique", tone: "accent" },
  rondes: { label: "Rondes", tone: "success" },
  evenementiel: { label: "Événementiel", tone: "warning" },
  cynophile: { label: "Cynophile", tone: "violet" },
};

export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; variant: PillVariant }
> = {
  actif: { label: "Actif", variant: "success" },
  a_renouveler: { label: "À renouveler", variant: "warning" },
  expire: { label: "Expiré", variant: "danger" },
  suspendu: { label: "Suspendu", variant: "neutral" },
};
