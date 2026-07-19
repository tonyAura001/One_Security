"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import {
  createEntretien,
  fetchAllCandidatures,
  type EntretienType,
} from "@/lib/supabase/data/recrutement";

const TYPES: { v: EntretienType; l: string }[] = [
  { v: "physique", l: "Présentiel" },
  { v: "telephonique", l: "Téléphonique" },
  { v: "visio", l: "Visio" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewEntretienDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [candidatureId, setCandidatureId] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("09:00");
  const [type, setType] = useState<EntretienType>("physique");

  const { data: cands } = useQuery({
    queryKey: ["candidature-options"],
    queryFn: fetchAllCandidatures,
  });
  const candOpts = cands ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      createEntretien({
        candidatureId,
        dateHeure: new Date(`${date}T${heure}`).toISOString(),
        type,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
      toast.success("Entretien planifié");
      setCandidatureId("");
      setDate("");
      setHeure("09:00");
      setType("physique");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : vous ne pouvez pas planifier cet entretien."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = candidatureId !== "" && date !== "" && heure !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border-border text-accent hover:bg-active mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed py-[11px] text-[12.5px] font-bold"
        >
          <Plus size={15} strokeWidth={2.2} />
          Planifier un entretien
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Planifier un entretien</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Candidature *</label>
            <select
              className={field}
              value={candidatureId}
              onChange={(e) => setCandidatureId(e.target.value)}
            >
              <option value="" disabled>
                — Choisir une candidature —
              </option>
              {candOpts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Date *</label>
              <input
                type="date"
                className={field}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Heure *</label>
              <input
                type="time"
                className={field}
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label}>Type</label>
            <select
              className={field}
              value={type}
              onChange={(e) => setType(e.target.value as EntretienType)}
            >
              {TYPES.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.l}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending ? "Planification…" : "Planifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
