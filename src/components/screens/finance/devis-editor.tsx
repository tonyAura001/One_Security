"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import { formatDateFR, formatFCFA } from "@/lib/format";
import { createQuote } from "@/lib/supabase/data/quotes";
import { createDocument } from "@/lib/supabase/data/documents";
import { fetchProspectOptions, type Opt } from "@/lib/supabase/data/options";
import { DevisTemplate } from "@/components/documents/devis-template";
import { montantEnLettres } from "@/lib/documents/montant-lettres";
import type { DevisData, DevisLigne } from "@/lib/documents/types";

const field =
  "w-full rounded-[9px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[10.5px] font-bold tracking-[0.3px] uppercase";

const num = (v: string | number): number => Number(v) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const defaultNumero = () =>
  `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

/** Ligne d'édition (métier sécurité). Montant = nbre agents × prix unitaire. */
interface EditorLigne {
  detail: string;
  nbreAgent: string;
  duree: string;
  prixUnitaire: number;
}

function emptyLigne(): EditorLigne {
  return {
    detail: "Agent de sécurité — poste de jour",
    nbreAgent: "1",
    duree: "12H/24H",
    prixUnitaire: 0,
  };
}

function ligneMontant(l: EditorLigne): number {
  return Math.round((num(l.nbreAgent) || 0) * (Number(l.prixUnitaire) || 0));
}

const STATUTS: { v: string; l: string }[] = [
  { v: "BROUILLON", l: "Brouillon" },
  { v: "ENVOYE", l: "Envoyé" },
  { v: "ACCEPTE", l: "Accepté" },
  { v: "REFUSE", l: "Refusé" },
];

/**
 * Éditeur de devis pleine page — expérience unifiée (Finance + secrétariat).
 * Édition à gauche, aperçu A4 « charte ONE SECURITY » en direct à droite,
 * export PDF par impression. Montant direct TTC, fidèle au devis papier réel.
 */
export function DevisEditor({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();

  const { data: prospects } = useQuery({
    queryKey: ["prospect-options"],
    queryFn: fetchProspectOptions,
  });
  const prospectOpts: Opt[] = prospects ?? [];

  const [prospectId, setProspectId] = useState("");
  const [clientLibre, setClientLibre] = useState("");
  const [objet, setObjet] = useState("");
  const [numero, setNumero] = useState(defaultNumero());
  const [dateEmission, setDateEmission] = useState(today());
  const [validite, setValidite] = useState(inDays(30));
  const [statut, setStatut] = useState("BROUILLON");
  const [lieu, setLieu] = useState("");
  const [lignes, setLignes] = useState<EditorLigne[]>([emptyLigne()]);
  const [notes, setNotes] = useState("");

  const prospectLabel = prospectOpts.find((o) => o.id === prospectId)?.label ?? "";
  const clientLabel = clientLibre.trim() || prospectLabel || "—";

  const total = useMemo(
    () => lignes.reduce((s, l) => s + ligneMontant(l), 0),
    [lignes],
  );

  // Données mappées vers le gabarit A4.
  const devisData: DevisData = useMemo(() => {
    const templateLignes: DevisLigne[] = lignes.map((l) => ({
      detail: l.detail,
      nbreAgent: num(l.nbreAgent),
      duree: l.duree,
      prixUnitaire: Number(l.prixUnitaire) || 0,
    }));
    return {
      client: clientLabel,
      date: dateEmission,
      lieu: lieu || "—",
      lignes: templateLignes,
    };
  }, [lignes, clientLabel, dateEmission, lieu]);

  const dateLabel = formatDateFR(dateEmission, "dd/MM/yyyy");
  const valid = (prospectId !== "" || clientLibre.trim() !== "") && total > 0;

  function setLigne(i: number, patch: Partial<EditorLigne>) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function addLigne() {
    setLignes((ls) => [...ls, emptyLigne()]);
  }
  function removeLigne(i: number) {
    setLignes((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const usedNumero = await createQuote({
        prospectId: prospectId || null,
        totalHT: total,
        tauxTVA: 0, // montant direct TTC
        statut,
        dateEnvoi: dateEmission,
        numero,
      });
      // Archivage best-effort du devis détaillé (lignes, lieu) en Document.
      try {
        await createDocument({
          type: "devis",
          titre: `Devis ${usedNumero} — ${clientLabel}`,
          numero: usedNumero,
          clientId: null,
          donnees: {
            ...devisData,
            ...(objet.trim() ? { objet: objet.trim() } : {}),
            ...(validite ? { validite } : {}),
            ...(notes.trim() ? { notesInternes: notes.trim() } : {}),
          },
        });
      } catch {
        /* le document détaillé est optionnel */
      }
      return usedNumero;
    },
    onSuccess: (usedNumero) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Devis créé", `${usedNumero} · ${formatFCFA(total)}`);
      onClose();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG, RP et Manager peuvent créer un devis."
          : `Échec : ${msg}`,
      );
    },
  });

  return (
    <ScreenContainer>
      {/* Barre d'outils (non imprimée) */}
      <div className="doc-toolbar mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <div className="min-w-0">
          <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">
            Nouveau devis
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            Charte ONE SECURITY · aperçu en direct
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Exporter PDF
          </Button>
          <Button
            size="sm"
            onClick={() => valid && mutation.mutate()}
            disabled={!valid || mutation.isPending}
          >
            <Save className="size-4" />
            {mutation.isPending ? "Enregistrement…" : "Créer le devis"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_1fr]">
        {/* ── Colonne d'édition (non imprimée) ── */}
        <div className="doc-toolbar flex flex-col gap-4">
          {/* Informations */}
          <Card className="p-4">
            <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
              Informations
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={label}>Client / prospect</label>
                <select
                  className={field}
                  value={prospectId}
                  onChange={(e) => setProspectId(e.target.value)}
                >
                  <option value="">— Sélectionner un prospect —</option>
                  {prospectOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>
                  Nom du client (si hors liste)
                </label>
                <input
                  className={field}
                  value={clientLibre}
                  onChange={(e) => setClientLibre(e.target.value)}
                  placeholder="Ex : Madame Diop"
                />
              </div>
              <div>
                <label className={label}>Objet du devis</label>
                <input
                  className={field}
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="Ex : Prestation sécurité — Terrain ACAPES"
                />
              </div>
              <div>
                <label className={label}>Lieu / site</label>
                <input
                  className={field}
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder="Ex : Terrain ACAPES, Dakar"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Numéro</label>
                  <input
                    className={field}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Statut</label>
                  <select
                    className={field}
                    value={statut}
                    onChange={(e) => setStatut(e.target.value)}
                  >
                    {STATUTS.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Date d&apos;émission</label>
                  <input
                    type="date"
                    className={field}
                    value={dateEmission}
                    onChange={(e) => setDateEmission(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Valable jusqu&apos;au</label>
                  <input
                    type="date"
                    className={field}
                    value={validite}
                    onChange={(e) => setValidite(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Lignes du devis */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-muted text-[11px] font-bold tracking-[0.5px] uppercase">
                Lignes du devis
              </div>
              <Button size="xs" variant="outline" onClick={addLigne}>
                <Plus className="size-3.5" /> Ajouter
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {lignes.map((l, i) => (
                <div
                  key={i}
                  className="border-border bg-surface2/40 rounded-lg border p-2.5"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <input
                      className={`${field} flex-1`}
                      placeholder="Ex : Agent de Protection Rapprochée"
                      value={l.detail}
                      onChange={(e) => setLigne(i, { detail: e.target.value })}
                    />
                    {lignes.length > 1 && (
                      <button
                        type="button"
                        aria-label="Retirer la ligne"
                        className="text-muted hover:text-danger mt-1.5 flex-none transition-colors"
                        onClick={() => removeLigne(i)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label}>Nbre agents</label>
                      <input
                        type="number"
                        min={0}
                        className={field}
                        value={l.nbreAgent}
                        onChange={(e) =>
                          setLigne(i, { nbreAgent: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>Durée/jr (H)</label>
                      <input
                        className={field}
                        value={l.duree}
                        onChange={(e) => setLigne(i, { duree: e.target.value })}
                        placeholder="12H/24H"
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 items-end gap-2">
                    <div>
                      <label className={label}>Prix unit. (FCFA)</label>
                      <input
                        type="number"
                        min={0}
                        className={field}
                        value={l.prixUnitaire}
                        onChange={(e) =>
                          setLigne(i, { prixUnitaire: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="pb-2 text-right">
                      <span className="text-muted mr-2 text-[11px] font-semibold">
                        Montant
                      </span>
                      <span className="text-foreground tnum text-[14px] font-extrabold">
                        {formatFCFA(ligneMontant(l))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes / conditions */}
          <Card className="p-4">
            <div className="text-muted mb-2 text-[11px] font-bold tracking-[0.5px] uppercase">
              Notes / conditions
            </div>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              placeholder="Conditions de paiement, délais d'exécution…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>

          {/* Récapitulatif */}
          <Card className="p-4">
            <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
              Récapitulatif
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground text-[14px] font-extrabold">
                Total TTC
              </span>
              <span className="text-accent tnum text-[17px] font-extrabold">
                {formatFCFA(total)}
              </span>
            </div>
            {total > 0 && (
              <div className="text-muted mt-1.5 text-[10.5px] font-semibold">
                Arrêté à : {montantEnLettres(total)}
              </div>
            )}
            <Button
              className="mt-4 w-full"
              size="sm"
              onClick={() => valid && mutation.mutate()}
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending ? "Enregistrement…" : "Créer le devis"}
            </Button>
            {!valid && (
              <div className="text-muted mt-2 text-center text-[11px] font-semibold">
                Choisissez un client et saisissez au moins un montant.
              </div>
            )}
          </Card>
        </div>

        {/* ── Aperçu A4 en direct (imprimé) ── */}
        <div>
          <div className="doc-toolbar mb-2 flex items-center gap-2">
            <StatusPill variant="info" dot>
              Aperçu en direct
            </StatusPill>
            <span className="text-muted inline-flex items-center gap-1.5 text-[11.5px] font-semibold">
              <FileText className="size-3.5" /> Document généré automatiquement
            </span>
          </div>
          <div className="overflow-x-auto">
            <div
              id="doc-print"
              className="origin-top scale-[0.62] sm:scale-75 lg:scale-90 xl:scale-100"
            >
              <DevisTemplate
                data={devisData}
                numero={numero}
                dateLabel={dateLabel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Impression : n'imprime que le document A4. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #doc-print, #doc-print * { visibility: visible !important; }
          #doc-print { position: absolute; left: 0; top: 0; transform: none !important; }
          .doc-toolbar { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </ScreenContainer>
  );
}
