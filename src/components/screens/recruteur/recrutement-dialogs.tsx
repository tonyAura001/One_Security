"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
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
  createPoste,
  createCandidature,
  type NewPosteInput,
  type NewCandidatureInput,
} from "@/lib/supabase/data/recrutement";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";
const CONTRATS = ["CDI", "CDD", "STAGE", "INTERIM", "FREELANCE"];

function onDenied(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const denied = /row-level security|policy|permission/i.test(msg);
  toast.error(
    denied
      ? "Accès refusé : réservé à l'équipe recrutement (DG, RH, Manager)."
      : `Échec : ${msg}`,
  );
}

/** Formulaire — Nouveau poste à pourvoir. */
export function NouveauPosteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<NewPosteInput>({
    titre: "",
    description: "",
    lieu: "",
    typeContrat: "CDI",
    salaireMin: null,
    salaireMax: null,
  });
  const m = useMutation({
    mutationFn: () => createPoste(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["postes"] });
      qc.invalidateQueries({ queryKey: ["recrutement-stats"] });
      toast.success(`Poste « ${f.titre.trim()} » créé`);
      setOpen(false);
      setF({ titre: "", description: "", lieu: "", typeContrat: "CDI", salaireMin: null, salaireMax: null });
    },
    onError: onDenied,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" strokeWidth={2.4} />
          Nouveau poste
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nouveau poste à pourvoir</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (f.titre.trim()) m.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className={label}>Titre du poste *</label>
            <input className={field} value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Ex. Agent de sécurité" autoFocus />
          </div>
          <div>
            <label className={label}>Description</label>
            <input className={field} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type de contrat</label>
              <select className={field} value={f.typeContrat} onChange={(e) => setF({ ...f, typeContrat: e.target.value })}>
                {CONTRATS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Lieu</label>
              <input className={field} value={f.lieu} onChange={(e) => setF({ ...f, lieu: e.target.value })} placeholder="Dakar" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Salaire min (FCFA)</label>
              <input type="number" className={field} value={f.salaireMin ?? ""} onChange={(e) => setF({ ...f, salaireMin: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className={label}>Salaire max (FCFA)</label>
              <input type="number" className={field} value={f.salaireMax ?? ""} onChange={(e) => setF({ ...f, salaireMax: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Annuler</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!f.titre.trim() || m.isPending}>
              {m.isPending ? "Création…" : "Créer le poste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Formulaire — Nouvelle candidature à un poste donné. */
export function NouvelleCandidatureDialog({ posteId }: { posteId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<NewCandidatureInput>({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    messageMotivation: "",
  });
  const m = useMutation({
    mutationFn: () => createCandidature(posteId, f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidatures", posteId] });
      qc.invalidateQueries({ queryKey: ["postes"] });
      qc.invalidateQueries({ queryKey: ["recrutement-stats"] });
      toast.success(`Candidature de ${f.prenom.trim()} ${f.nom.trim()} ajoutée`);
      setOpen(false);
      setF({ nom: "", prenom: "", email: "", telephone: "", messageMotivation: "" });
    },
    onError: onDenied,
  });
  const valid = f.nom.trim() && f.prenom.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="outline">
          <UserPlus className="size-3.5" strokeWidth={2.2} />
          Candidature
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nouvelle candidature</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) m.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Prénom *</label>
              <input className={field} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoFocus />
            </div>
            <div>
              <label className={label}>Nom *</label>
              <input className={field} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Email</label>
              <input className={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
            <div>
              <label className={label}>Téléphone</label>
              <input className={field} value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={label}>Message de motivation</label>
            <input className={field} value={f.messageMotivation} onChange={(e) => setF({ ...f, messageMotivation: e.target.value })} />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Annuler</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!valid || m.isPending}>
              {m.isPending ? "Ajout…" : "Ajouter la candidature"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
