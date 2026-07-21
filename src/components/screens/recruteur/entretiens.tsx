"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, CheckCircle2, Clock, User } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import {
  fetchAgenda,
  updateEntretien,
  updateCandidatureStatut,
  type CandidatureStatut,
} from "@/lib/supabase/data/recrutement";
import type { Interview } from "@/lib/api/types";
import { NewEntretienDialog } from "./new-entretien-dialog";

const STATUT_META: Record<string, { variant: PillVariant; label: string }> = {
  planifie: { variant: "info", label: "Planifié" },
  realise: { variant: "success", label: "Réalisé" },
  annule: { variant: "danger", label: "Annulé" },
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function RecruteurEntretiens() {
  const qc = useQueryClient();
  const { data: interviews = [] } = useQuery({ queryKey: ["agenda"], queryFn: fetchAgenda });
  const [selId, setSelId] = useState<string | null>(null);
  const selected = interviews.find((i) => i.id === selId) ?? interviews[0] ?? null;

  const { today, weekEnd } = useMemo(
    () => ({ today: iso(new Date()), weekEnd: iso(new Date(Date.now() + 7 * 86400000)) }),
    [],
  );
  const aVenir = interviews.filter((i) => i.date >= today && i.statut !== "realise" && i.statut !== "annule");
  const passes = interviews.filter((i) => i.date < today || i.statut === "realise" || i.statut === "annule");
  const cetteSemaine = aVenir.filter((i) => i.date <= weekEnd).length;
  const realises = interviews.filter((i) => i.statut === "realise").length;

  const decision = useMutation({
    mutationFn: (v: { candidatureId: string; statut: CandidatureStatut }) => updateCandidatureStatut(v.candidatureId, v.statut),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["pipeline-candidatures"] });
      toast.success(v.statut === "embauche" ? "Candidat·e retenu·e (embauche)" : "Candidat·e écarté·e");
    },
    onError: () => toast.error("Accès refusé pour modifier cette candidature."),
  });

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted text-[12px] font-bold">
          {interviews.length} entretien{interviews.length !== 1 ? "s" : ""} · agenda recrutement
        </span>
        <NewEntretienDialog />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-[15px]">
        <Kpi icon={CalendarClock} tone="accent" value={aVenir.length} label="À venir" />
        <Kpi icon={CalendarDays} tone="warning" value={cetteSemaine} label="Cette semaine" />
        <Kpi icon={CheckCircle2} tone="success" value={realises} label="Réalisés" />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-[18px_20px]">
          {interviews.length === 0 ? (
            <EmptyState title="Aucun entretien planifié" description="Planifiez un entretien pour une candidature." />
          ) : (
            <div className="flex flex-col gap-4">
              <Group title="À venir" items={aVenir} selId={selected?.id} onSelect={setSelId} empty="Aucun entretien à venir." />
              <Group title="Passés" items={passes} selId={selected?.id} onSelect={setSelId} empty="Aucun entretien passé." />
            </div>
          )}
        </Card>

        {selected && (
          <DetailPanel key={selected.id} it={selected} decisionPending={decision.isPending}
            onDecision={(statut) => selected.candidatureId && decision.mutate({ candidatureId: selected.candidatureId, statut })} />
        )}
      </div>
    </ScreenContainer>
  );
}

