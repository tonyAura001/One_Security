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
import { createContract, type NewContractInput } from "@/lib/supabase/data/contracts";
import { fetchClientOptions, fetchSiteOptions, type Opt } from "@/lib/supabase/data/options";

const TYPES: { v: string; l: string }[] = [
  { v: "PRESTATION", l: "Prestation" },
  { v: "MISE_A_DISPOSITION", l: "Mise à disposition" },
  { v: "PONCTUEL", l: "Ponctuel" },
];
const FREQUENCES: { v: string; l: string }[] = [
  { v: "MENSUELLE", l: "Mensuelle" },
  { v: "TRIMESTRIELLE", l: "Trimestrielle" },
  { v: "SEMESTRIELLE", l: "Semestrielle" },
  { v: "ANNUELLE", l: "Annuelle" },
  { v: "PONCTUELLE", l: "Ponctuelle" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

const today = new Date().toISOString().slice(0, 10);

export function NewContractDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery<Opt[]>({
    queryKey: ["client-options"],
    queryFn: fetchClientOptions,
  });
  const { data: sites = [] } = useQuery<Opt[]>({
    queryKey: ["site-options"],
    queryFn: fetchSiteOptions,
  });

  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [type, setType] = useState("PRESTATION");
  const [montantHT, setMontantHT] = useState(0);
  const [tauxTVA, setTauxTVA] = useState(20);
  const [frequenceFacturation, setFrequenceFacturation] = useState("MENSUELLE");
  const [dateSignature, setDateSignature] = useState(today);
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setClientId("");
    setSiteId("");
    setType("PRESTATION");
    setMontantHT(0);
    setTauxTVA(20);
    setFrequenceFacturation("MENSUELLE");
    setDateSignature(today);
    setDateDebut(today);
    setDateFin("");
    setDescription("");
  }

  const mutation = useMutation({
    mutationFn: () =>
      createContract({
        clientId,
        siteId,
        type,
        montantHT,
        tauxTVA,
        frequenceFacturation,
        dateSignature,
        dateDebut,
        dateFin: dateFin || null,
        description: description || null,
      } satisfies NewContractInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrat créé");
      reset();
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG/RP/RF peuvent créer un contrat."
          : `Échec de la création : ${msg}`,
      );
    },
  });

  const valid = clientId !== "" && siteId !== "" && montantHT > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" strokeWidth={2.4} />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau contrat</DialogTitle>
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
              <label className={label}>Client *</label>
              <select
                className={field}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="" disabled>
                  Sélectionner un client
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Site *</label>
              <select
                className={field}
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="" disabled>
                  Sélectionner un site
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Type</label>
            <select
              className={field}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Montant HT *</label>
              <input
                type="number"
                className={field}
                value={montantHT}
                onChange={(e) => setMontantHT(Number(e.target.value))}
              />
            </div>
            <div>
              <label className={label}>Taux TVA (%)</label>
              <input
                type="number"
                className={field}
                value={tauxTVA}
                onChange={(e) => setTauxTVA(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className={label}>Fréquence</label>
            <select
              className={field}
              value={frequenceFacturation}
              onChange={(e) => setFrequenceFacturation(e.target.value)}
            >
              {FREQUENCES.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Date de signature</label>
              <input
                type="date"
                className={field}
                value={dateSignature}
                onChange={(e) => setDateSignature(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Date de début</label>
              <input
                type="date"
                className={field}
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label}>Date de fin</label>
            <input
              type="date"
              className={field}
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Description</label>
            <input
              className={field}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. Gardiennage site portuaire"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
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
