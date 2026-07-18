import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SiteProfitability } from "@/lib/api/profitability";

/** « X,Y % » à la française. */
function pct(n: number): string {
  return `${n.toFixed(1).replace(".", ",")} %`;
}

/** Ligne de coût détaillé (montant soustrait). */
function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted font-semibold">{label}</span>
      <span className="text-foreground tnum font-bold">
        − {formatFCFA(value)}
      </span>
    </div>
  );
}

/**
 * Carte de rentabilité (P&L) d'un site gardé. Reçoit ses données en props ;
 * la marge nette et la marge % sont déjà calculées côté `lib/api`.
 */
export function SiteProfitabilityCard({ data }: { data: SiteProfitability }) {
  const positif = data.margeNette >= 0;
  const up = data.tendancePct >= 0;

  return (
    <Card className="flex flex-col gap-3 p-[18px_20px]">
      {/* En-tête : site + tendance */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="bg-active text-accent flex size-8 flex-none items-center justify-center rounded-[10px]">
            <MapPin className="size-4" strokeWidth={2} />
          </span>
          <span className="text-foreground truncate text-[14px] font-extrabold tracking-[-0.2px]">
            {data.siteName}
          </span>
        </div>
        <StatusPill variant={up ? "success" : "danger"}>
          {up ? (
            <ChevronUp className="size-3" strokeWidth={2.8} />
          ) : (
            <ChevronDown className="size-3" strokeWidth={2.8} />
          )}
          {Math.abs(data.tendancePct).toFixed(1).replace(".", ",")} %
        </StatusPill>
      </div>

      {/* Revenu mensuel */}
      <div>
        <div className="text-muted text-[11px] font-bold tracking-[0.4px] uppercase">
          Revenu mensuel
        </div>
        <div className="text-foreground tnum mt-0.5 text-[20px] leading-none font-extrabold tracking-[-0.5px]">
          {formatFCFA(data.revenuMensuel)}
        </div>
      </div>

      {/* Détail des coûts */}
      <div className="border-border flex flex-col gap-1.5 border-t pt-2.5">
        <CostRow label="Masse salariale" value={data.masseSalariale} />
        <CostRow label="Frais opérationnels" value={data.fraisOperationnels} />
      </div>

      {/* Marge nette */}
      <div className="border-border border-t pt-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-muted text-[11px] font-bold tracking-[0.4px] uppercase">
            Marge nette
          </span>
          <span
            className={cn(
              "text-[12.5px] font-extrabold",
              positif ? "text-success" : "text-danger",
            )}
          >
            {pct(data.margePct)}
          </span>
        </div>
        <div
          className={cn(
            "tnum mt-0.5 text-[19px] leading-none font-extrabold tracking-[-0.4px]",
            positif ? "text-success" : "text-danger",
          )}
        >
          {formatFCFA(data.margeNette)}
        </div>
        <ProgressBar
          value={Math.max(0, Math.min(100, data.margePct))}
          tone={positif ? "success" : "danger"}
          height={6}
          className="mt-2"
        />
      </div>
    </Card>
  );
}
