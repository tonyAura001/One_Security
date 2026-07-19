"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
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
import { createSite, type NewSiteInput } from "@/lib/supabase/data/sites";

const TYPES = [
  "ENTREPRISE",
  "RESIDENCE",
  "COMMERCE",
  "CHANTIER",
  "ADMINISTRATION",
  "EVENEMENT",
  "AUTRE",
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

/** Ajoute un site gardé rattaché à un client (clientId fourni par le détail). */
export function NewSiteDialog({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<NewSiteInput, "clientId">>({
    nom: "",
    adresse: "",
    type: "ENTREPRISE",
    superficie: null,
  });

  const mutation = useMutation({
    mutationFn: () => createSite({ clientId, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["site-options"] });
      toast.success(`Site « ${form.nom.trim()} » ajouté`);
      setForm({ nom: "", adresse: "", type: "ENTREPRISE", superficie: null });
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG, RP et Manager peuvent ajouter un site."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = form.nom.trim().length > 0 && form.adresse.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <MapPin className="size-4" /> Ajouter un site
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau site — {clientName}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Nom du site *</label>
            <input
              className={field}
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Ex. Siège Almadies"
              autoFocus
            />
          </div>
          <div>
            <label className={label}>Adresse *</label>
            <input
              className={field}
              value={form.adresse}
              onChange={(e) =>
                setForm((f) => ({ ...f, adresse: e.target.value }))
              }
              placeholder="Dakar, Sénégal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type</label>
              <select
                className={field}
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Superficie (m²)</label>
              <input
                type="number"
                className={field}
                value={form.superficie ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    superficie: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Optionnel"
              />
            </div>
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
              {mutation.isPending ? "Ajout…" : "Ajouter le site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
