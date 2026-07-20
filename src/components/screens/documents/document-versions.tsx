"use client";

import { useQuery } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateFR } from "@/lib/format";
import { fetchVersions, type DocVersion } from "@/lib/supabase/data/documents";

/** Historique des versions d'un document, avec restauration. */
export function DocumentVersions({
  documentId,
  onRestore,
}: {
  documentId: string;
  onRestore: (v: DocVersion) => void;
}) {
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["doc-versions", documentId],
    queryFn: () => fetchVersions(documentId),
  });

  return (
    <Card className="doc-toolbar h-fit p-4">
      <div className="text-muted mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.5px] uppercase">
        <History className="size-3.5" /> Historique
        {versions.length > 0 && (
          <span className="text-foreground">· {versions.length}</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted text-[12px] font-semibold">Chargement…</p>
      ) : versions.length === 0 ? (
        <p className="text-muted text-[12px] font-semibold">
          Chaque enregistrement crée une version restaurable.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {versions.map((v) => (
            <li
              key={v.id}
              className="border-border bg-surface2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            >
              <span className="bg-active text-accent flex size-6 flex-none items-center justify-center rounded-md text-[10px] font-bold">
                v{v.version}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-[12px] font-semibold">
                  {v.statut ?? "—"}
                </div>
                <div className="text-muted text-[10.5px] font-medium">
                  {formatDateFR(v.createdAt, "dd/MM/yyyy HH:mm")}
                </div>
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onRestore(v)}
                title="Restaurer cette version"
              >
                <RotateCcw className="size-3" /> Restaurer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
