"use client";

import { useMemo, useState } from "react";
import { Building2, TrendingUp, Wallet } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";
import { COMPANIES } from "@/lib/api/data";
import type { Plan } from "@/lib/api/types";
import { formatFCFA, formatFCFACompact, formatNumberFR } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLAN_ORDER: Plan[] = ["Starter", "Pro", "Enterprise"];

/** 9 modules plateforme, débloqués progressivement selon la formule. */
const MODULES = [
  "Finance",
  "Paie",
  "CRM",
  "Planning",
  "Supervision",
  "POS",
  "Maintenance",
  "Communication",
  "E-réputation",
] as const;

const PLAN_MODULE_COUNT: Record<Plan, number> = {
  Starter: 3,
  Pro: 6,
  Enterprise: 9,
};

const PLAN_BADGE: Record<Plan, { label: string; highlight: boolean }> = {
  Starter: { label: "3 modules", highlight: false },
  Pro: { label: "Populaire", highlight: true },
  Enterprise: { label: "9 modules", highlight: false },
};

function defaultModules(plan: Plan): boolean[] {
  const count = PLAN_MODULE_COUNT[plan];
  return MODULES.map((_, i) => i < count);
}

export function SuperadminAbonnements() {
  const totalMrr = useMemo(
    () => COMPANIES.reduce((sum, c) => sum + c.mrr, 0),
    [],
  );
  const activeCount = useMemo(
    () => COMPANIES.filter((c) => c.status === "actif").length,
    [],
  );
  const avgTicket = Math.round(totalMrr / COMPANIES.length);

  const planStats = useMemo(
    () =>
      PLAN_ORDER.map((plan) => {
        const list = COMPANIES.filter((c) => c.plan === plan);
        const mrr = list.reduce((sum, c) => sum + c.mrr, 0);
        const price = list.length > 0 ? mrr / list.length : 0;
        return { plan, count: list.length, price, mrr };
      }),
    [],
  );

  const [modules, setModules] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(COMPANIES.map((c) => [c.id, defaultModules(c.plan)])),
  );

  const toggleModule = (companyId: string, index: number) => {
    setModules((prev) => {
      const next = prev[companyId].map((on, i) => (i === index ? !on : on));
      return { ...prev, [companyId]: next };
    });
  };

  return (
    <ScreenContainer>
      {/* MRR summary KPIs */}
      <div className="mb-[15px] grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          tone="success"
          value={formatFCFACompact(totalMrr)}
          label="MRR mensuel"
          hint="Revenu récurrent total"
          trend={{ value: "+8,2 %", direction: "up" }}
        />
        <KpiCard
          icon={TrendingUp}
          tone="accent"
          value={formatFCFACompact(totalMrr * 12)}
          label="ARR annualisé"
          hint="MRR × 12"
        />
        <KpiCard
          icon={Building2}
          tone="violet"
          value={String(activeCount)}
          label="Entreprises actives"
          hint={`${formatNumberFR(COMPANIES.length)} PME abonnées`}
        />
        <KpiCard
          icon={Wallet}
          tone="foreground"
          value={formatFCFACompact(avgTicket)}
          label="Panier moyen"
          hint="MRR moyen par entreprise"
        />
      </div>

      {/* Plan distribution */}
      <div className="mb-[15px] grid grid-cols-1 gap-4 sm:grid-cols-3">
        {planStats.map(({ plan, count, price, mrr }) => {
          const badge = PLAN_BADGE[plan];
          return (
            <Card
              key={plan}
              className={cn(
                "p-[18px_20px]",
                badge.highlight && "border-accent border-2",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-foreground text-[13px] font-extrabold">
                  {plan}
                </span>
                <StatusPill
                  variant={
                    plan === "Enterprise"
                      ? "violet"
                      : plan === "Pro"
                        ? "info"
                        : "neutral"
                  }
                  uppercase
                >
                  {badge.label}
                </StatusPill>
              </div>
              <div className="text-foreground mt-3 text-[24px] font-extrabold tracking-[-0.6px]">
                {formatNumberFR(price)}{" "}
                <span className="text-muted text-[11px] font-bold">
                  FCFA/mois
                </span>
              </div>
              <div className="text-muted mt-2 text-[11.5px] font-semibold">
                {formatNumberFR(count)} entreprise{count > 1 ? "s" : ""} abonnée
                {count > 1 ? "s" : ""}
              </div>
              <div className="text-success mt-1 text-[12px] font-bold">
                {formatFCFA(mrr)} MRR
              </div>
            </Card>
          );
        })}
      </div>

      {/* Per-company module activation */}
      <Card className="p-[18px_20px]">
        <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
          Activation des modules par entreprise
        </div>
        <div className="text-muted mt-1.5 mb-4 text-[12px] font-semibold">
          Contrôle d&apos;accès aux modules selon la formule souscrite (RBAC
          plateforme)
        </div>

        <div className="flex flex-col">
          {COMPANIES.map((company) => (
            <div
              key={company.id}
              className="border-border flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b py-3 last:border-0"
            >
              <div className="text-foreground min-w-[190px] flex-1 text-[12.5px] font-bold">
                {company.name} — {company.plan}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MODULES.map((label, i) => {
                  const active = modules[company.id][i];
                  return (
                    <button
                      key={label}
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={`${label} — ${company.name}`}
                      onClick={() => toggleModule(company.id, i)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-extrabold tracking-[0.3px] uppercase transition-colors",
                        active
                          ? "bg-success/12 text-success hover:bg-success/20"
                          : "border-border bg-surface2 text-muted hover:text-foreground border",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ScreenContainer>
  );
}
