"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
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
  fetchInteractions,
  enregistrerEngagement,
  INTERACTION_LABEL,
  type InteractionType,
} from "@/lib/supabase/data/cm";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";

const TYPES = Object.keys(INTERACTION_LABEL) as InteractionType[];

/** Saisit la ventilation d'engagement d'une publication. */
export function EngagementDialog({
  publicationId,
  title,
}: {
  publicationId: string;
  title: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<InteractionType, string>>({
    vue: "",
    jaime: "",
    commentaire: "",
    partage: "",
    clic: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["interactions", publicationId],
    queryFn: () => fetchInteractions(publicationId),
    enabled: open,
  });

  useEffect(() => {
    if (existing) {
      const next = { vue: "", jaime: "", commentaire: "", partage: "", clic: "" } as Record<
        InteractionType,
        string
      >;
      for (const r of existing) next[r.type] = String(r.nombre);
      setCounts(next);
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: () =>
      enregistrerEngagement(
        publicationId,
        TYPES.map((t) => ({ type: t, nombre: Number(counts[t]) || 0 })),
      ),
    onSuccess: (total) => {
      qc.invalidateQueries({ queryKey: ["publications"] });
      qc.invalidateQueries({ queryKey: ["interactions", publicationId] });
      toast.success("Engagement enregistré", `${total} interactions au total`);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /accès refusé|row-level|42501/i.test(msg)
          ? "Accès refusé pour saisir l'engagement."
          : `Échec : ${msg}`,
      );
    },
  });

  const total = TYPES.reduce((s, t) => s + (Number(counts[t]) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="text-muted hover:text-accent inline-flex items-center gap-1 text-[10px] font-bold transition-colors"
          title="Saisir l'engagement"
        >
          <BarChart3 className="size-3" /> Engagement
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Engagement — {title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          {TYPES.map((t) => (
            <div key={t} className="flex items-center justify-between gap-3">
              <label className="text-foreground text-[12.5px] font-semibold">
                {INTERACTION_LABEL[t]}
              </label>
              <input
                inputMode="numeric"
                className={`${field} w-28 text-right`}
                value={counts[t]}
                onChange={(e) =>
                  setCounts((c) => ({ ...c, [t]: e.target.value.replace(/[^\d]/g, "") }))
                }
                placeholder="0"
              />
            </div>
          ))}
          <div className="border-border mt-1 flex items-center justify-between border-t pt-2 text-[13px] font-extrabold">
            <span className="text-muted">Total</span>
            <span className="text-foreground">{total}</span>
          </div>
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
