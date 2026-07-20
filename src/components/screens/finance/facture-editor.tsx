"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
  FileText,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import { formatDateFR, formatFCFA } from "@/lib/format";
import {
  createInvoice,
  fetchInvoiceDetail,
  updateInvoice,
  type InvoiceDetail,
} from "@/lib/supabase/data/invoices";
import {
  createDocument,
  fetchFactureProforma,
} from "@/lib/supabase/data/documents";
import { fetchClientOptions, type Opt } from "@/lib/supabase/data/options";
import { FactureTemplate } from "@/components/documents/facture-template";
import { ONE_SECURITY } from "@/lib/one-security";
import type {
  DocumentData,
  FactureData,
  FactureLigne,
} from "@/lib/documents/types";

const field =
  "w-full rounded-[9px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[10.5px] font-bold tracking-[0.3px] uppercase";

const num = (v: string | number): number => Number(v) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const defaultNumero = () =>
  `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

/**
 * Ligne de facturation (métier sécurité). Le montant est CALCULÉ :
 * postes × agents/poste × nombre de jours × prix unitaire journalier.
 */
interface EditorLigne {
  detail: string;
  nbrePostes: string;
  nbreAPS: string;
  dureeJr: string;
  dureeJrs: string;
  prixUnitaire: number;
}

function emptyLigne(): EditorLigne {
  return {
    detail: "Gardiennage — poste de jour",
    nbrePostes: "1",
    nbreAPS: "1",
    dureeJr: "12H/24H",
    dureeJrs: "30",
    prixUnitaire: 0,
  };
}

/** Montant HT d'une ligne = postes × agents × jours × prix unitaire. */
function ligneMontant(l: EditorLigne): number {
  const postes = num(l.nbrePostes) || 1;
  const agents = num(l.nbreAPS) || 1;
  const jours = num(l.dureeJrs) || 1;
  return Math.round(postes * agents * jours * (Number(l.prixUnitaire) || 0));
}

/** Reconstruit une ligne d'éditeur depuis une ligne de proforma archivée. */
function fromFactureLigne(l: FactureLigne): EditorLigne {
  const postes = num(l.nbrePostes) || 1;
  const agents = num(l.nbreAPS) || 1;
  const jours = num(l.dureeJrs) || 1;
  return {
    detail: l.detail ?? "",
    nbrePostes: l.nbrePostes || "1",
    nbreAPS: l.nbreAPS || "1",
    dureeJr: l.dureeJr || "",
    dureeJrs: l.dureeJrs || "1",
    prixUnitaire: Math.round((Number(l.montant) || 0) / (postes * agents * jours)),
  };
}

const STATUTS: { v: string; l: string }[] = [
  { v: "EMISE", l: "Émise" },
  { v: "ENVOYEE", l: "Envoyée" },
  { v: "PAYEE", l: "Payée" },
];

interface EditorInitial {
  clientId: string;
  numero: string;
  objet: string;
  dateEmission: string;
  dateEcheance: string;
  tauxTVA: number;
  statut: string;
  lignes: EditorLigne[];
  options: string[];
  notes: string;
}

/** Valeurs par défaut pour une nouvelle facture. */
function createInitial(): EditorInitial {
  return {
    clientId: "",
    numero: defaultNumero(),
    objet: "",
    dateEmission: today(),
    dateEcheance: inDays(30),
    tauxTVA: 18,
    statut: "EMISE",
    lignes: [emptyLigne()],
    options: [...ONE_SECURITY.optionsFacturation],
    notes: "",
  };
}

/** Valeurs initiales dérivées d'une facture existante (+ proforma archivé). */
function editInitial(
  detail: InvoiceDetail,
  proforma: DocumentData | null,
): EditorInitial {
  const f = proforma as (FactureData & { notesInternes?: string }) | null;
  const hasLines = !!f && Array.isArray(f.lignes) && f.lignes.length > 0;
  return {
    clientId: detail.clientId,
    numero: detail.numero,
    objet: "",
    dateEmission: detail.dateEmission.slice(0, 10),
    dateEcheance: detail.dateEcheance.slice(0, 10),
    tauxTVA:
      detail.montantHT > 0
        ? Math.round((detail.montantTVA / detail.montantHT) * 100)
        : 18,
    statut: detail.statut,
    lignes: hasLines
      ? f!.lignes.map(fromFactureLigne)
      : [
          {
            detail: "Prestation de sécurité",
            nbrePostes: "1",
            nbreAPS: "1",
            dureeJr: "—",
            dureeJrs: "1",
            prixUnitaire: detail.montantHT,
          },
        ],
    options:
      hasLines && Array.isArray(f!.options)
        ? f!.options
        : [...ONE_SECURITY.optionsFacturation],
    notes: hasLines && f!.notesInternes ? f!.notesInternes : "",
  };
}

/**
 * Éditeur de facture pleine page. Charge d'abord la facture à éditer (le cas
 * échéant), puis monte l'éditeur avec l'état initial correspondant.
 */
export function FactureEditor({
  onClose,
  invoiceId,
}: {
  onClose: () => void;
  invoiceId?: string;
}) {
  const isEdit = !!invoiceId;

  // Édition : charge la facture + son proforma archivé (best-effort).
  const editQ = useQuery({
    queryKey: ["invoice-edit", invoiceId],
    enabled: isEdit,
    queryFn: async () => {
      const detail = await fetchInvoiceDetail(invoiceId!);
      const proforma = await fetchFactureProforma(detail.numero);
      return { detail, proforma };
    },
  });

  const initial = useMemo<EditorInitial | null>(
    () =>
      isEdit
        ? editQ.data
          ? editInitial(editQ.data.detail, editQ.data.proforma)
          : null
        : createInitial(),
    [isEdit, editQ.data],
  );

  if (isEdit && (editQ.isLoading || !initial)) {
    return (
      <ScreenContainer>
        <div className="text-muted flex items-center justify-center gap-2 py-20 text-[13px] font-semibold">
          <Loader2 className="size-4 animate-spin" /> Chargement de la facture…
        </div>
      </ScreenContainer>
    );
  }

  return (
    <FactureEditorInner
      key={invoiceId ?? "new"}
      initial={initial ?? createInitial()}
      isEdit={isEdit}
      invoiceId={invoiceId}
      onClose={onClose}
    />
  );
}

function FactureEditorInner({
  initial,
  isEdit,
  invoiceId,
  onClose,
}: {
  initial: EditorInitial;
  isEdit: boolean;
  invoiceId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["client-options"],
    queryFn: fetchClientOptions,
  });
  const clientOpts: Opt[] = clients ?? [];

  const [clientId, setClientId] = useState(initial.clientId);
  const [numero, setNumero] = useState(initial.numero);
  const [objet, setObjet] = useState(initial.objet);
  const [dateEmission, setDateEmission] = useState(initial.dateEmission);
  const [dateEcheance, setDateEcheance] = useState(initial.dateEcheance);
  const [tauxTVA, setTauxTVA] = useState(initial.tauxTVA);
  const [statut, setStatut] = useState(initial.statut);
  const [lignes, setLignes] = useState<EditorLigne[]>(initial.lignes);
  const [options, setOptions] = useState<string[]>(initial.options);
  const [notes, setNotes] = useState(initial.notes);

  const clientLabel =
    clientOpts.find((o) => o.id === clientId)?.label ?? "";

  // Totaux calculés en direct.
  const ht = useMemo(
    () => lignes.reduce((s, l) => s + ligneMontant(l), 0),
    [lignes],
  );
  const tva = Math.round((ht * tauxTVA) / 100);
  const ttc = ht + tva;

  // Données mappées vers le gabarit A4 (charte ONE SECURITY).
  const factureData: FactureData = useMemo(() => {
    const templateLignes: FactureLigne[] = lignes.map((l) => ({
      detail: l.detail,
      nbrePostes: l.nbrePostes,
      nbreAPS: l.nbreAPS,
      dureeJr: l.dureeJr,
      dureeJrs: l.dureeJrs,
      montant: ligneMontant(l),
    }));
    return {
      client: clientLabel || "—",
      date: dateEmission,
      lignes: templateLignes,
      tauxTVA,
      options: options.filter((o) => o.trim() !== ""),
    };
  }, [lignes, clientLabel, dateEmission, tauxTVA, options]);

  const dateLabel = formatDateFR(dateEmission, "dd/MM/yyyy");
  const valid = clientId !== "" && ht > 0;

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
      if (isEdit) {
        await updateInvoice(invoiceId!, {
          clientId,
          montantHT: ht,
          tauxTVA,
          dateEmission,
          dateEcheance,
          statut,
        });
        return;
      }
      await createInvoice({
        clientId,
        montantHT: ht,
        tauxTVA,
        dateEmission,
        dateEcheance,
        statut,
      });
      // Archivage best-effort du proforma détaillé (n'échoue pas la création).
      try {
        await createDocument({
          type: "facture_proforma",
          titre: `Facture ${numero} — ${clientLabel || "client"}`,
          numero,
          clientId,
          donnees: {
            ...factureData,
            ...(notes.trim() ? { notesInternes: notes.trim() } : {}),
          },
        });
      } catch {
        /* le document détaillé est optionnel */
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success(
        isEdit ? "Facture modifiée" : "Facture créée",
        `${numero} · ${formatFCFA(ttc)}`,
      );
      onClose();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG, RF et Comptable peuvent gérer une facture."
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
            {isEdit ? "Modifier la facture" : "Nouvelle facture"}
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
            {mutation.isPending
              ? "Enregistrement…"
              : isEdit
                ? "Enregistrer"
                : "Créer la facture"}
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
                <label className={label}>Client *</label>
                <select
                  className={field}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="" disabled>
                    — Sélectionner un client —
                  </option>
                  {clientOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Objet / désignation</label>
                <input
                  className={field}
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="Ex : Prestation sécurité — Janvier 2026"
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
                  <label className={label}>TVA (%)</label>
                  <select
                    className={field}
                    value={tauxTVA}
                    onChange={(e) => setTauxTVA(Number(e.target.value))}
                  >
                    <option value={18}>18 % (standard Sénégal)</option>
                    <option value={0}>0 % (exonéré)</option>
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
                  <label className={label}>Date d&apos;échéance *</label>
                  <input
                    type="date"
                    className={field}
                    value={dateEcheance}
                    onChange={(e) => setDateEcheance(e.target.value)}
                  />
                </div>
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
          </Card>

          {/* Lignes de facturation */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-muted text-[11px] font-bold tracking-[0.5px] uppercase">
                Lignes de facturation
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
                      placeholder="Désignation de la prestation"
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className={label}>Postes</label>
                      <input
                        type="number"
                        min={0}
                        className={field}
                        value={l.nbrePostes}
                        onChange={(e) =>
                          setLigne(i, { nbrePostes: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>Agents</label>
                      <input
                        type="number"
                        min={0}
                        className={field}
                        value={l.nbreAPS}
                        onChange={(e) =>
                          setLigne(i, { nbreAPS: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>Durée/jr</label>
                      <input
                        className={field}
                        value={l.dureeJr}
                        onChange={(e) =>
                          setLigne(i, { dureeJr: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>Jours</label>
                      <input
                        type="number"
                        min={0}
                        className={field}
                        value={l.dureeJrs}
                        onChange={(e) =>
                          setLigne(i, { dureeJrs: e.target.value })
                        }
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
                          setLigne(i, {
                            prixUnitaire: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="pb-2 text-right">
                      <span className="text-muted mr-2 text-[11px] font-semibold">
                        Montant HT
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

          {/* Options (charte) */}
          <Card className="p-4">
            <div className="text-muted mb-2 text-[11px] font-bold tracking-[0.5px] uppercase">
              Options affichées (une par ligne)
            </div>
            <textarea
              className={`${field} min-h-[80px] resize-y`}
              value={options.join("\n")}
              onChange={(e) => setOptions(e.target.value.split("\n"))}
            />
          </Card>

          {/* Notes internes */}
          <Card className="p-4">
            <div className="text-muted mb-2 text-[11px] font-bold tracking-[0.5px] uppercase">
              Notes internes
            </div>
            <textarea
              className={`${field} min-h-[70px] resize-y`}
              placeholder="Notes visibles uniquement en interne"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>

          {/* Récapitulatif */}
          <Card className="p-4">
            <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
              Récapitulatif
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted font-semibold">Total HT</span>
                <span className="text-foreground tnum font-bold">
                  {formatFCFA(ht)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted font-semibold">
                  TVA ({tauxTVA} %)
                </span>
                <span className="text-foreground tnum font-bold">
                  {formatFCFA(tva)}
                </span>
              </div>
              <div className="border-border mt-1 flex items-center justify-between border-t pt-2.5">
                <span className="text-foreground text-[14px] font-extrabold">
                  Total TTC
                </span>
                <span className="text-accent tnum text-[17px] font-extrabold">
                  {formatFCFA(ttc)}
                </span>
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              size="sm"
              onClick={() => valid && mutation.mutate()}
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer les modifications"
                  : "Créer la facture"}
            </Button>
            {!valid && (
              <div className="text-muted mt-2 text-center text-[11px] font-semibold">
                Sélectionnez un client et saisissez au moins un montant.
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
              <FactureTemplate
                data={factureData}
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
