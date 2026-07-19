"use client";

import { useQuery } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { FINANCIAL_KPIS, OPERATIONAL_KPIS } from "./dashboard-kpis";
import { fetchDashboardKpis } from "@/lib/supabase/data/dashboard";

export function DgDashboard() {
  // KPIs réels agrégés multi-domaines (RLS). Tant que la requête n'a pas
  // répondu, on affiche le squelette des cartes (structure sans valeurs).
  const { data: k } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: fetchDashboardKpis,
  });
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const financial = k
    ? FINANCIAL_KPIS.map((kpi, i) => {
        const vals = [
          fmt(k.caMois),
          String(k.tauxRecouvrement),
          fmt(k.masseSalariale),
          fmt(k.facturesRetard),
        ];
        const patched = { ...kpi, value: vals[i] ?? "—" };
        if (i === 1) patched.progress = { value: k.tauxRecouvrement, tone: "warning" };
        return patched;
      })
    : FINANCIAL_KPIS.map((kpi) => ({ ...kpi, value: "—" }));

  const operational = k
    ? OPERATIONAL_KPIS.map((kpi, i) => {
        const vals = [
          String(k.agentsService),
          String(k.contratsExpirant),
          String(k.ticketsOuverts),
          String(k.tachesRetard),
          String(k.stockSousSeuil),
          undefined,
          fmt(k.caBoutique),
          String(k.scoreSanteCrm),
        ];
        const v = vals[i];
        const patched = { ...kpi, value: v ?? "—" };
        if (i === 7) patched.progress = { value: k.scoreSanteCrm, tone: "violet" };
        return patched;
      })
    : OPERATIONAL_KPIS.map((kpi) => ({ ...kpi, value: "—" }));

  return (
    <ScreenContainer>
      {/* ── Santé financière (agrégats réels) ── */}
      <div className="text-muted mb-3.5 text-[11px] font-bold tracking-[0.7px]">
        SANTÉ FINANCIÈRE
      </div>
      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {financial.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Opérationnel (agrégats réels) ── */}
      <div className="text-muted mt-[18px] mb-3 text-[11px] font-bold tracking-[0.7px]">
        OPÉRATIONNEL
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {operational.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} compact />
        ))}
      </div>
    </ScreenContainer>
  );
}
