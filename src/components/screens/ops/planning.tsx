"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchShifts, createShift, deleteShift } from "@/lib/supabase/data/planning";
import { fetchAgents } from "@/lib/supabase/data/agents";
import type { Shift, ShiftType } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText, toneTint } from "@/lib/colors";

const SHIFT_META: Record<ShiftType, { tone: Tone; label: string; code: string }> = {
  jour: { tone: "warning", label: "Jour", code: "J" },
  nuit: { tone: "violet", label: "Nuit", code: "N" },
  renfort: { tone: "accent", label: "Renfort", code: "R+" },
  repos: { tone: "muted", label: "Repos", code: "R" },
  rtt: { tone: "muted", label: "RTT", code: "RTT" },
  conge: { tone: "success", label: "Congé", code: "C" },
  maladie: { tone: "danger", label: "Maladie", code: "M" },
  formation: { tone: "accent", label: "Formation", code: "F" },
};
const SHIFT_ORDER: ShiftType[] = ["jour", "nuit", "renfort", "repos", "rtt", "conge", "maladie", "formation"];

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const AVATAR_TONES: Tone[] = ["accent", "success", "violet", "warning", "danger"];

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}
const FR_MONTH = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const cellKey = (agentId: string, date: string) => `${agentId}|${date}`;

export function OpsPlanning() {
  const qc = useQueryClient();
  const [site, setSite] = useState("all");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [openCell, setOpenCell] = useState<string | null>(null);

  const { data: shiftData } = useQuery({ queryKey: ["shifts"], queryFn: fetchShifts });
  const agentsQ = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const shifts = shiftData ?? [];
  const roster = agentsQ.data ?? [];

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }),
    [weekStart],
  );
  const weekDates = new Set(days.map(iso));

  const siteOptions = Array.from(new Set(roster.map((a) => a.site))).sort();
  const agents = (site === "all" ? roster : roster.filter((a) => a.site === site));

  // Index : agent (par nom, comme renvoyé par fetchShifts) + date → shift.
  const shiftIndex = new Map<string, Shift>();
  for (const s of shifts) {
    if (s.date && weekDates.has(s.date)) shiftIndex.set(`${s.agent}|${s.date}`, s);
  }

  const assign = useMutation({
    mutationFn: (v: { agentId: string; date: string; type: ShiftType }) =>
      createShift({ agentId: v.agentId, date: v.date, type: v.type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Vacation affectée");
    },
    onError: (e: unknown) =>
      toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (DG/RP/Manager/Contrôleur)." : "Échec de l'affectation."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Vacation retirée");
    },
    onError: () => toast.error("Suppression refusée (accès requis)."),
  });

  const label = `${days[0].getDate()} ${FR_MONTH[days[0].getMonth()]} — ${days[6].getDate()} ${FR_MONTH[days[6].getMonth()]} ${days[6].getFullYear()}`;
  const shiftWeek = (n: number) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + n * 7);
    setWeekStart(d);
    setOpenCell(null);
  };

  return (
    <ScreenContainer>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Planning des agents</h1>
          <div className="text-muted mt-0.5 text-[12px] font-semibold">Grille hebdomadaire — cliquez une case pour affecter</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="outline" aria-label="Semaine précédente" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-foreground min-w-[190px] text-center text-[12.5px] font-bold">{label}</span>
          <Button size="icon-sm" variant="outline" aria-label="Semaine suivante" onClick={() => shiftWeek(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setWeekStart(mondayOf(new Date())); setOpenCell(null); }}>
            Aujourd&apos;hui
          </Button>
        </div>
      </div>

      {/* Filtre site + légende */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <label className="text-muted flex items-center gap-2 text-[12px] font-bold">
          Site
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="border-border bg-surface text-foreground focus-visible:border-accent rounded-[10px] border px-3 py-2 text-[12px] font-bold outline-none"
          >
            <option value="all">Tous les sites</option>
            {siteOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2.5">
          {SHIFT_ORDER.map((t) => (
            <span key={t} className="text-muted inline-flex items-center gap-1.5 text-[11px] font-bold">
              <span className={cn("flex size-[15px] items-center justify-center rounded-[4px] text-[8px] font-black", toneTint[SHIFT_META[t].tone], toneText[SHIFT_META[t].tone])}>
                {SHIFT_META[t].code}
              </span>
              {SHIFT_META[t].label}
            </span>
          ))}
        </div>
      </div>

      {agents.length === 0 ? (
        <Card className="p-4">
          <EmptyState icon={CalendarOff} title="Aucun agent pour le moment" description="Les agents et leurs vacations apparaîtront ici." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-4">
          <div className="grid min-w-[840px] [grid-template-columns:200px_repeat(7,minmax(84px,1fr))] gap-2">
            <div className="text-muted flex items-end pb-1.5 text-[10.5px] font-bold tracking-[0.4px]">AGENT</div>
            {days.map((d, i) => {
              const today = iso(d) === iso(new Date());
              return (
                <div key={i} className={cn("pb-1.5 text-center text-[11px] font-bold", today ? "text-accent" : "text-muted")}>
                  {DAY_LABELS[i]}<br />
                  <span className="text-[13px] font-extrabold">{d.getDate()}</span>
                </div>
              );
            })}

            {agents.map((agent, i) => (
              <div key={agent.id} className="contents">
                <div className="text-foreground flex items-center gap-2.5 text-[12.5px] font-bold">
                  <span className={cn("flex size-8 flex-none items-center justify-center rounded-lg text-[10px] font-extrabold", toneTint[AVATAR_TONES[i % AVATAR_TONES.length]], toneText[AVATAR_TONES[i % AVATAR_TONES.length]])}>
                    {initials(agent.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate">{agent.name}</div>
                    <div className="text-muted truncate text-[10.5px] font-semibold">{agent.site}</div>
                  </div>
                </div>
                {days.map((d) => {
                  const date = iso(d);
                  const shift = shiftIndex.get(`${agent.name}|${date}`);
                  const key = cellKey(agent.id, date);
                  if (shift) {
                    const m = SHIFT_META[shift.type];
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => remove.mutate(shift.id)}
                        title={`${m.label} — cliquer pour retirer`}
                        className={cn("group relative rounded-lg py-2.5 text-center text-[11px] font-extrabold transition-opacity", toneTint[m.tone], toneText[m.tone])}
                      >
                        {m.label}
                        <X className="absolute top-1 right-1 size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  }
                  return (
                    <div key={date} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenCell(openCell === key ? null : key)}
                        className="border-border text-muted hover:border-accent hover:text-accent w-full rounded-lg border border-dashed py-2.5 text-center text-[13px] font-bold transition-colors"
                      >
                        +
                      </button>
                      {openCell === key && (
                        <AssignMenu
                          onPick={(type) => { assign.mutate({ agentId: agent.id, date, type }); setOpenCell(null); }}
                          onClose={() => setOpenCell(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}
    </ScreenContainer>
  );
}

function AssignMenu({ onPick, onClose }: { onPick: (t: ShiftType) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="border-border bg-surface absolute top-full left-1/2 z-50 mt-1 grid w-[160px] -translate-x-1/2 grid-cols-2 gap-1 rounded-xl border p-1.5 shadow-[var(--shadow-dropdown)]">
        {SHIFT_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            className={cn("rounded-lg py-1.5 text-center text-[11px] font-extrabold transition-transform hover:scale-105", toneTint[SHIFT_META[t].tone], toneText[SHIFT_META[t].tone])}
          >
            {SHIFT_META[t].label}
          </button>
        ))}
      </div>
    </>
  );
}
