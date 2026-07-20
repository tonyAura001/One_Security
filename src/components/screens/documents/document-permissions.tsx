"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ROLE_ORDER, ROLES, type RoleId } from "@/lib/rbac";
import {
  fetchDocumentPermissions,
  setDocumentPermissions,
} from "@/lib/supabase/data/documents";
import type { DocVisibility } from "@/lib/documents/types";

const LEVELS: { v: DocVisibility; label: string; hint: string }[] = [
  { v: "DG", label: "DG uniquement", hint: "Seul le Directeur Général" },
  { v: "Direction", label: "Direction", hint: "DG + rôles de direction choisis" },
  { v: "Managers", label: "Managers", hint: "Direction + rôles de management choisis" },
  { v: "Tous", label: "Tous", hint: "Tout le personnel authentifié" },
];

/** Panneau de permissions d'un document (réservé au DG). */
export function DocumentPermissions({ documentId }: { documentId: string }) {
  const qc = useQueryClient();
  const key = ["doc-permissions", documentId];
  const { data } = useQuery({ queryKey: key, queryFn: () => fetchDocumentPermissions(documentId) });

  const [visibility, setVisibility] = useState<DocVisibility>("Tous");
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    if (data) {
      setVisibility(data.visibility);
      setRoles(data.roles);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => setDocumentPermissions(documentId, visibility, roles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Permissions enregistrées");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/DG|42501|réservé/i.test(msg) ? "Réservé au Directeur Général." : `Échec : ${msg}`);
    },
  });

  const showRoles = visibility === "Direction" || visibility === "Managers";
  const toggle = (rn: string) =>
    setRoles((r) => (r.includes(rn) ? r.filter((x) => x !== rn) : [...r, rn]));

  return (
    <Card className="doc-toolbar h-fit p-4">
      <div className="text-muted mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.5px] uppercase">
        <ShieldCheck className="size-3.5" /> Confidentialité
      </div>

      <div className="flex flex-col gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l.v}
            onClick={() => setVisibility(l.v)}
            className={cn(
              "flex items-start gap-2 rounded-[10px] border px-2.5 py-2 text-left transition-colors",
              visibility === l.v ? "border-accent bg-accent/10" : "border-border bg-surface2 hover:bg-hover",
            )}
          >
            {l.v === "DG" ? (
              <Lock className={cn("mt-0.5 size-3.5 flex-none", visibility === l.v ? "text-accent" : "text-muted")} />
            ) : (
              <span className={cn("mt-1 size-2 flex-none rounded-full", visibility === l.v ? "bg-accent" : "bg-border")} />
            )}
            <span className="min-w-0">
              <span className={cn("block text-[12.5px] font-bold", visibility === l.v ? "text-accent" : "text-foreground")}>
                {l.label}
              </span>
              <span className="text-muted block text-[10.5px] font-medium">{l.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {showRoles && (
        <div className="mt-3">
          <div className="text-muted mb-1.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
            Rôles autorisés en plus
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ROLE_ORDER.map((id) => {
              const rn = id.toUpperCase();
              return (
                <label key={id} className="text-foreground/90 flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold">
                  <input type="checkbox" checked={roles.includes(rn)} onChange={() => toggle(rn)} className="accent-accent" />
                  {ROLES[id as RoleId].fonction}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <Button className="mt-3 w-full" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Enregistrement…" : "Appliquer la confidentialité"}
      </Button>
      <p className="text-muted mt-2 text-[10px] font-medium">
        Appliqué au niveau de la base (RLS) : les utilisateurs non autorisés ne voient pas ce document.
      </p>
    </Card>
  );
}
