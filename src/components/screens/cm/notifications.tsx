"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CalendarClock, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import type { Tone } from "@/lib/colors";
import { fetchNotifications, type NotifTone } from "@/lib/supabase/data/notifications";
import { formatRelative } from "@/lib/format";
import { toast } from "@/lib/toast";

const toneMeta: Record<NotifTone, { tone: Tone; icon: LucideIcon }> = {
  info: { tone: "accent", icon: Bell },
  success: { tone: "success", icon: Check },
  warning: { tone: "warning", icon: CalendarClock },
  danger: { tone: "danger", icon: AlertTriangle },
};

export function CmNotifications() {
  const { data: feed = [] } = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const markAllRead = () => {
    setReadIds(new Set(feed.map((n) => n.id)));
    toast.success("Toutes les notifications sont marquées comme lues");
  };

  return (
    <ScreenContainer className="max-w-[800px]">
      <Card className="p-[18px_20px]">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Notifications
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="text-accent text-[11.5px] font-bold hover:underline"
          >
            Tout marquer comme lu
          </button>
        </div>

        {feed.length === 0 && (
          <EmptyState title="Aucune notification" description="Les événements récents apparaîtront ici." />
        )}
        <div className="flex flex-col">
          {feed.map((notif, index) => {
            const meta = toneMeta[notif.tone];
            const unread = !readIds.has(notif.id);
            return (
              <div
                key={notif.id}
                className={`flex items-center gap-3.5 px-1 py-3.5 ${
                  index < feed.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <IconTile icon={meta.icon} tone={meta.tone} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[12.5px] font-bold">
                    {notif.title}
                  </div>
                  <div className="text-muted mt-0.5 text-[11px] font-semibold">
                    {notif.detail} · {formatRelative(notif.at)}
                  </div>
                </div>
                {unread && (
                  <span
                    className="bg-accent size-2 flex-none rounded-full"
                    aria-label="Non lu"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </ScreenContainer>
  );
}
