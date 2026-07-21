"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/colors";
import { fetchPresenceMonth } from "@/lib/supabase/data/presence-jour";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Présences — synthèse mensuelle par agent (alimente le suivi et la paie). */
export function OpsPresences() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() }); // m: 0-11

  const from = `${ym.y}-${pad(ym.m + 1)}-01`;
  const to = `${ym.y}-${pad(ym.m + 1)}-${pad(new Date(ym.y, ym.m + 1, 0).getDate())}`;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["presence-month", from, to],
    queryFn: () => fetchPresenceMonth(from, to),
  });

  const totals = useMemo(() => {
    const present = rows.reduce((s, r) => s + r.present, 0);
    const retard = rows.reduce((s, r) => s + r.retard, 0);
    const nonSaisis = rows.filter((r) => r.joursSaisis === 0).length;
    const hsup = rows.reduce((s, r) => s + r.heuresSup, 0);
    return { present, retard, nonSaisis, hsup };
  }, [rows]);

  const shiftMonth = (n: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const stats: { label: string; value: string; tone: Tone }[] = [
    { label: "Effectif", value: String(rows.length), tone: "foreground" },
    { label: "Jours-présence", value: String(totals.present), tone: "success" },
    { label: "Retards", value: String(totals.retard), tone: "warning" },
    { label: "Non pointés", value: String(totals.nonSaisis), tone: "muted" },
  ];

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Présences du mois</h1>
          <div className="text-muted mt-0.5 text-[12px] font-semibold">Synthèse mensuelle par agent (pointages saisis)</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="outline" aria-label="Mois précédent" onClick={() => shiftMonth(-1)}><ChevronLeft className="size-4" /></Button>
          <span className="text-foreground min-w-[150px] text-center text-[12.5px] font-bold capitalize">{MONTHS[ym.m]} {ym.y}</span>
          <Button size="icon-sm" variant="outline" aria-label="Mois suivant" onClick={() => shiftMonth(1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-[15px] lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11px] font-semibold">{s.label}</div>
            <div className={cn("tnum mt-[5px] text-[20px] font-extrabold", toneText[s.tone])}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">Feuille de présence</div>
        {isLoading ? (
          <div className="text-muted flex items-center justify-center gap-2 py-12 text-[13px] font-semibold">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="Aucune donnée pour le moment" />
        ) : (
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-border border-b">
                {["Agent", "Site", "Présents", "Retards", "Absents", "Congés", "H. sup."].map((h, i) => (
                  <th key={h} className={cn("text-muted px-2 py-2 text-[10.5px] font-bold tracking-[0.4px] uppercase", i >= 2 ? "text-right" : "text-left")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agentId} className="border-border border-b last:border-0">
                  <td className="text-foreground px-2 py-2.5 text-[12.5px] font-bold">{r.agent}</td>
                  <td className="text-muted px-2 py-2.5 text-[12px] font-semibold">{r.poste}</td>
                  <td className="text-success tnum px-2 py-2.5 text-right text-[12.5px] font-bold">{r.present || "—"}</td>
                  <td className="text-warning tnum px-2 py-2.5 text-right text-[12.5px] font-bold">{r.retard || "—"}</td>
                  <td className="text-danger tnum px-2 py-2.5 text-right text-[12.5px] font-bold">{r.absent || "—"}</td>
                  <td className="text-accent tnum px-2 py-2.5 text-right text-[12.5px] font-bold">{r.conge || "—"}</td>
                  <td className="text-foreground tnum px-2 py-2.5 text-right text-[12.5px] font-bold">{r.heuresSup ? `${r.heuresSup} h` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </ScreenContainer>
  );
}
