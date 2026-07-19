/**
 * Domain types for the PilotePME data layer. These describe the shape the
 * UI consumes; the demo implementation serves fixtures, a real backend
 * (Supabase) would return the same shapes.
 */

export type ID = string;

/* ---------------- CRM ---------------- */
export type ClientStatus = "actif" | "prospect" | "risque";

export interface Client {
  id: ID;
  name: string;
  sector: string;
  contact: string;
  phone: string;
  sites: number;
  monthly: number; // FCFA / month
  status: ClientStatus;
  health: number; // 0–100
  since: string; // ISO date
}

/* ---------------- Finance ---------------- */
export type InvoiceStatus = "payee" | "envoyee" | "retard" | "brouillon";
export type QuoteStatus = "brouillon" | "envoye" | "negociation" | "signe";
export type ContractStatus = "actif" | "expirant" | "expire";

export interface Invoice {
  id: ID;
  ref: string;
  client: string;
  amount: number;
  issued: string;
  due: string;
  status: InvoiceStatus;
}

export interface Quote {
  id: ID;
  ref: string;
  client: string;
  amount: number;
  created: string;
  status: QuoteStatus;
}

export interface Contract {
  id: ID;
  ref: string;
  client: string;
  monthly: number;
  start: string;
  end: string;
  status: ContractStatus;
}

export interface Relance {
  id: ID;
  ref: string;
  client: string;
  amount: number;
  daysLate: number;
  stage: "J+1" | "J+7" | "J+15" | "J+30" | "J+45";
}

/* ---------------- Operations / field ---------------- */
export type AgentStatus = "poste" | "ronde" | "pause" | "alerte";

export interface Site {
  id: ID;
  name: string;
  zone: string;
  agentsNeeded: number;
  agentsPresent: number;
}

export interface SupervisionAgent {
  id: ID;
  name: string;
  initials: string;
  site: string;
  status: AgentStatus;
  note?: string;
  x: number; // % position on the map
  y: number;
  ping: number; // seconds since last ping
}

export interface Shift {
  id: ID;
  agent: string;
  site: string;
  day: number; // 0=Mon … 6=Sun
  start: string; // "07:00"
  end: string;
  type: "jour" | "nuit" | "renfort";
}

export interface Attendance {
  id: ID;
  agent: string;
  site: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "present" | "retard" | "absent" | "non_pointe";
}

/* ---------------- Payroll ---------------- */
export type PayrollStage = "preparation" | "niveau1" | "niveau2" | "approuve";

export interface Payslip {
  id: ID;
  agent: string;
  role: string;
  gross: number;
  ipres: number; // 5.6%
  css: number; // 3.6%
  ir: number;
  net: number;
  days: number;
}

/* ---------------- Recruitment ---------------- */
export type CandidateStage =
  "recus" | "preselection" | "entretien" | "test" | "embauche";

export interface Candidate {
  id: ID;
  name: string;
  initials: string;
  role: string;
  stage: CandidateStage;
  experience: string;
  rating: number; // 0–5
  source: string;
}

export interface Interview {
  id: ID;
  candidatureId: ID;
  candidate: string;
  role: string;
  date: string;
  time: string;
  interviewer: string;
  mode: "présentiel" | "téléphone";
}

/* ---------------- POS / boutique ---------------- */
export interface Product {
  id: ID;
  name: string;
  category: string;
  price: number;
  stock: number;
  threshold: number;
}

export interface Receipt {
  id: ID;
  ref: string;
  time: string;
  items: number;
  total: number;
  method: "Espèces" | "Wave" | "Orange Money";
}

/* ---------------- Maintenance ---------------- */
export type TicketCriticality = "critique" | "haute" | "normale" | "basse";
export type TicketStage = "ouvert" | "encours" | "attente" | "resolu";

export interface Ticket {
  id: ID;
  ref: string;
  title: string;
  site: string;
  criticality: TicketCriticality;
  stage: TicketStage;
  opened: string;
  equipment: string;
}

export interface Intervention {
  id: ID;
  ref: string;
  site: string;
  agent: string;
  date: string;
  summary: string;
  status: "planifiee" | "terminee";
  durationMin: number;
}

/* ---------------- Communication ---------------- */
export type PublicationStatus = "planifie" | "publie" | "brouillon";

export interface Publication {
  id: ID;
  title: string;
  channel: "Facebook" | "LinkedIn" | "Instagram" | "Site web";
  date: string;
  status: PublicationStatus;
  engagement?: number;
}

export interface ImageAlert {
  id: ID;
  source: string;
  excerpt: string;
  sentiment: "négatif" | "neutre" | "positif";
  date: string;
}

/* ---------------- Platform (super admin) ---------------- */
export type Plan = "Starter" | "Pro" | "Enterprise";

export interface Company {
  id: ID;
  name: string;
  city: string;
  plan: Plan;
  seats: number;
  mrr: number;
  status: "actif" | "essai" | "suspendu";
  since: string;
}

/* ---------------- Cross-cutting ---------------- */
export interface Task {
  id: ID;
  title: string;
  owner: string;
  due: string;
  priority: "haute" | "moyenne" | "basse";
  done: boolean;
}

export interface AppNotification {
  id: ID;
  title: string;
  detail: string;
  tone: "info" | "success" | "warning" | "danger";
  at: string;
  read: boolean;
}
