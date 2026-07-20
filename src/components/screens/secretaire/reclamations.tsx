"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import { useSession } from "@/lib/store/session";
import { fetchClientOptions } from "@/lib/supabase/data/options";
import {
  fetchReclamations,
  createReclamation,
  updateReclamationStatut,
  type Severite,
  type ReclamationStatut,
  type NewReclamationInput,
} from "@/lib/supabase/data/reclamations";

const SEVERITY_LABEL: Record<Severite, string> = {
  elevee: "ÉLEVÉE",
  moyenne: "MOYENNE",
  faible: "FAIBLE",
};
const SEVERITY_VARIANT: Record<Severite, PillVariant> = {
  elevee: "danger",
  moyenne: "warning",
  faible: "neutral",
};
const STATUS_LABEL: Record<ReclamationStatut, string> = {
  ouverte: "OUVERTE",
  en_cours: "EN COURS",
  resolue: "RÉSOLUE",
};
const STATUS_VARIANT: Record<ReclamationStatut, PillVariant> = {
  ouverte: "danger",
  en_cours: "warning",
  resolue: "success",
};
const NEXT_STATUT: Record<ReclamationStatut, ReclamationStatut | null> = {
  ouverte: "en_cours",
  en_cours: "resolue",
  resolue: null,
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function SecretaireReclamations() {
  const { role } = useSession();
  const canWrite = ["dg", "rp", "manager"].includes(role);
  const qc = useQueryClient();
  const { data: reclamations = [] } = useQuery({
    queryKey: ["reclamations"],
    queryFn: fetchReclamations,
  });
  const openCount = reclamations.filter((r) => r.statut === "ouverte").length;

  const advance = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: ReclamationStatut }) =>
      updateReclamationStatut(id, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reclamations"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Modification refusée (accès requis)."),
  });

  return (
    <ScreenContainer>
      <Card className="rounded-2xl px-5 py-[18px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Réclamations clients
          </div>
          <div className="flex items-center gap-2">
            <StatusPill variant="warning" uppercase>
              {openCount} ouvertes
            </StatusPill>
            {canWrite && <NewReclamationDialog />}
          </div>
        </div>

        {reclamations.length === 0 ? (
          <EmptyState
            title="Aucune réclamation"
            description="Enregistrez une réclamation client pour en assurer le suivi."
          />
        ) : (
          <>
            <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px]">
              <div className="w-[120px]">RÉFÉRENCE</div>
              <div className="flex-1">CLIENT · OBJET</div>
              <div className="w-[100px] text-center">GRAVITÉ</div>
              <div className="w-[110px] text-center">STATUT</div>
              <div className="w-[130px] text-right">DATE / ACTION</div>
            </div>

            {reclamations.map((r, i) => {
              const next = NEXT_STATUT[r.statut];
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3.5 px-1 py-[13px] ${
                    i < reclamations.length - 1 ? "border-border border-b" : ""
                  }`}
                >
                  <div className="text-foreground w-[120px] text-[12px] font-extrabold">
                    {r.ref}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-[12.5px] font-bold">
                      {r.client}
                    </div>
                    <div className="text-muted truncate text-[11px] font-semibold">
                      {r.objet}
                    </div>
                  </div>
                  <div className="flex w-[100px] justify-center">
                    <StatusPill variant={SEVERITY_VARIANT[r.severite]} uppercase>
                      {SEVERITY_LABEL[r.severite]}
                    </StatusPill>
                  </div>
                  <div className="flex w-[110px] justify-center">
                    <StatusPill variant={STATUS_VARIANT[r.statut]} uppercase>
                      {STATUS_LABEL[r.statut]}
                    </StatusPill>
                  </div>
                  <div className="flex w-[130px] items-center justify-end gap-2">
                    {canWrite && next ? (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={advance.isPending}
                        onClick={() => advance.mutate({ id: r.id, statut: next })}
                      >
                        {next === "en_cours" ? "Prendre en charge" : "Résoudre"}
                      </Button>
                    ) : (
                      <span className="text-muted text-[11px] font-semibold">
                        {formatDateFR(r.createdAt, "dd/MM/yy")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}

function NewReclamationDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [description, setDescription] = useState("");
  const [severite, setSeverite] = useState<Severite>("moyenne");

  const { data: clients } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewReclamationInput = {
        clientId: clientId || null,
        objet,
        description,
        severite,
      };
      return createReclamation(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reclamations"] });
      toast.success("Réclamation enregistrée");
      setClientId("");
      setObjet("");
      setDescription("");
      setSeverite("moyenne");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé." : `Échec : ${msg}`);
    },
  });

  const valid = objet.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nouvelle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvelle réclamation</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Client</label>
            <select
              className={field}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Aucun / non client —</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Objet *</label>
            <input
              className={field}
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex. Agent absent au poste de nuit"
              autoFocus
            />
          </div>
          <div>
            <label className={label}>Gravité</label>
            <select
              className={field}
              value={severite}
              onChange={(e) => setSeverite(e.target.value as Severite)}
            >
              <option value="elevee">Élevée</option>
              <option value="moyenne">Moyenne</option>
              <option value="faible">Faible</option>
            </select>
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea
              className={`${field} min-h-[80px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails de la réclamation…"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
