import {
  AlertTriangle,
  Banknote,
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  Gavel,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { RoleId } from "@/lib/rbac";

export type ActivityColor =
  "accent" | "success" | "warning" | "danger" | "violet";

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconColor: ActivityColor;
  title: string;
  status: string;
  timestamp: Date;
}

/** Horodatage relatif à « maintenant » (→ « il y a X h / X j » stable). */
const hoursAgo = (h: number): Date => new Date(Date.now() - h * 3_600_000);

type Raw = Omit<ActivityItem, "timestamp"> & { h: number };

const FEEDS: Record<RoleId, Raw[]> = {
  dg: [
    {
      id: "dg1",
      icon: Upload,
      iconColor: "warning",
      title: "Masse salariale soumise à validation",
      status: "Circuit paie · Niveau 1 → Niveau 2",
      h: 2,
    },
    {
      id: "dg2",
      icon: FileText,
      iconColor: "success",
      title: "Contrat Port Autonome renouvelé",
      status: "CTR-2025-007 · 4 200 000 FCFA / mois",
      h: 5,
    },
    {
      id: "dg3",
      icon: AlertTriangle,
      iconColor: "danger",
      title: "3 sites non couverts signalés",
      status: "Résidence Almadies, CBAO, Eiffage chantier",
      h: 8,
    },
    {
      id: "dg4",
      icon: Bell,
      iconColor: "accent",
      title: "Facture FAC-2025-041 relancée",
      status: "Ambassade de France · 1 875 000 FCFA",
      h: 27,
    },
  ],
  rp: [
    {
      id: "rp1",
      icon: MapPin,
      iconColor: "danger",
      title: "Poste non couvert — AIBD",
      status: "Zone fret · depuis 12 min",
      h: 4,
    },
    {
      id: "rp2",
      icon: Calendar,
      iconColor: "accent",
      title: "Planning semaine 29 publié",
      status: "52 vacations · 19 sites",
      h: 6,
    },
    {
      id: "rp3",
      icon: ShieldCheck,
      iconColor: "success",
      title: "Couverture terrain consolidée",
      status: "18/19 sites couverts ce matin",
      h: 26,
    },
  ],
  rf: [
    {
      id: "rf1",
      icon: ReceiptText,
      iconColor: "success",
      title: "Facture SMD-FAC-0042 payée",
      status: "Sonatel · 2 100 000 FCFA",
      h: 3,
    },
    {
      id: "rf2",
      icon: Bell,
      iconColor: "warning",
      title: "Relance envoyée — Ambassade",
      status: "Mise en demeure · J+30",
      h: 7,
    },
    {
      id: "rf3",
      icon: Banknote,
      iconColor: "accent",
      title: "Rentabilité par site consolidée",
      status: "Marge Port Autonome · +18 %",
      h: 26,
    },
  ],
  rh: [
    {
      id: "rh1",
      icon: Calendar,
      iconColor: "accent",
      title: "Candidat Modou Faye — entretien planifié",
      status: "Agent cynophile · 04/07 à 10:00",
      h: 1,
    },
    {
      id: "rh2",
      icon: FileText,
      iconColor: "success",
      title: "Contrat CDD généré",
      status: "Fatima Cissé · Agent de sécurité",
      h: 6,
    },
    {
      id: "rh3",
      icon: ShieldCheck,
      iconColor: "warning",
      title: "4 cartes CNAPS à renouveler",
      status: "Échéance < 30 jours",
      h: 27,
    },
  ],
  manager: [
    {
      id: "mg1",
      icon: MapPin,
      iconColor: "accent",
      title: "Ronde secteur Almadies terminée",
      status: "6 sites · RAS",
      h: 2,
    },
    {
      id: "mg2",
      icon: AlertTriangle,
      iconColor: "warning",
      title: "Retard agent — Sea Plaza",
      status: "Relève assurée",
      h: 4,
    },
    {
      id: "mg3",
      icon: CheckCircle2,
      iconColor: "success",
      title: "Pointage secteur complet",
      status: "16/18 agents en poste",
      h: 7,
    },
  ],
  controleur: [
    {
      id: "ct1",
      icon: ShieldCheck,
      iconColor: "success",
      title: "Présences validées (Niveau 2)",
      status: "Transmis au DG pour approbation",
      h: 1,
    },
    {
      id: "ct2",
      icon: MapPin,
      iconColor: "accent",
      title: "Ronde de contrôle — Port Autonome",
      status: "3 anomalies relevées",
      h: 4,
    },
    {
      id: "ct3",
      icon: AlertTriangle,
      iconColor: "danger",
      title: "Écart de pointage détecté",
      status: "CBAO · agent absent à 22:00",
      h: 7,
    },
  ],
  surveillant: [
    {
      id: "sv1",
      icon: CheckCircle2,
      iconColor: "success",
      title: "Relève effectuée — poste jour",
      status: "8 agents présents",
      h: 1,
    },
    {
      id: "sv2",
      icon: AlertTriangle,
      iconColor: "warning",
      title: "Retard agent signalé",
      status: "Ml. Diop · +25 min",
      h: 3,
    },
    {
      id: "sv3",
      icon: FileText,
      iconColor: "accent",
      title: "Main courante mise à jour",
      status: "3 événements consignés",
      h: 6,
    },
  ],
  juriste: [
    {
      id: "ju1",
      icon: FileText,
      iconColor: "success",
      title: "Contrat Port Autonome renouvelé",
      status: "CTR-2025-007 · 12 mois",
      h: 2,
    },
    {
      id: "ju2",
      icon: Gavel,
      iconColor: "danger",
      title: "Contentieux ouvert",
      status: "Litige impayé · Ambassade",
      h: 5,
    },
    {
      id: "ju3",
      icon: ShieldCheck,
      iconColor: "violet",
      title: "Réclamation clôturée",
      status: "Sea Plaza · retard d'agent",
      h: 27,
    },
  ],
  comptable: [
    {
      id: "co1",
      icon: ReceiptText,
      iconColor: "success",
      title: "Facture SMD-FAC-0042 payée",
      status: "Sonatel · 2 100 000 FCFA",
      h: 3,
    },
    {
      id: "co2",
      icon: Bell,
      iconColor: "warning",
      title: "Relance envoyée — Ambassade",
      status: "Mise en demeure · J+30",
      h: 7,
    },
    {
      id: "co3",
      icon: Upload,
      iconColor: "accent",
      title: "Export paie généré",
      status: "Fichier SICA-UEMOA · 52 virements",
      h: 26,
    },
  ],
  agent: [
    {
      id: "ag1",
      icon: Calendar,
      iconColor: "accent",
      title: "Prochaine vacation",
      status: "14:00 — Tour Cristal (Plateau)",
      h: 0.5,
    },
    {
      id: "ag2",
      icon: CheckCircle2,
      iconColor: "success",
      title: "Pointage validé — prise de poste",
      status: "Résidence Almadies · 06:00",
      h: 3,
    },
    {
      id: "ag3",
      icon: AlertTriangle,
      iconColor: "warning",
      title: "Main courante — ronde 04:00",
      status: "RAS · secteur B",
      h: 5,
    },
  ],
};

/**
 * Activité récente FILTRÉE PAR RÔLE (RBAC) : chaque rôle ne voit que son
 * périmètre. Aujourd'hui servi depuis des fixtures ; demain remplaçable par
 * un appel `lib/api` réel sans toucher aux dashboards.
 */
export function getRecentActivity(role: RoleId): ActivityItem[] {
  return FEEDS[role].map(({ h, ...rest }) => ({
    ...rest,
    timestamp: hoursAgo(h),
  }));
}
