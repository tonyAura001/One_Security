"use client";

import { useMemo, useState } from "react";
import { Building2, Check, FileText, Info, Send, User, X } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card, Button, Badge } from "@/aurantir-front-kit";
import { formatRelativeTime } from "@/aurantir-front-kit/lib/utils";
import {
  useDecisionsStore,
  CATEGORY_META,
  type Decision,
  type DecisionCategory,
} from "@/lib/store/decisions";
import { usePayrollStore } from "@/lib/store/payroll";
import { formatFCFA } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type TabKey = "toutes" | DecisionCategory;
const TABS: [TabKey, string][] = [
  ["toutes", "Toutes"],
  ["financiere", "Financières"],
  ["rh", "RH"],
  ["contrat", "Contrats"],
  ["operationnelle", "Opérationnelles"],
];

export function DecisionScreen() {
  const { decisions, validate, refuse, requestInfo, resolvedBase } =
    useDecisionsStore();
  const approvePayroll = usePayrollStore((s) => s.approve);
  const [tab, setTab] = useState<TabKey>("toutes");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pending = decisions.filter((d) => d.status === "en_attente");
  const urgent = pending.filter((d) => d.priority === "urgente").length;
  const resolved =
    resolvedBase + decisions.filter((d) => d.status !== "en_attente").length;

  const list = useMemo(
    () => pending.filter((d) => tab === "toutes" || d.category === tab),
    [pending, tab],
  );

  const selected =
    decisions.find((d) => d.id === selectedId && d.status === "en_attente") ??
    list[0] ??
    null;

  function onValidate(d: Decision) {
    validate(d.id);
    if (d.id === "d-paie") approvePayroll();
    toast.success("Décision validée", d.title);
    setSelectedId(null);
  }
  function onRefuse(d: Decision) {
    refuse(d.id);
    toast.error("Décision refusée", d.title);
    setSelectedId(null);
  }

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Centre de Décision</h1>
          <p className="page-subtitle">
            {pending.length} en attente · {urgent} urgentes · {resolved}{" "}
            résolues ce mois
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div
        role="tablist"
        aria-label="Catégories de décisions"
        className="border-surface-border mt-4 flex flex-wrap items-center gap-1 border-b"
      >
        {TABS.map(([v, l]) => (
          <button
            key={v}
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === v
                ? "border-blue text-text-primary"
                : "text-text-muted hover:text-text-primary border-transparent",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Liste des décisions en attente */}
        <div className="space-y-3">
          {list.length === 0 ? (
            <Card>
              <div className="text-text-muted flex flex-col items-center py-10 text-center">
                <Check className="text-green mb-2 size-7" />
                <p className="text-sm">Aucune décision en attente</p>
              </div>
            </Card>
          ) : (
            list.map((d) => {
              const cat = CATEGORY_META[d.category];
              const active = selected?.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    "border-surface-border bg-surface w-full rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-blue/40 ring-blue/20 ring-1"
                      : "hover:border-surface-border-hover",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={d.priority === "urgente" ? "red" : "amber"}>
                      {d.priority === "urgente" ? "Urgente" : "Normale"}
                    </Badge>
                    <Badge
                      variant={
                        cat.variant === "info"
                          ? "blue"
                          : cat.variant === "success"
                            ? "green"
                            : cat.variant === "violet"
                              ? "violet"
                              : "amber"
                      }
                    >
                      {cat.label}
                    </Badge>
                  </div>
                  <p className="text-text-primary mt-2 text-sm font-semibold">
                    {d.title}
                  </p>
                  <p className="text-text-muted mt-0.5 flex items-center gap-1.5 text-xs">
                    <Building2 size={12} /> {d.entity}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className="text-text-muted text-2xs"
                      suppressHydrationWarning
                    >
                      {d.requester} · {formatRelativeTime(d.requestedAt)}
                    </span>
                    {d.amount != null && (
                      <span className="text-text-primary text-xs font-bold">
                        {formatFCFA(d.amount)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Panneau détail */}
        {selected ? (
          <Card className="lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selected.priority === "urgente" ? "red" : "amber"}
                    dot
                  >
                    {selected.priority === "urgente" ? "Urgente" : "Normale"}
                  </Badge>
                  <Badge variant="blue">
                    {CATEGORY_META[selected.category].label}
                  </Badge>
                </div>
                <h2 className="text-text-primary mt-2 text-lg font-semibold">
                  {selected.title}
                </h2>
              </div>
              {selected.amount != null && (
                <div className="text-right">
                  <p className="text-2xs text-text-muted">Montant</p>
                  <p className="text-text-primary text-lg font-bold">
                    {formatFCFA(selected.amount)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Meta
                icon={<User size={13} />}
                label="Demandeur"
                value={selected.requester}
              />
              <Meta
                icon={<Building2 size={13} />}
                label="Entité"
                value={selected.entity}
              />
            </div>

            <div className="mt-4">
              <p className="text-text-muted mb-1 text-xs font-medium">
                Contexte
              </p>
              <p className="text-text-secondary text-sm leading-relaxed">
                {selected.context}
              </p>
            </div>

            {selected.attachment && (
              <div className="border-surface-border bg-background-elevated mt-4 flex items-center gap-3 rounded-lg border p-3">
                <div className="bg-red/10 text-red flex size-9 items-center justify-center rounded-lg">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary truncate text-xs font-medium">
                    {selected.attachment}
                  </p>
                  <p className="text-2xs text-text-muted">
                    Aperçu du justificatif
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toast.info("Aperçu PDF", "Fonction de démonstration")
                  }
                >
                  Ouvrir
                </Button>
              </div>
            )}

            {/* Historique */}
            <div className="mt-5">
              <p className="text-text-muted mb-2 text-xs font-medium">
                Historique
              </p>
              <ol className="space-y-2.5">
                {selected.history.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 size-2.5 flex-shrink-0 rounded-full",
                        h.done ? "bg-green" : "border-text-muted border-2",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary text-xs">{h.label}</p>
                      <p
                        className="text-2xs text-text-muted"
                        suppressHydrationWarning
                      >
                        {formatRelativeTime(h.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="border-surface-border mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
              <Button
                icon={<Check size={15} />}
                onClick={() => onValidate(selected)}
                className="flex-1"
              >
                Valider la décision
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<X size={14} />}
                onClick={() => onRefuse(selected)}
              >
                Refuser
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Info size={14} />}
                onClick={() => {
                  requestInfo(selected.id);
                  toast.info("Complément demandé", selected.requester);
                }}
              >
                Info
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Send size={14} />}
                onClick={() =>
                  toast.info("Décision déléguée", "Fonction de démonstration")
                }
              >
                Déléguer
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-text-muted flex flex-col items-center py-16 text-center">
              <Check className="text-green mb-3 size-8" />
              <p className="text-sm">Toutes les décisions sont traitées</p>
            </div>
          </Card>
        )}
      </div>
    </ScreenContainer>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-surface-border bg-background-elevated rounded-lg border p-2.5">
      <p className="text-2xs text-text-muted flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-text-primary mt-0.5 text-xs font-medium">{value}</p>
    </div>
  );
}
