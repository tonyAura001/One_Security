"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
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
  createPlan,
  type NewPlanInput,
  type Periodicite,
} from "@/lib/supabase/data/plans-maintenance";
import { fetchSiteOptions } from "@/lib/supabase/data/options";

const PERIODES: { v: Periodicite; l: string }[] = [
  { v: "mensuelle", l: "Mensuelle" },
  { v: "trimestrielle", l: "Trimestrielle" },
  { v: "semestrielle", l: "Semestrielle" },
  { v: "annuelle", l: "Annuelle" },
];
const CRITICITES = ["critique", "haute", "normale", "basse"];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

interface Form {
  titre: string;
  siteId: string;
  equipement: string;
  periodicite: Periodicite;
  prochaineEcheance: string;
  criticite: string;
}
const EMPTY: Form = {
  titre: "",
  siteId: "",
  equipement: "",
  periodicite: "mensuelle",
  prochaineEcheance: "",
  criticite: "normale",
};

export function NewPlanDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data: sites } = useQuery({ queryKey: ["site-options"], queryFn: fetchSiteOptions });
  const siteOpts = sites ?? [];

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewPlanInput = {
        titre: form.titre,
        siteId: form.siteId || null,
        equipement: form.equipement,
        periodicite: form.periodicite,
        prochaineEcheance: form.prochaineEcheance,
        criticite: form.criticite,
      };
      return createPlan(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans-maintenance"] });
      toast.success("Plan préventif créé");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|refusé/i.test(msg)
          ? "Accès refusé pour créer un plan."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = form.titre.trim().length > 0 && form.prochaineEcheance !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus className="size-4" /> Nouveau plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nouveau plan préventif</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Intitulé *</label>
            <input
              className={field}
              value={form.titre}
              onChange={(e) => update("titre", e.target.value)}
              placeholder="Ex. Contrôle caméras de vidéosurveillance"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Site</label>
              <select
                className={field}
                value={form.siteId}
                onChange={(e) => update("siteId", e.target.value)}
              >
                <option value="">— Aucun —</option>
                {siteOpts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
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
                placeholder="Ex. Caméra IP entrée"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Périodicité</label>
              <select
                className={field}
                value={form.periodicite}
                onChange={(e) => update("periodicite", e.target.value as Periodicite)}
              >
                {PERIODES.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Criticité</label>
              <select
                className={field}
                value={form.criticite}
                onChange={(e) => update("criticite", e.target.value)}
              >
                {CRITICITES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>1ʳᵉ échéance *</label>
              <input
                type="date"
                className={field}
                value={form.prochaineEcheance}
                onChange={(e) => update("prochaineEcheance", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer le plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
