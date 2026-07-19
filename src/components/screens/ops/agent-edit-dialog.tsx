"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
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
import { useSession } from "@/lib/store/session";
import type { RoleId } from "@/lib/rbac";
import {
  fetchAgentRecord,
  updateAgent,
  type AgentRecord,
} from "@/lib/supabase/data/agents";

/** Rôles autorisés à éditer une fiche agent (aligné sur la RLS). */
const CAN_EDIT: RoleId[] = ["dg", "rp", "rh", "manager"];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

type Editable = Pick<
  AgentRecord,
  | "prenom"
  | "nom"
  | "telephone"
  | "telephone2"
  | "adresse"
  | "poste"
  | "salaire"
  | "statut"
>;

/** Édition d'une fiche agent (responsables : DG/RP/RH/MANAGER via RLS). */
export function AgentEditDialog({ agentId }: { agentId: string }) {
  const { role } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Editable | null>(null);

  const { data } = useQuery({
    queryKey: ["agent-record", agentId],
    queryFn: () => fetchAgentRecord(agentId),
    enabled: open,
  });

  useEffect(() => {
    if (data) {
      setForm({
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone,
        telephone2: data.telephone2,
        adresse: data.adresse,
        poste: data.poste,
        salaire: data.salaire,
        statut: data.statut,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateAgent(agentId, form ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["agent-record", agentId] });
      toast.success("Fiche agent mise à jour");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : réservé aux responsables (DG, RP, RH, Manager)."
          : `Échec : ${msg}`,
      );
    },
  });

  function set<K extends keyof Editable>(k: K, v: Editable[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  // Réservé aux responsables (aligné sur la RLS d'écriture) — après les hooks.
  if (!CAN_EDIT.includes(role)) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="size-3.5" strokeWidth={2.2} />
          Éditer la fiche
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[460px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Éditer la fiche agent</DialogTitle>
        </DialogHeader>
        {!form ? (
          <p className="text-muted py-6 text-center text-sm">Chargement…</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (form.prenom?.trim()) mutation.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Prénom *</label>
                <input
                  className={field}
                  value={form.prenom ?? ""}
                  onChange={(e) => set("prenom", e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Nom</label>
                <input
                  className={field}
                  value={form.nom ?? ""}
                  onChange={(e) => set("nom", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Téléphone</label>
                <input
                  className={field}
                  value={form.telephone ?? ""}
                  onChange={(e) => set("telephone", e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Téléphone 2</label>
                <input
                  className={field}
                  value={form.telephone2 ?? ""}
                  onChange={(e) => set("telephone2", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={label}>Adresse</label>
              <input
                className={field}
                value={form.adresse ?? ""}
                onChange={(e) => set("adresse", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Poste / affectation</label>
                <input
                  className={field}
                  value={form.poste ?? ""}
                  onChange={(e) => set("poste", e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Salaire (FCFA)</label>
                <input
                  type="number"
                  className={field}
                  value={form.salaire ?? ""}
                  onChange={(e) =>
                    set("salaire", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
            </div>
            <div>
              <label className={label}>Statut</label>
              <select
                className={field}
                value={form.statut}
                onChange={(e) => set("statut", e.target.value)}
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="suspendu">Suspendu</option>
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
                disabled={!form.prenom?.trim() || mutation.isPending}
              >
                {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