function Group({ title, items, selId, onSelect, empty }: { title: string; items: Interview[]; selId?: string; onSelect: (id: string) => void; empty: string }) {
  return (
    <div>
      <div className="text-muted mb-2 text-[10.5px] font-bold tracking-[0.5px] uppercase">{title} · {items.length}</div>
      {items.length === 0 ? (
        <div className="text-muted text-[12px] font-semibold">{empty}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => {
            const active = it.id === selId;
            const m = STATUT_META[it.statut ?? "planifie"];
            return (
              <button key={it.id} type="button" onClick={() => onSelect(it.id)}
                className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors", active ? "border-accent bg-active" : "border-border bg-surface2 hover:bg-active")}>
                <div className="bg-active flex size-11 flex-none flex-col items-center justify-center rounded-[11px]">
                  <span className="text-accent text-[14px] leading-none font-extrabold">{formatDateFR(it.date, "dd")}</span>
                  <span className="text-accent text-[8px] font-bold">{formatDateFR(it.date, "MMM").replace(".", "").toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-[13px] font-bold">{it.candidate}</div>
                  <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">{it.role} · {it.time} · {it.interviewer}</div>
                </div>
                <StatusPill variant={m.variant} uppercase>{m.label}</StatusPill>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ it, onDecision, decisionPending }: { it: Interview; onDecision: (s: CandidatureStatut) => void; decisionPending: boolean }) {
  const qc = useQueryClient();
  const [cr, setCr] = useState(it.compteRendu ?? "");
  useEffect(() => setCr(it.compteRendu ?? ""), [it]);

  const mark = useMutation({
    mutationFn: (statut: "realise" | "annule") => updateEntretien(it.id, { statut }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success("Entretien mis à jour"); },
    onError: () => toast.error("Accès refusé."),
  });
  const saveCr = useMutation({
    mutationFn: () => updateEntretien(it.id, { compteRendu: cr }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda"] }); toast.success("Compte-rendu enregistré"); },
    onError: () => toast.error("Accès refusé."),
  });

  return (
    <Card className="p-[18px_20px]">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">Entretien</div>
        <StatusPill variant={STATUT_META[it.statut ?? "planifie"].variant} uppercase>{STATUT_META[it.statut ?? "planifie"].label}</StatusPill>
      </div>
      <div className="flex flex-col gap-2.5">
        <Line icon={User} label="Candidat" value={it.candidate} />
        <Line icon={User} label="Poste" value={it.role} />
        <Line icon={CalendarClock} label="Date" value={`${formatDateFR(it.date)} · ${it.time}`} />
        <Line icon={User} label="Recruteur" value={it.interviewer} />
        <Line icon={Clock} label="Mode" value={it.mode === "présentiel" ? "Présentiel" : "Téléphone"} />
      </div>

      {it.statut !== "realise" && it.statut !== "annule" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" disabled={mark.isPending} onClick={() => mark.mutate("realise")}>
            <CheckCircle2 className="size-3.5" /> Marquer réalisé
          </Button>
          <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate("annule")}>Annuler</Button>
        </div>
      )}

      <div className="mt-4">
        <div className="text-muted mb-1 text-[11px] font-bold tracking-[0.4px] uppercase">Compte-rendu</div>
        <textarea value={cr} onChange={(e) => setCr(e.target.value)} placeholder="Impressions, points forts, réserves…"
          className="border-border bg-surface2 text-foreground focus:border-accent/50 min-h-[80px] w-full resize-y rounded-[10px] border px-3 py-2 text-[12.5px] font-medium outline-none" />
        <Button size="xs" variant="outline" className="mt-1.5" disabled={saveCr.isPending} onClick={() => saveCr.mutate()}>
          {saveCr.isPending ? "…" : "Enregistrer le compte-rendu"}
        </Button>
      </div>

      <div className="border-border mt-4 border-t pt-3.5">
        <p className="text-muted mb-3 text-[12px] font-semibold">Décision sur la candidature :</p>
        <div className="flex gap-2.5">
          <Button className="bg-success flex-1 text-white hover:brightness-110" disabled={decisionPending || !it.candidatureId} onClick={() => onDecision("embauche")}>Retenir</Button>
          <Button variant="outline" className="flex-1" disabled={decisionPending || !it.candidatureId} onClick={() => onDecision("refuse")}>Écarter</Button>
        </div>
      </div>
    </Card>
  );
}

function Line({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted inline-flex items-center gap-2 text-[12px] font-bold"><Icon className="size-3.5" strokeWidth={1.9} />{label}</span>
      <span className="text-foreground truncate text-[12.5px] font-bold">{value}</span>
    </div>
  );
}

function Kpi({ icon: Icon, tone, value, label }: { icon: typeof User; tone: "accent" | "warning" | "success"; value: number; label: string }) {
  const cls = { accent: "bg-accent/14 text-accent", warning: "bg-warning/14 text-warning", success: "bg-success/14 text-success" }[tone];
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn("flex size-10 flex-none items-center justify-center rounded-[12px]", cls)}><Icon className="size-5" strokeWidth={1.8} /></span>
      <div>
        <div className="text-foreground text-[22px] font-extrabold">{value}</div>
        <div className="text-muted text-[11px] font-semibold">{label}</div>
      </div>
    </Card>
  );
}
