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
  createEncaissement,
  createDepense,
  type NewEncaissementInput,
  type NewDepenseInput,
} from "@/lib/supabase/data/treasury";
import {
  fetchCompteOptions,
  fetchInvoiceOptions,
  type Opt,
  type InvoiceOpt,
} from "@/lib/supabase/data/options";

type MovementType = "encaissement" | "depense";

const CATEGORIES: { v: string; l: string }[] = [
  { v: "CARBURANT", l: "Carburant" },
  { v: "FOURNITURES", l: "Fournitures" },
  { v: "ASSURANCES", l: "Assurances" },
  { v: "LOYER", l: "Loyer" },
  { v: "MAINTENANCE", l: "Maintenance" },
  { v: "EQUIPEMENT", l: "Équipement" },
  { v: "AUTRE", l: "Autre" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

const today = () => new Date().toISOString().slice(0, 10);

export function NewMovementDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MovementType>("encaissement");

  // Encaissement fields
  const [factureId, setFactureId] = useState("");
  const [encCompteId, setEncCompteId] = useState("");
  const [montant, setMontant] = useState(0);
  const [encDate, setEncDate] = useState(today);
  const [reference, setReference] = useState("");

  // Dépense fields
  const [objet, setObjet] = useState("");
  const [montantHT, setMontantHT] = useState(0);
  const [tva, setTva] = useState(0);
  const [categorie, setCategorie] = useState(CATEGORIES[0].v);
  const [depDate, setDepDate] = useState(today);
  const [depCompteId, setDepCompteId] = useState("");
  const [paid, setPaid] = useState(false);

  const { data: comptes } = useQuery<Opt[]>({
    queryKey: ["compte-options"],
    queryFn: fetchCompteOptions,
  });
  const { data: factures } = useQuery<InvoiceOpt[]>({
    queryKey: ["invoice-options"],
    queryFn: fetchInvoiceOptions,
  });
  const compteOptions = comptes ?? [];
  const invoiceOptions = factures ?? [];

  function reset() {
    setType("encaissement");
    setFactureId("");
    setEncCompteId("");
    setMontant(0);
    setEncDate(today());
    setReference("");
    setObjet("");
    setMontantHT(0);
    setTva(0);
    setCategorie(CATEGORIES[0].v);
    setDepDate(today());
    setDepCompteId("");
    setPaid(false);
  }

  function handleSuccess() {
    qc.invalidateQueries({ queryKey: ["treasury-accounts"] });
    qc.invalidateQueries({ queryKey: ["treasury-movements"] });
    toast.success("Mouvement enregistré");
    reset();
    setOpen(false);
  }

  function handleError(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const denied = /row-level security|policy|permission/i.test(msg);
    toast.error(
      denied
        ? "Accès refusé : seuls DG/RF/Comptable peuvent créer un mouvement."
        : `Échec de l'enregistrement : ${msg}`,
    );
  }

  const encMutation = useMutation({
    mutationFn: (i: NewEncaissementInput) => createEncaissement(i),
    onSuccess: handleSuccess,
    onError: handleError,
  });
  const depMutation = useMutation({
    mutationFn: (i: NewDepenseInput) => createDepense(i),
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const pending = encMutation.isPending || depMutation.isPending;

  const encValid = factureId !== "" && encCompteId !== "" && montant > 0;
  const depValid = objet.trim().length > 0 && montantHT > 0;
  const valid = type === "encaissement" ? encValid : depValid;

  function submit() {
    if (type === "encaissement") {
      if (!encValid) return;
      encMutation.mutate({
        factureId,
        compteBancaireId: encCompteId,
        montant,
        dateEncaissement: encDate,
        reference: reference.trim() || undefined,
      });
    } else {
      if (!depValid) return;
      depMutation.mutate({
        objet: objet.trim(),
        montantHT,
        montantTVA: tva,
        categorie,
        dateEngagement: depDate,
        datePaiement: paid ? depDate : null,
        compteBancaireId: depCompteId || null,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Mouvement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouveau mouvement de trésorerie</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Type de mouvement</label>
            <select
              className={field}
              value={type}
              onChange={(e) => setType(e.target.value as MovementType)}
            >
              <option value="encaissement">Encaissement</option>
              <option value="depense">Dépense</option>
            </select>
          </div>

          {type === "encaissement" ? (
            <>
              <div>
                <label className={label}>Facture *</label>
                <select
                  className={field}
                  value={factureId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFactureId(id);
                    const f = invoiceOptions.find((o) => o.id === id);
                    if (f && montant === 0) setMontant(f.amount);
                  }}
                >
                  <option value="" disabled>
                    Sélectionner une facture…
                  </option>
                  {invoiceOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Compte *</label>
                <select
                  className={field}
                  value={encCompteId}
                  onChange={(e) => setEncCompteId(e.target.value)}
                >
                  <option value="" disabled>
                    Sélectionner un compte…
                  </option>
                  {compteOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Montant *</label>
                  <input
                    className={field}
                    type="number"
                    value={montant}
                    onChange={(e) => setMontant(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={label}>Date</label>
                  <input
                    className={field}
                    type="date"
                    value={encDate}
                    onChange={(e) => setEncDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Référence</label>
                <input
                  className={field}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex. VIR-2026-014"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={label}>Objet *</label>
                <input
                  className={field}
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="Ex. Carburant flotte véhicules"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Montant HT *</label>
                  <input
                    className={field}
                    type="number"
                    value={montantHT}
                    onChange={(e) => setMontantHT(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={label}>TVA</label>
                  <input
                    className={field}
                    type="number"
                    value={tva}
                    onChange={(e) => setTva(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Catégorie</label>
                <select
                  className={field}
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.v} value={c.v}>
                      {c.l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Date</label>
                  <input
                    className={field}
                    type="date"
                    value={depDate}
                    onChange={(e) => setDepDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Compte</label>
                  <select
                    className={field}
                    value={depCompteId}
                    onChange={(e) => setDepCompteId(e.target.value)}
                  >
                    <option value="">— Aucun —</option>
                    {compteOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                />
                Payée
              </label>
            </>
          )}

          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
