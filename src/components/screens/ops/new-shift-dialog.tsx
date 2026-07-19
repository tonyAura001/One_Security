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
  createShift,
  type NewShiftInput,
  type ShiftType,
} from "@/lib/supabase/data/planning";
import { fetchAgents } from "@/lib/supabase/data/agents";
import { fetchSiteOptions } from "@/lib/supabase/data/options";

const DAYS = [
  { v: 0, l: "Lundi" },
  { v: 1, l: "Mardi" },
  { v: 2, l: "Mercredi" },
  { v: 3, l: "Jeudi" },
  { v: 4, l: "Vendredi" },
];
const TYPES: { v: ShiftType; l: string }[] = [
  { v: "jour", l: "Jour (06:00 – 18:00)" },
  { v: "nuit", l: "Nuit (20:00 – 06:00)" },
  { v: "renfort", l: "Renfort (14:00 – 22:00)" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NewShiftDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewShiftInput>({
    agentId: "",
    day: 0,
    type: "jour",
    siteId: "",
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });
  const { data: sites } = useQuery({
    queryKey: ["site-options"],
    queryFn: fetchSiteOptions,
  });
  const agentOpts = agents ?? [];
  const siteOpts = sites ?? [];

  const mutation = useMutation({
    mutationFn: () => createShift(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Vacation affectée");
      setForm({ agentId: "", day: 0, type: "jour", siteId: "" });
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG/RP/Manager/Contrôleur peuvent affecter une vacation."
          : `Échec : ${msg}`,
      );
    },
  });

  const valid = form.agentId !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarPlus className="size-4" /> Affecter une vacation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Affecter une vacation</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Agent *</label>
            <select
              className={field}
              value={form.agentId}
              onChange={(e) =>
                setForm((f) => ({ ...f, agentId: e.target.value }))
              }
            >
              <option value="" disabled>
                — Choisir un agent —
              </option>
              {agentOpts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Jour</label>
              <select
                className={field}
                value={form.day}
                onChange={(e) =>
                  setForm((f) => ({ ...f, day: Number(e.target.value) }))
                }
              >
                {DAYS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Vacation</label>
              <select
                className={field}
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as ShiftType }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Site (optionnel)</label>
            <select
              className={field}
              value={form.siteId ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, siteId: e.target.value }))
              }
            >
              <option value="">— Aucun —</option>
              {siteOpts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
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
              {mutation.isPending ? "Affectation…" : "Affecter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
