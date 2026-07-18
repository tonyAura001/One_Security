"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SiteProfitabilityCard } from "@/components/finance/site-profitability-card";
import { useSession } from "@/lib/store/session";
import { getSiteProfitability, consolidate } from "@/lib/api/profitability";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

function TotalStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div>
      <div className="text-muted text-[11px] font-bold tracking-[0.4px] uppercase">
        {label}
      </div>
      <div
        className={cn(
          "tnum mt-1 text-[19px] leading-none font-extrabold tracking-[-0.5px]",
          tone === "success" ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function RentabiliteScreen() {
  const { role } = useSession();
  const sites = useMemo(() => getSiteProfitability(role), [role]);
  const total = useMemo(() => consolidate(sites), [sites]);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rentabilité par site</h1>
          <p className="page-subtitle">
            Marge nette par site gardé · juin 2026
          </p>
        </div>
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Aucun site à analyser"
          description="Les sites gardés apparaîtront ici une fois facturés."
        />
      ) : (
        <>
          {/* Total consolidé */}
          <Card className="border-accent/25 mt-4 p-[18px_20px]">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="text-accent size-4" />
              <span className="text-foreground text-[13px] font-extrabold tracking-[-0.2px]">
                Consolidé — {total.nbSites} sites
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <TotalStat
                label="Revenu total"
                value={formatFCFA(total.revenuMensuel)}
              />
              <TotalStat
                label="Masse salariale"
                value={formatFCFA(total.masseSalariale)}
              />
              <TotalStat
                label="Frais opérationnels"
                value={formatFCFA(total.fraisOperationnels)}
              />
              <TotalStat
                label={`Marge nette · ${total.margePct.toFixed(1).replace(".", ",")} %`}
                value={formatFCFA(total.margeNette)}
                tone="success"
              />
            </div>
          </Card>

          {/* Une carte par site */}
          <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <SiteProfitabilityCard key={s.siteId} data={s} />
            ))}
          </div>
        </>
      )}
    </ScreenContainer>
  );
}
