import type { ProjectStatut } from "@/lib/supabase/data/projets";

/** Libellé + variante de pastille par statut de déploiement. */
export const STATUT_META: Record<
  ProjectStatut,
  { label: string; variant: "info" | "danger" | "success" | "warning" | "neutral" }
> = {
  planifie: { label: "Planifié", variant: "warning" },
  en_cours: { label: "En cours", variant: "info" },
  a_risque: { label: "À risque", variant: "danger" },
  en_avance: { label: "En avance", variant: "success" },
  termine: { label: "Terminé", variant: "neutral" },
};
