"use client";

import { Card } from "@/aurantir-front-kit";
import { formatRelativeTime } from "@/aurantir-front-kit/lib/utils";
import type { ActivityColor, ActivityItem } from "@/lib/api/activity";

const ICON_COLOR: Record<ActivityColor, string> = {
  accent: "text-blue",
  success: "text-green",
  warning: "text-amber",
  danger: "text-red",
  violet: "text-violet",
};

/**
 * « Activité récente » — reprend à l'identique le motif du kit Aurantir
 * (DashboardClient) : carte du kit, en-tête + « ● En direct », lignes
 * icône colorée · titre + statut · horodatage relatif à droite.
 */
export function ActivityFeed({
  items,
  liveLabel = true,
}: {
  items: ActivityItem[];
  liveLabel?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-text-primary text-sm font-semibold">
          Activité récente
        </h3>
        {liveLabel && (
          <div className="flex items-center gap-1">
            <span className="bg-green h-1.5 w-1.5 animate-pulse rounded-full" />
            <span className="text-2xs text-text-muted">En direct</span>
          </div>
        )}
      </div>
      <ul className="space-y-1">
        {items.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-2xs text-text-muted">Aucune activité récente</p>
          </li>
        ) : (
          items.map((a) => {
            const Icon = a.icon;
            return (
              <li
                key={a.id}
                className="hover:bg-surface-hover/50 -mx-1 flex items-center gap-3 rounded px-1 py-1.5 transition-colors"
              >
                <div className={`flex-shrink-0 ${ICON_COLOR[a.iconColor]}`}>
                  <Icon size={16} strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary truncate text-xs font-medium">
                    {a.title}
                  </p>
                  <p className="text-2xs text-text-muted truncate">
                    {a.status}
                  </p>
                </div>
                <span
                  className="text-2xs text-text-muted flex-shrink-0"
                  suppressHydrationWarning
                >
                  {formatRelativeTime(a.timestamp)}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}
