"use client";

import { useQuery } from "@tanstack/react-query";

import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchAttendance } from "@/lib/supabase/data/attendance";
import type { Attendance } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText } from "@/lib/colors";

type Status = Attendance["status"];

const STATUS_META: Record<Status, { variant: PillVariant; label: string }> = {
  present: { variant: "success", label: "Présent" },
  retard: { variant: "warning", label: "Retard" },
  absent: { variant: "danger", label: "Absent" },
};

interface StatCard {
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
}

export function OpsPresences() {
  // Présences réelles via Supabase (RLS ops).
  const attQuery = useQuery({ queryKey: ["attendance"], queryFn: fetchAttendance });
  const attendance = attQuery.data ?? [];
  const present = attendance.filter((a) => a.status === "present").length;
  const retard = attendance.filter((a) => a.status === "retard").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const rate =
    attendance.length > 0
      ? ((present + retard) / attendance.length) * 100
      : 0;

  const stats: StatCard[] = [
    {
      label: "Taux de présence",
      value: rate.toLocaleString("fr-FR", { maximumFractionDigits: 1 }),
      unit: "%",
      tone: "success",
    },
    { label: "Présents", value: String(present), tone: "foreground" },
    { label: "Retards", value: String(retard), tone: "warning" },
    { label: "Absents", value: String(absent), tone: "danger" },
  ];

  return (
    <ScreenContainer>
      {/* KPI row */}
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11px] font-semibold">
              {s.label}
            </div>
            <div
              className={`tnum mt-[5px] text-[20px] font-extrabold whitespace-nowrap ${toneText[s.tone]}`}
            >
              {s.value}
              {s.unit && (
                <span className="text-muted ml-1 text-[11px] font-bold">
                  {s.unit}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Attendance table */}
      <Card className="p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Présences du mois — Juin 2026
        </div>

        {/* Header */}
        <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
          <div className="flex-[1.4]">Agent</div>
          <div className="flex-1">Site</div>
          <div className="w-[90px] text-center">Arrivée</div>
          <div className="w-[90px] text-center">Départ</div>
          <div className="w-[110px] text-right">Statut</div>
        </div>

        {/* Rows */}
        {attendance.map((a, i) => {
          const meta = STATUS_META[a.status];
          return (
            <div
              key={a.id}
              className={`flex items-center gap-3.5 px-1 py-3 ${
                i < attendance.length - 1 ? "border-border border-b" : ""
              }`}
            >
              <div className="text-foreground flex-[1.4] truncate text-[12.5px] font-bold">
                {a.agent}
              </div>
              <div className="text-muted flex-1 truncate text-[12px] font-semibold">
                {a.site}
              </div>
              <div className="tnum text-foreground w-[90px] text-center text-[12px] font-bold">
                {a.checkIn ?? "—"}
              </div>
              <div className="tnum text-muted w-[90px] text-center text-[12px] font-semibold">
                {a.checkOut ?? "—"}
              </div>
              <div className="flex w-[110px] justify-end">
                <StatusPill variant={meta.variant} uppercase>
                  {meta.label}
                </StatusPill>
              </div>
            </div>
          );
        })}

        {attendance.length === 0 && (
          <EmptyState title="Aucune donnée pour le moment" />
        )}
      </Card>
    </ScreenContainer>
  );
}
