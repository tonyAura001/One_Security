"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
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
import { formatFCFA, formatDateFR } from "@/lib/format";
import { fetchAllCandidatures } from "@/lib/supabase/data/recrutement";
import {
  fetchContratsTravail,
  createContratTravail,
  updateContratTravailStatut,
  type ContractType,
  type ContractStatus,
  type NewContratTravailInput,
} from "@/lib/supabase/data/rh-emploi";

const STATUS_META: Record<ContractStatus, { label: string; variant: PillVariant }> = {
  signe: { label: "Signé", variant: "success" },
  attente: { label: "En attente", variant: "warning" },
  brouillon: { label: "Brouillon", variant: "neutral" },
};
const NEXT: Record<ContractStatus, ContractStatus | null> = {
  brouillon: "attente",
  attente: "signe",
  signe: null,
};

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function RecruteurContratsTravail() {
  const qc = useQueryClient();
  const { data: contracts = [] } = useQuery({
    queryKey: ["contrats-travail"],
    queryFn: fetchContratsTravail,
  });
  const masseSalariale = contracts.reduce((s, c) => s + c.salaire, 0);

  const advance = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: ContractStatus }) =>
      updateContratTravailStatut(id, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contrats-travail"] });
      toast.success("Statut du contrat mis à jour");
    },
    onError: () => toast.error("Modification refusée (accès requis)."),
  });

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          CONTRATS DE TRAVAIL · {contracts.length} DOCUMENTS · MASSE SALARIALE{" "}
          {formatFCFA(masseSalariale)}
        </div>
        <NewContratDialog />
      </div>

      <Card className="p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Contrats de travail
        </div>

        {contracts.length === 0 ? (
          <EmptyState
            title="Aucun contrat de travail"
            description="Créez le contrat d'un agent recruté."
          />
        ) : (
          <>
            <div className="border-border text-muted hidden items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] sm:flex">
              <div className="w-[60px]" />
              <div className="flex-1">EMPLOYÉ · POSTE</div>
              <div className="w-[70px] text-center">TYPE</div>
              <div className="w-[150px]">SITE AFFECTÉ</div>
              <div className="w-[120px] text-right">SALAIRE BRUT</div>
              <div className="w-[140px] text-center">STATUT</div>
            </div>

            <div className="flex flex-col">
              {contracts.map((c) => {
                const next = NEXT[c.statut];
                return (
                  <div
                    key={c.id}
                    className="border-border flex flex-wrap items-center gap-3.5 border-b px-1 py-3 last:border-b-0"
                  >
                    <div className="hidden w-[60px] sm:block">
                      <IconTile icon={FileText} tone="accent" size={34} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-accent/14 text-accent flex size-9 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold">
                          {initials(c.employe)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-foreground truncate text-[13px] font-bold">
                            {c.employe}
                          </div>
                          <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">
                            {c.poste ?? "—"}
                            {c.dateDebut ? ` · dès le ${formatDateFR(c.dateDebut, "d MMM yyyy")}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-[70px] text-center">
                      <StatusPill variant={c.type === "CDI" ? "info" : "violet"} uppercase>
                        {c.type}
                      </StatusPill>
                    </div>
                    <div className="text-muted w-[150px] truncate text-[12px] font-semibold">
                      {c.site ?? "—"}
                    </div>
                    <div className="text-foreground w-[120px] text-right text-[13px] font-extrabold">
                      {formatFCFA(c.salaire)}
                    </div>
                    <div className="flex w-[140px] items-center justify-center gap-2">
                      <StatusPill variant={STATUS_META[c.statut].variant} uppercase>
                        {STATUS_META[c.statut].label}
                      </StatusPill>
                      {next && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={advance.isPending}
                          onClick={() => advance.mutate({ id: c.id, statut: next })}
                        >
                          {next === "attente" ? "Soumettre" : "Signer"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

function NewContratDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [candidatureId, setCandidatureId] = useState("");
  const [employe, setEmploye] = useState("");
  const [poste, setPoste] = useState("");
  const [type, setType] = useState<ContractType>("CDI");
  const [site, setSite] = useState("");
  const [salaire, setSalaire] = useState("");
  const [dateDebut, setDateDebut] = useState("");

  const { data: candidatures = [] } = useQuery({
    queryKey: ["all-candidatures"],
    queryFn: fetchAllCandidatures,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewContratTravailInput = {
        candidatureId: candidatureId || null,
        employe,
        poste,
        type,
        site,
        salaire: Number(salaire.replace(/\s/g, "")) || 0,
        dateDebut: dateDebut || null,
      };
      return createContratTravail(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contrats-travail"] });
      toast.success("Contrat de travail créé");
      setCandidatureId("");
      setEmploye("");
      setPoste("");
      setSite("");
      setSalaire("");
      setDateDebut("");
      setType("CDI");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé (DG/RH/Manager)." : `Échec : ${msg}`);
    },
  });

  const valid = employe.trim().length > 0 && Number(salaire.replace(/\s/g, "")) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={15} strokeWidth={2.2} /> Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nouveau contrat de travail</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Candidat recruté</label>
            <select
              className={field}
              value={candidatureId}
              onChange={(e) => {
                setCandidatureId(e.target.value);
                const c = candidatures.find((x) => x.id === e.target.value);
                if (c) setEmploye(c.label.split(" — ")[0] ?? c.label);
              }}
            >
              <option value="">— Saisir manuellement —</option>
              {candidatures.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Employé *</label>
            <input className={field} value={employe} onChange={(e) => setEmploye(e.target.value)} placeholder="Nom et prénom" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Poste</label>
              <input className={field} value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Agent de sécurité" />
            </div>
            <div>
              <label className={label}>Type</label>
              <select className={field} value={type} onChange={(e) => setType(e.target.value as ContractType)}>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Site affecté</label>
              <input className={field} value={site} onChange={(e) => setSite(e.target.value)} placeholder="Ex. CBAO Indépendance" />
            </div>
            <div>
              <label className={label}>Salaire brut (FCFA) *</label>
              <input inputMode="numeric" className={field} value={salaire} onChange={(e) => setSalaire(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            </div>
          </div>
          <div>
            <label className={label}>Date de début</label>
            <input type="date" className={field} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Annuler</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer le contrat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
