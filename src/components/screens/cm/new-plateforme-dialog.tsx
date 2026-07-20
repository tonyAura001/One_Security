"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  createPlateforme,
  PLATEFORME_LABEL,
  type NewPlateformeInput,
  type PlateformeType,
} from "@/lib/supabase/data/cm";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

const TYPES = Object.keys(PLATEFORME_LABEL) as PlateformeType[];

export function NewPlateformeDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<PlateformeType>("facebook");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewPlateformeInput = { nom, type, handle, url };
      return createPlateforme(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plateformes"] });
      toast.success("Plateforme ajoutée");
      setNom("");
      setHandle("");
      setUrl("");
      setType("facebook");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|refusé/i.test(msg)
          ? "Accès refusé pour ajouter une plateforme."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = nom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> Plateforme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nouvelle plateforme</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Nom *</label>
              <input
                className={field}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. One Security DK"
                autoFocus
              />
            </div>
            <div>
              <label className={label}>Type</label>
              <select
                className={field}
                value={type}
                onChange={(e) => setType(e.target.value as PlateformeType)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PLATEFORME_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Handle / compte</label>
            <input
              className={field}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@onesecurity"
            />
          </div>
          <div>
            <label className={label}>URL</label>
            <input
              className={field}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
