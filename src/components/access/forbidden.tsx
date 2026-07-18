"use client";

import { ShieldX } from "lucide-react";
import { Card } from "@/aurantir-front-kit";

/** Écran 403 — accès refusé (permission manquante). */
export function Forbidden403({ hint }: { hint?: string }) {
  return (
    <Card padding="lg">
      <div className="flex min-h-[52vh] flex-col items-center justify-center gap-4 text-center">
        <div className="bg-red/10 text-red flex size-16 items-center justify-center rounded-2xl">
          <ShieldX className="size-7" strokeWidth={1.6} />
        </div>
        <div>
          <div className="text-text-muted text-2xs font-semibold tracking-wider uppercase">
            Erreur 403
          </div>
          <h2 className="text-text-primary mt-1 text-xl font-semibold tracking-tight">
            Accès refusé
          </h2>
        </div>
        <p className="text-text-muted max-w-sm text-sm">
          {hint ??
            "Vous n'avez pas la permission nécessaire pour consulter cette section."}
        </p>
      </div>
    </Card>
  );
}
