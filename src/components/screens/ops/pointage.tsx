"use client";

import { useQuery } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import { ATTENDANCE } from "@/lib/api/data";
import { fetchAttendance } from "@/lib/supabase/data/attendance";
import type { Attendance } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Status = Attendance["status"];

const STATUS_META: Record<Status, { variant: PillVariant; label: string }> = {
  present: { variant: "success", label: "Présent" },
  retard: { variant: "warning", label: "Retard" },
  absent: { variant: "danger", label: "Absent" },
};

const ALL = "__all__";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function OpsPointage() {
  // Présences réelles via Supabase (RLS ops) ; repli démo si accès refusé.
  const attQuery = useQuery({ queryKey: ["attendance"], queryFn: fetchAttendance });
  const attendance = attQuery.isSuccess && attQuery.data.length > 0 ? attQuery.data : ATTENDANCE;
  const [site, setSite] = useState<string>(ALL);

  const sites = useMemo(() => [...new Set(attendance.map((a) => a.site))], []);

  const filtered =
    site === ALL ? attendance : attendance.filter((a) => a.site === site);

  const grouped = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    for (const a of filtered) {
      const list = map.get(a.site) ?? [];
      list.push(a);
      map.set(a.site, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <ScreenContainer>
      {/* Site filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill
          active={site === ALL}
          onClick={() => setSite(ALL)}
          label="Tous les sites"
        />
        {sites.map((s) => (
          <FilterPill
            key={s}
            active={site === s}
            onClick={() => setSite(s)}
            label={s}
          />
        ))}
        <span className="text-muted ml-auto self-center text-[12px] font-semibold">
          Pointage du {formatDateFR("2026-07-03")}
        </span>
      </div>

      {/* Per-site board */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {grouped.map(([siteName, agents]) => {
          const presentCount = agents.filter(
            (a) => a.status === "present",
          ).length;
          const lateCount = agents.filter((a) => a.status === "retard").length;
          return (
            <Card key={siteName} className="p-[18px_20px]">
              <div className="mb-3.5 flex items-center gap-2">
                <Shield
                  className="text-accent size-4"
                  strokeWidth={1.7}
                  aria-hidden
                />
                <div className="text-foreground truncate text-[14px] font-extrabold">
                  {siteName}
                </div>
                <span
                  className={cn(
                    "ml-auto text-[11px] font-bold whitespace-nowrap",
                    lateCount > 0 ? "text-warning" : "text-success",
                  )}
                >
                  {lateCount > 0
                    ? `${lateCount} retard${lateCount > 1 ? "s" : ""}`
                    : `${presentCount}/${agents.length} présents`}
                </span>
              </div>

              {agents.map((a, i) => {
                const meta = STATUS_META[a.status];
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center gap-3 py-2.5",
                      i < agents.length - 1 && "border-border border-b",
                    )}
                  >
                    <div className="bg-accent/14 text-accent flex size-[30px] flex-none items-center justify-center rounded-lg text-[10px] font-extrabold">
                      {initials(a.agent)}
                    </div>
                    <span className="text-foreground flex-1 truncate text-[12.5px] font-bold">
                      {a.agent}
                    </span>
                    <span
                      className={cn(
                        "tnum text-[11px] font-semibold",
                        a.status === "retard" ? "text-warning" : "text-muted",
                      )}
                    >
                      {a.checkIn ?? "—"}
                    </span>
                    <StatusPill variant={meta.variant} uppercase>
                      {meta.label}
                    </StatusPill>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.success(`Pointage enregistré — ${a.agent}`)
                      }
                    >
                      Pointer
                    </Button>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </ScreenContainer>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[12px] font-bold transition-colors",
        active
          ? "bg-accent border-transparent text-white"
          : "border-border bg-surface text-muted hover:bg-hover",
      )}
    >
      {label}
    </button>
  );
}
