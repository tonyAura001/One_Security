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
import { createTicket, type NewTicketInput } from "@/lib/supabase/data/maintenance";
import { fetchSiteOptions } from "@/lib/supabase/data/options";

const CRITICITES: { v: string; l: string }[] = [
  { v: "critique", l: "Critique" },
  { v: "haute", l: "Haute" },
  { v: "normale", l: "Normale" },
  { v: "basse", l: "Basse" },
];

const EMPTY = {
  titre: "",
  criticite: "normale",
  siteId: "",
  equipement: "",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewTicketDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const { data: sites } = useQuery({ queryKey: ["site-options"], queryFn: fetchSiteOptions });
  const siteOpts = sites ?? [];

  function update<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: NewTicketInput = {
        titre: form.titre,
        criticite: form.criticite,
        siteId: form.siteId || null,
        equipement: form.equipement,
      };
      return createTicket(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket créé");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé pour créer un ticket."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = form.titre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nouveau ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Titre *</label>
            <input
              className={field}
              value={form.titre}
              onChange={(e) => update("titre", e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className={label}>Criticité</label>
            <select
              className={field}
              value={form.criticite}
              onChange={(e) => update("criticite", e.target.value)}
            >
              {CRITICITES.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Équipement</label>
            <input
              className={field}
              value={form.equipement}
              onChange={(e) => update("equipement", e.target.value)}
              placeholder="Ex. Portique n°3"
            />
          </div>
          <div>
            <label className={label}>Site (optionnel)</label>
            <select
              className={field}
              value={form.siteId}
              onChange={(e) => update("siteId", e.target.value)}
            >
              <option value="">— Aucun —</option>
              {siteOpts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
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
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer le ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
