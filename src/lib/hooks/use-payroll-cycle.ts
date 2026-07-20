"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchCyclePaie,
  avancerCyclePaie,
  currentPeriode,
  type PayrollStage,
} from "@/lib/supabase/data/cycle-paie";

/**
 * État partagé du circuit de paie (persisté en base), utilisé par les écrans
 * pré-paie / soumission / validation présences / paie.
 */
export function usePayrollCycle() {
  const qc = useQueryClient();
  const periode = currentPeriode();

  const { data } = useQuery({
    queryKey: ["cycle-paie", periode],
    queryFn: () => fetchCyclePaie(periode),
  });
  const stage: PayrollStage = data?.statut ?? "brouillon";

  const advance = useMutation({
    mutationFn: () => avancerCyclePaie(periode),
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["cycle-paie", periode] });
      const label: Record<PayrollStage, string> = {
        brouillon: "Brouillon",
        soumis: "Paie soumise",
        valide: "Présences validées",
        approuve: "Paie approuvée",
      };
      toast.success(label[next] ?? "Cycle mis à jour");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /accès refusé|42501|row-level/i.test(msg) ? msg.replace(/.*accès refusé/i, "Accès refusé") : `Échec : ${msg}`,
      );
    },
  });

  return { periode, stage, advance, isPending: advance.isPending };
}
