"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { updateInterventionResume } from "@/lib/supabase/data/maintenance";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";

/** Édite le compte rendu (résumé) d'une intervention. */
export function RapportDialog({
  interventionId,
  current,
}: {
  interventionId: string;
  current: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [resume, setResume] = useState(current);

  const mutation = useMutation({
    mutationFn: () => updateInterventionResume(interventionId, resume),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interventions"] });
      toast.success("Compte rendu enregistré");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé pour enregistrer le rapport."
          : `Échec : ${msg}`,
      );
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setResume(current);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText strokeWidth={1.8} /> Rapport
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Compte rendu d&apos;intervention</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <textarea
            className={`${field} min-h-[140px] resize-y`}
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Détail de l'intervention, constats, actions menées…"
            autoFocus
          />
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
