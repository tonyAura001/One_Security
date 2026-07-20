"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import { NewPlateformeDialog } from "./new-plateforme-dialog";
import {
  fetchPlateformes,
  togglePlateforme,
  PLATEFORME_LABEL,
  type Plateforme,
} from "@/lib/supabase/data/cm";

/** Panneau des plateformes/réseaux gérés (au-dessus du calendrier éditorial). */
export function PlateformesPanel() {
  const qc = useQueryClient();
  const { data: plateformes = [], isLoading } = useQuery({
    queryKey: ["plateformes"],
    queryFn: fetchPlateformes,
  });

  const toggle = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      togglePlateforme(id, actif),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plateformes"] }),
    onError: () => toast.error("Modification refusée (accès requis)"),
  });

  return (
    <Card className="mb-4 p-[16px_18px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-foreground flex items-center gap-2 text-[13px] font-extrabold tracking-[-0.2px]">
          <Radio className="size-4" />
          Plateformes
          <span className="text-muted text-[12px] font-bold">{plateformes.length}</span>
        </div>
        <NewPlateformeDialog />
      </div>

      {isLoading ? (
        <p className="text-muted text-[12.5px] font-semibold">Chargement…</p>
      ) : plateformes.length === 0 ? (
        <p className="text-muted text-[12.5px] font-semibold">
          Aucune plateforme. Ajoutez vos réseaux gérés (Facebook, LinkedIn, site web…).
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plateformes.map((p: Plateforme) => (
            <button
              key={p.id}
              onClick={() => toggle.mutate({ id: p.id, actif: !p.actif })}
              disabled={toggle.isPending}
              title={p.actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
              className="border-border bg-surface2 hover:bg-hover flex items-center gap-2 rounded-[10px] border px-3 py-1.5 transition-colors"
            >
              <span className="text-foreground text-[12px] font-bold">{p.nom}</span>
              <span className="text-muted text-[10.5px] font-semibold">
                {PLATEFORME_LABEL[p.type]}
              </span>
              <StatusPill variant={p.actif ? "success" : "neutral"}>
                {p.actif ? "Actif" : "Inactif"}
              </StatusPill>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
