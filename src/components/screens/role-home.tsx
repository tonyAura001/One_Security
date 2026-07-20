"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ScreenContainer } from "./screen-container";
import { Card } from "@/components/ui/card";
import { useSession } from "@/lib/store/session";
import { usePermissions } from "@/lib/store/access";
import { PERMISSION_LABELS, type Permission } from "@/config/permissions";
import { FUNCTIONAL_SCREENS } from "@/lib/rbac";
import { ICONS } from "@/lib/icons";

/**
 * Generic per-role landing dashboard ("home"): greeting, KPI row and quick
 * access cards, all derived from the role's RBAC config.
 */
export function RoleHome() {
  const { config } = useSession();
  const greeting = `Bonjour, ${config.name.replace(/^M\. /, "")}`;
  const links = (config.links ?? []).filter((l) =>
    FUNCTIONAL_SCREENS.has(l.key),
  );
  const permissions = usePermissions();

  return (
    <ScreenContainer>
      <div className="mb-[18px]">
        <div className="text-foreground text-[20px] font-extrabold tracking-[-0.4px]">
          {greeting}
        </div>
        <div className="text-muted mt-[3px] text-[12.5px] font-semibold">
          {config.fonction} · PilotePME — One Security
        </div>
      </div>

      <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.6px]">
        ACCÈS RAPIDE
      </div>
      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {links.map((l) => {
          const Icon = ICONS[l.icon];
          return (
            <Link
              key={l.key}
              href={`/${l.key}`}
              className="border-border bg-surface shadow-card hover:border-accent flex items-center gap-3 rounded-2xl border p-[15px] transition-colors"
            >
              <span className="bg-active text-accent flex size-[38px] flex-none items-center justify-center rounded-[11px]">
                <Icon className="size-[18px]" strokeWidth={1.7} />
              </span>
              <span className="text-foreground flex-1 text-[13px] font-bold">
                {l.label}
              </span>
              <ChevronRight className="text-muted size-4" strokeWidth={2} />
            </Link>
          );
        })}
      </div>

      {/* ── Mes permissions (contrôle d'accès RBAC) ── */}
      <div className="mt-5">
        <Card className="p-4">
          <div className="text-muted text-[11px] font-bold tracking-[0.6px]">
            MES PERMISSIONS · {permissions.length}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {permissions.length === 0 ? (
              <span className="text-muted text-sm">
                Aucune permission attribuée.
              </span>
            ) : (
              permissions.map((p) => (
                <span
                  key={p}
                  className="bg-active text-accent rounded-md px-2 py-1 text-[11px] font-semibold"
                  title={p}
                >
                  {PERMISSION_LABELS[p as Permission] ?? p}
                </span>
              ))
            )}
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}
