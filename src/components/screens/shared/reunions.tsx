"use client";

import { useMemo } from "react";
import { Clock, MapPin, Monitor, Users, Video } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card, Button } from "@/aurantir-front-kit";
import { useSession } from "@/lib/store/session";
import {
  getMeetings,
  type Meeting,
  type MeetingMode,
} from "@/lib/api/workspace";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<MeetingMode, typeof Video> = {
  visio: Video,
  salle: Monitor,
  terrain: MapPin,
};

const CAT_CHIP: Record<Meeting["catColor"], string> = {
  blue: "bg-blue/10 text-blue",
  green: "bg-green/10 text-green",
  amber: "bg-amber/10 text-amber",
  violet: "bg-violet/10 text-violet",
  red: "bg-red/10 text-red",
};

function Avatars({ people }: { people: string[] }) {
  return (
    <div className="flex -space-x-1.5">
      {people.slice(0, 4).map((p, i) => (
        <span
          key={i}
          className="border-surface bg-blue/15 text-blue text-2xs flex size-6 items-center justify-center rounded-full border-2 font-bold"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

export function ReunionsScreen() {
  const { role } = useSession();
  const meetings = useMemo(() => getMeetings(role), [role]);
  const next = meetings[0];
  const ModeIcon = next ? MODE_ICON[next.mode] : Video;

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Réunions</h1>
          <p className="page-subtitle">
            {meetings.length} planifiée{meetings.length !== 1 ? "s" : ""}{" "}
            aujourd’hui
          </p>
        </div>
      </div>

      {/* Prochaine réunion */}
      {next && (
        <Card glow="blue" className="mt-4">
          <p className="text-2xs text-blue font-semibold tracking-widest uppercase">
            Prochaine réunion
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-text-primary text-2xl font-bold tabular-nums">
                  {next.time}
                </span>
                <h2 className="text-text-primary text-lg font-semibold">
                  {next.title}
                </h2>
              </div>
              <div className="text-text-muted mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <ModeIcon size={13} /> {next.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} /> {next.durationMin} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={13} /> {next.participants.length} participants
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatars people={next.participants} />
              <Button
                onClick={() => toast.success("Réunion rejointe", next.title)}
              >
                Rejoindre
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Planning du jour */}
      <p className="text-text-muted mt-6 mb-2 text-[11px] font-semibold tracking-widest uppercase">
        Planning du jour
      </p>
      <div className="space-y-2">
        {meetings.map((m) => {
          const Icon = MODE_ICON[m.mode];
          return (
            <div
              key={m.id}
              className="border-surface-border bg-surface flex flex-wrap items-center gap-4 rounded-xl border p-3.5"
            >
              <div className="w-12 flex-shrink-0 text-center">
                <p className="text-text-primary text-sm font-bold tabular-nums">
                  {m.time}
                </p>
                <p className="text-2xs text-text-muted">{m.durationMin}′</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-text-primary text-sm font-semibold">
                    {m.title}
                  </p>
                  <span
                    className={cn(
                      "text-2xs rounded-full px-2 py-0.5 font-semibold",
                      CAT_CHIP[m.catColor],
                    )}
                  >
                    {m.category}
                  </span>
                </div>
                <p className="text-2xs text-text-muted mt-0.5 inline-flex items-center gap-1">
                  <Icon size={11} /> {m.location}
                </p>
              </div>
              <Avatars people={m.participants} />
            </div>
          );
        })}
      </div>
    </ScreenContainer>
  );
}
