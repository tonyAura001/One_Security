import { simulate } from "./client";
import * as db from "./data";

/**
 * Backend-ready service layer. Grouped by domain, all async. Screens call
 * these (directly or via TanStack Query) and never touch the fixtures.
 */
export const api = {
  crm: {
    listClients: () => simulate(db.CLIENTS),
    getClient: (id: string) =>
      simulate(db.CLIENTS.find((c) => c.id === id) ?? null),
  },
  finance: {
    listInvoices: () => simulate(db.INVOICES),
    listQuotes: () => simulate(db.QUOTES),
    listContracts: () => simulate(db.CONTRACTS),
    listRelances: () => simulate(db.RELANCES),
    revenueSeries: () => simulate(db.REVENUE_SERIES),
  },
  operations: {
    listSites: () => simulate(db.SITES),
    listShifts: () => simulate(db.SHIFTS),
    listAttendance: () => simulate(db.ATTENDANCE),
    supervisionAgents: () => simulate(db.SUPERVISION_AGENTS, 120),
  },
  payroll: {
    listPayslips: () => simulate(db.PAYSLIPS),
  },
  hr: {
    listCandidates: () => simulate(db.CANDIDATES),
    listInterviews: () => simulate(db.INTERVIEWS),
  },
  pos: {
    listProducts: () => simulate(db.PRODUCTS),
    listReceipts: () => simulate(db.RECEIPTS),
  },
  maintenance: {
    listTickets: () => simulate(db.TICKETS),
    listInterventions: () => simulate(db.INTERVENTIONS),
  },
  communication: {
    listPublications: () => simulate(db.PUBLICATIONS),
    listImageAlerts: () => simulate(db.IMAGE_ALERTS),
  },
  platform: {
    listCompanies: () => simulate(db.COMPANIES),
  },
  tasks: {
    list: () => simulate(db.TASKS),
  },
  notifications: {
    list: () => simulate(db.NOTIFICATIONS),
  },
};

export type Api = typeof api;
