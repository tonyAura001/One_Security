"use client";

import { Eye, RotateCcw } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { ROLE_ORDER, ROLES, type RoleId } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/**
 * « Voir en tant que » — réservé au Directeur Général.
 *
 * Permet au DG de consulter l'interface et les fonctionnalités de n'importe
 * quel autre rôle, à tout moment, sans changer son identité réelle (l'accès
 * aux données reste celui du DG via RLS). Masqué pour tous les autres rôles.
 */
export function ViewAsBar() {
  const { actualRole, role, isViewingAs, viewAs, resetView } = useSession();

  if (actualRole !== "dg") return null;

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5",
        isViewingAs
          ? "border-accent/40 bg-accent/[0.07]"
          : "border-border bg-surface2",
      )}
    >
      <span className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-[0.5px] uppercase">
        <Eye className="size-3.5" strokeWidth={2.2} />
        {isViewingAs ? "Vous consultez l'espace" : "Voir en tant que"}
      </span>

      <select
        value={role}
        onChange={(e) => {
          const next = e.target.value as RoleId;
          if (next === actualRole) resetView();
          else viewAs(next);
        }}
        className="border-border bg-surface text-foreground focus:border-accent/50 rounded-[9px] border px-2.5 py-1.5 text-[12.5px] font-bold outline-none"
        aria-label="Consulter l'espace d'un autre rôle"
      >
        {ROLE_ORDER.map((r) => (
          <option key={r} value={r}>
            {ROLES[r].fonction}
            {r === actualRole ? " — moi" : ""}
          </option>
        ))}
      </select>

      {isViewingAs && (
        <button
          type="button"
          onClick={resetView}
          className="text-accent hover:bg-accent/10 ml-auto flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12px] font-bold transition-colors"
        >
          <RotateCcw className="size-3.5" strokeWidth={2.4} />
          Revenir à mon espace DG
        </button>
      )}
    </div>
  );
}
