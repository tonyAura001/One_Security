"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  fetchPresenceJour,
  upsertPresence,
  type PresenceRow,
  type PresenceStatut,
} from "@/lib/supabase/data/presence-jour";

const STATUTS: { v: PresenceStatut; l: string }[] = [
  { v: "present", l: "Présent" },
  { v: "retard", l: "Retard" },
  { v: "absent", l: "Absent" },
  { v: "conge", l: "Congé" },
  { v: "repos", l: "Repos" },
];
const STATUT_TONE: Record<PresenceStatut, string> = {
  present: "text-success",
  retard: "text-warning",
  absent: "text-danger",
  conge: "text-accent",
  repos: "text-muted",
};

const field =
  "w-full rounded-[8px] border border-border bg-surface2 px-2 py-1.5 text-[12.5px] font-semibold text-foreground outline-none focus:border-accent/50";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const FR = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

export function OpsPointage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => iso(new Date()));
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["presence-jour", date],
    queryFn: () => fetchPresenceJour(date),
  });

  const [edits, setEdits] = useState<Record<string, PresenceRow>>({});
  useEffect(() => {
    setEdits(Object.fromEntries(rows.map((r) => [r.agentId, r])));
  }, [rows]);

  const list = rows.map((r) => edits[r.agentId] ?? r);
  const present = list.filter((r) => r.statut === "present").length;
  const retard = list.filter((r) => r.statut === "retard").length;
  const absent = list.filter((r) => r.statut === "absent").length;

  const setField = (id: string, patch: Partial<PresenceRow>) =>
    setEdits((e) => ({ ...e, [id]: { ...(e[id] as PresenceRow), ...patch } }));

  const saveRow = useMutation({
    mutationFn: (r: PresenceRow) =>
      upsertPresence({ agentId: r.agentId, date, statut: r.statut, arrivee: r.arrivee, depart: r.depart, heuresSup: r.heuresSup, notes: r.notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["presence-jour", date] }); toast.success("Ligne enregistrée"); },
    onError: () => toast.error("Enregistrement refusé (accès requis)."),
  });
  const saveAll = useMutation({
    mutationFn: async () => {
      for (const r of list) {
        await upsertPresence({ agentId: r.agentId, date, statut: r.statut, arrivee: r.arrivee, depart: r.depart, heuresSup: r.heuresSup, notes: r.notes });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["presence-jour", date] }); toast.success("Feuille de pointage enregistrée"); },
    onError: () => toast.error("Enregistrement refusé (accès requis)."),
  });

  const shiftDay = (n: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + n);
    setDate(iso(d));
  };

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Pointage journalier</h1>
          <div className="text-muted mt-0.5 text-[12px] font-semibold capitalize">{FR(date)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="outline" aria-label="Jour précédent" onClick={() => shiftDay(-1)}><ChevronLeft className="size-4" /></Button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, "w-[150px]")} />
          <Button size="icon-sm" variant="outline" aria-label="Jour suivant" onClick={() => shiftDay(1)}><ChevronRight className="size-4" /></Button>
          <Button size="sm" disabled={saveAll.isPending || list.length === 0} onClick={() => saveAll.mutate()}>
            <Save className="size-4" /> {saveAll.isPending ? "Enregistrement…" : "Tout enregistrer"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-3 gap-[15px]">
        <KpiBar label="Présents" value={present} bar="bg-success" tone="text-success" />
        <KpiBar label="Absents" value={absent} bar="bg-danger" tone="text-danger" />
        <KpiBar label="Retards" value={retard} bar="bg-warning" tone="text-warning" />
      </div>

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="text-muted flex items-center justify-center gap-2 py-16 text-[13px] font-semibold">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-surface2 border-border border-b">
                {["Agent", "Statut", "Arrivée", "Départ", "H. sup.", "Notes", ""].map((h, i) => (
                  <th key={h || i} className="text-muted px-3 py-2.5 text-left text-[10.5px] font-bold tracking-[0.4px] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.agentId} className={cn(i < list.length - 1 && "border-border border-b")}>
                  <td className="px-3 py-2">
                    <div className="text-foreground text-[12.5px] font-bold">{r.agent}</div>
                    <div className="text-muted text-[10.5px] font-semibold">{r.poste}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.statut}
                      onChange={(e) => setField(r.agentId, { statut: e.target.value as PresenceStatut })}
                      className={cn(field, "w-[110px] font-bold", STATUT_TONE[r.statut])}
                    >
                      {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="time" value={r.arrivee} disabled={r.statut === "absent" || r.statut === "conge" || r.statut === "repos"}
                      onChange={(e) => setField(r.agentId, { arrivee: e.target.value })} className={cn(field, "w-[110px] disabled:opacity-40")} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="time" value={r.depart} disabled={r.statut === "absent" || r.statut === "conge" || r.statut === "repos"}
                      onChange={(e) => setField(r.agentId, { depart: e.target.value })} className={cn(field, "w-[110px] disabled:opacity-40")} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} step={0.5} value={r.heuresSup}
                      onChange={(e) => setField(r.agentId, { heuresSup: Number(e.target.value) })} className={cn(field, "w-[70px]")} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={r.notes} placeholder="Remarque…" onChange={(e) => setField(r.agentId, { notes: e.target.value })} className={cn(field, "min-w-[180px]")} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Button size="icon-sm" variant="ghost" aria-label="Enregistrer la ligne" disabled={saveRow.isPending} onClick={() => saveRow.mutate(r)}>
                      <Save className={cn("size-4", r.saved ? "text-success" : "text-muted")} />
                    </Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="text-muted py-10 text-center text-[13px] font-semibold">Aucun agent.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </ScreenContainer>
  );
}

function KpiBar({ label, value, bar, tone }: { label: string; value: number; bar: string; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn("h-9 w-1.5 flex-none rounded-full", bar)} />
      <div>
        <div className="text-muted text-[11px] font-bold tracking-[0.4px] uppercase">{label}</div>
        <div className={cn("text-[22px] font-extrabold", tone)}>{value}</div>
      </div>
    </Card>
  );
}
