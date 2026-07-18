export type Audience = "entreprise" | "site" | "superviseurs" | "agents";

export interface Broadcast {
  id: string;
  subject: string;
  audience: Audience;
  readCount: number;
  total: number;
  sentAt: string; // ISO
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  entreprise: "Toute l'entreprise",
  site: "Par site",
  superviseurs: "Superviseurs",
  agents: "Agents",
};

const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86_400_000).toISOString();

export const RECENT_BROADCASTS: Broadcast[] = [
  {
    id: "b1",
    subject: "Consignes ramadan — horaires des postes",
    audience: "entreprise",
    readCount: 42,
    total: 52,
    sentAt: daysAgo(2),
  },
  {
    id: "b2",
    subject: "Nouvelle procédure incident & intrusion",
    audience: "superviseurs",
    readCount: 8,
    total: 9,
    sentAt: daysAgo(5),
  },
  {
    id: "b3",
    subject: "Félicitations à l'équipe AIBD 🎉",
    audience: "agents",
    readCount: 30,
    total: 44,
    sentAt: daysAgo(8),
  },
];
