"use client";

import { Hammer } from "lucide-react";
import { Card } from "@/aurantir-front-kit";
import { useSession } from "@/lib/store/session";
import { screenMeta, type ScreenKey } from "@/lib/rbac";

/**
 * Écran placeholder cohérent avec le design system (titre + état vide).
 * Rendu par le registre pour toute sous-page pas encore construite.
 * TODO: écran à construire (Trésorerie, Fournisseurs, Prospects, Agents…).
 */
export function PlaceholderScreen({ screenKey }: { screenKey: ScreenKey }) {
  const { role } = useSession();
  const meta = screenMeta(role, screenKey);

  return (
    <Card padding="lg">
      <div className="flex min-h-[52vh] flex-col items-center justify-center gap-4 text-center">
        <div className="bg-blue/10 text-blue flex size-16 items-center justify-center rounded-2xl">
          <Hammer className="size-7" strokeWidth={1.6} />
        </div>
        <div>
          <div className="text-text-muted text-2xs font-semibold tracking-wider uppercase">
            {meta.crumb}
          </div>
          <h2 className="text-text-primary mt-1 text-xl font-semibold tracking-tight">
            {meta.title}
          </h2>
        </div>
        <p className="text-text-muted max-w-sm text-sm">
          Module en cours de construction — l’écran sera branché sur la couche
          de données <code className="text-text-secondary">lib/api/*</code>.
        </p>
      </div>
    </Card>
  );
}
