"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Printer, Save, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatFCFA } from "@/lib/format";
import {
  createInvoice,
  fetchInvoiceDetail,
  updateInvoice,
  type InvoiceDetail,
} from "@/lib/supabase/data/invoices";
import { createDocument, fetchFactureProforma } from "@/lib/supabase/data/documents";
import { fetchClientOptions, type Opt } from "@/lib/supabase/data/options";
import { useCompanyIdentity } from "@/lib/documents/use-identity";
import { montantEnLettres } from "@/lib/documents/montant-lettres";
import { OS_COLORS } from "@/lib/one-security";
import { DocHeader, DocFooter, DocStamp, DocSignatureBlock } from "@/components/documents/doc-chrome";
import { EditField, EditFieldOnDark, EditArea } from "@/components/documents/doc-edit";
import type { DocumentData, FactureData, FactureLigne } from "@/lib/documents/types";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const defaultNumero = () =>
  `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
const fmt = (n: number) =>
  Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/\s/g, ".");

/** Ligne de facturation. Le montant est saisi directement sur le document. */
interface EditorLigne {
  detail: string;
  nbrePostes: string;
  nbreAPS: string;
  dureeJr: string;
  dureeJrs: string;
  montant: number;
}

function emptyLigne(): EditorLigne {
  return {
    detail: "Gardiennage — poste de jour",
    nbrePostes: "1",
    nbreAPS: "1",
    dureeJr: "12H/24H",
    dureeJrs: "30",
    montant: 0,
  };
}

function fromFactureLigne(l: FactureLigne): EditorLigne {
  return {
    detail: l.detail ?? "",
    nbrePostes: l.nbrePostes || "1",
    nbreAPS: l.nbreAPS || "1",
    dureeJr: l.dureeJr || "",
    dureeJrs: l.dureeJrs || "1",
    montant: Number(l.montant) || 0,
  };
}

const STATUTS = [
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
    options: [],
    notes: "",
  };
}

function editInitial(detail: InvoiceDetail, proforma: DocumentData | null): EditorInitial {
  const f = proforma as (FactureData & { notesInternes?: string }) | null;
  const hasLines = !!f && Array.isArray(f.lignes) && f.lignes.length > 0;
  return {
    clientId: detail.clientId,
    numero: detail.numero,
    objet: "",
    dateEmission: detail.dateEmission.slice(0, 10),
    dateEcheance: detail.dateEcheance.slice(0, 10),
    tauxTVA:
      detail.montantHT > 0 ? Math.round((detail.montantTVA / detail.montantHT) * 100) : 18,
    statut: detail.statut,
    lignes: hasLines
      ? f!.lignes.map(fromFactureLigne)
      : [{ detail: "Prestation de sécurité", nbrePostes: "1", nbreAPS: "1", dureeJr: "—", dureeJrs: "1", montant: detail.montantHT }],
    options: hasLines && Array.isArray(f!.options) ? f!.options : [],
    notes: hasLines && f!.notesInternes ? f!.notesInternes : "",
  };
}

export function FactureEditor({ onClose, invoiceId }: { onClose: () => void; invoiceId?: string }) {
  const isEdit = !!invoiceId;
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
    () => (isEdit ? (editQ.data ? editInitial(editQ.data.detail, editQ.data.proforma) : null) : createInitial()),
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
  const os = useCompanyIdentity();
  const navy = os.couleurPrincipale;
  const gold = os.couleurAccent;
  const grey = OS_COLORS.grey;

  const { data: clients } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });
  const clientOpts: Opt[] = clients ?? [];

  const [clientId, setClientId] = useState(initial.clientId);
  const [numero, setNumero] = useState(initial.numero);
  const [dateEmission, setDateEmission] = useState(initial.dateEmission);
  const [dateEcheance, setDateEcheance] = useState(initial.dateEcheance);
  const [tauxTVA, setTauxTVA] = useState(initial.tauxTVA);
  const [statut, setStatut] = useState(initial.statut);
  const [lignes, setLignes] = useState<EditorLigne[]>(initial.lignes);
  const [options, setOptions] = useState<string[]>(initial.options);
  const notes = initial.notes;

  const clientLabel = clientOpts.find((o) => o.id === clientId)?.label ?? "";
  const ht = useMemo(() => lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0), [lignes]);
  const tva = Math.round((ht * tauxTVA) / 100);
  const ttc = ht + tva;
  const valid = clientId !== "" && ht > 0;

  function setLigne(i: number, patch: Partial<EditorLigne>) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  const addLigne = () => setLignes((ls) => [...ls, emptyLigne()]);
  const removeLigne = (i: number) => setLignes((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  const factureData: FactureData = useMemo(
    () => ({
      client: clientLabel || "—",
      date: dateEmission,
      lignes: lignes.map((l) => ({
        detail: l.detail,
        nbrePostes: l.nbrePostes,
        nbreAPS: l.nbreAPS,
        dureeJr: l.dureeJr,
        dureeJrs: l.dureeJrs,
        montant: Number(l.montant) || 0,
      })),
      tauxTVA,
      options: options.filter((o) => o.trim() !== ""),
    }),
    [clientLabel, dateEmission, lignes, tauxTVA, options],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await updateInvoice(invoiceId!, { clientId, montantHT: ht, tauxTVA, dateEmission, dateEcheance, statut });
        return;
      }
      await createInvoice({ clientId, montantHT: ht, tauxTVA, dateEmission, dateEcheance, statut });
      try {
        await createDocument({
          type: "facture_proforma",
          titre: `Facture ${numero} — ${clientLabel || "client"}`,
          numero,
          clientId,
          donnees: { ...factureData, ...(notes.trim() ? { notesInternes: notes.trim() } : {}) },
        });
      } catch {
        /* proforma détaillé optionnel */
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success(isEdit ? "Facture modifiée" : "Facture créée", `${numero} · ${formatFCFA(ttc)}`);
      onClose();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé : seuls DG, RF et Comptable peuvent gérer une facture."
          : `Échec : ${msg}`,
      );
    },
  });

  const th = "px-2 py-2 text-center font-bold text-white";

  return (
    <ScreenContainer>
      {/* Barre d'action (non imprimée) */}
      <div className="doc-toolbar mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <div className="min-w-0">
          <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">
            {isEdit ? "Modifier la facture" : "Nouvelle facture"}
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            Édition directe sur le document · cliquez et tapez
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="text-muted flex items-center gap-1.5 text-[11px] font-bold">
            Échéance
            <input
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
              className="border-border bg-surface2 text-foreground rounded-[8px] border px-2 py-1 text-[12px] font-semibold outline-none"
            />
          </label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="border-border bg-surface2 text-foreground rounded-[8px] border px-2 py-1.5 text-[12px] font-semibold outline-none"
          >
            {STATUTS.map((s) => (
              <option key={s.v} value={s.v}>{s.l}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Exporter PDF
          </Button>
          <Button size="sm" onClick={() => valid && mutation.mutate()} disabled={!valid || mutation.isPending}>
            <Save className="size-4" />
            {mutation.isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la facture"}
          </Button>
        </div>
      </div>

      {!valid && (
        <div className="doc-toolbar text-danger bg-danger/10 mb-3 rounded-lg px-4 py-2 text-center text-[12px] font-bold">
          Sélectionnez un client (sur le document) et saisissez au moins un montant.
        </div>
      )}

      {/* Le document A4 — éditable directement */}
      <div className="overflow-x-auto rounded-xl border border-border bg-black/5 p-4 sm:p-6">
        <div
          id="doc-print"
          className="mx-auto w-full max-w-[820px] rounded-sm bg-white px-8 py-9 text-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:px-11"
        >
          <DocHeader />

          {/* Bandeau titre */}
          <div className="flex items-center justify-between rounded-lg px-5 py-3" style={{ background: navy }}>
            <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: 1 }}>
              FACTURE PROFORMA
            </span>
            <span className="text-white" style={{ fontSize: 11 }}>
              Dakar, le{" "}
              <EditFieldOnDark type="date" value={dateEmission} onChange={setDateEmission} style={{ fontSize: 11, width: 120 }} />
            </span>
          </div>

          {/* Bande client */}
          <div className="mt-3 flex flex-wrap items-center gap-x-1 rounded-md px-4 py-2" style={{ background: grey }}>
            <span style={{ fontSize: 10, color: navy }}>N°</span>
            <EditField value={numero} onChange={setNumero} style={{ fontSize: 10, color: navy, width: 110 }} />
            <span style={{ fontSize: 10, color: navy }}>- Client :</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-[3px] bg-transparent font-bold outline-none focus:bg-[#fde68a]/60"
              style={{ fontSize: 16, color: navy }}
            >
              <option value="">— choisir un client —</option>
              {clientOpts.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Tableau éditable */}
          <table className="mt-4 w-full border-collapse" style={{ fontSize: 10 }}>
            <thead>
              <tr style={{ background: navy }}>
                <th className="px-3 py-2 text-left font-bold text-white" style={{ width: "32%" }}>Détail de la prestation</th>
                <th className={th}>Nbre postes</th>
                <th className={th}>Nbre A.P.S</th>
                <th className={th}>Durée/jr (H)</th>
                <th className={th}>Durée (jrs)</th>
                <th className="px-3 py-2 text-right font-bold text-white">Montant (Fcfa)</th>
                <th className="no-print w-6" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} className="group" style={{ borderBottom: `1px solid ${grey}` }}>
                  <td className="px-3 py-1.5 align-top font-bold">
                    <EditField value={l.detail} onChange={(v) => setLigne(i, { detail: v })} className="w-full" placeholder="Désignation…" style={{ fontWeight: 700 }} />
                  </td>
                  <td className="px-2 py-1.5 text-center align-top">
                    <EditField type="number" min={0} value={l.nbrePostes} onChange={(v) => setLigne(i, { nbrePostes: v })} className="w-12 text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-center align-top">
                    <EditField type="number" min={0} value={l.nbreAPS} onChange={(v) => setLigne(i, { nbreAPS: v })} className="w-12 text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-center align-top">
                    <EditField value={l.dureeJr} onChange={(v) => setLigne(i, { dureeJr: v })} className="w-16 text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-center align-top">
                    <EditField type="number" min={0} value={l.dureeJrs} onChange={(v) => setLigne(i, { dureeJrs: v })} className="w-12 text-center" />
                  </td>
                  <td className="px-3 py-1.5 text-right align-top font-bold">
                    <EditField type="number" min={0} value={l.montant} onChange={(v) => setLigne(i, { montant: Number(v) })} className="w-24 text-right" style={{ fontWeight: 700 }} />
                  </td>
                  <td className="no-print px-1 text-center align-middle">
                    {lignes.length > 1 && (
                      <button type="button" aria-label="Retirer" onClick={() => removeLigne(i)} className="text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addLigne} className="no-print mt-1.5 flex items-center gap-1 text-[10.5px] font-bold" style={{ color: navy }}>
            <Plus className="size-3.5" /> Ajouter une ligne
          </button>

          {/* NB + totaux */}
          <div className="mt-4 flex items-start justify-between gap-6">
            <div className="max-w-[52%]" style={{ fontSize: 9.5 }}>
              <span className="font-bold" style={{ color: navy }}>NB : </span>
              <span style={{ color: "#4b5563" }}>{os.conditionsPaiement}</span>
            </div>
            <div className="w-[40%] overflow-hidden rounded-md" style={{ fontSize: 11 }}>
              <TotRow label="TOTAL HT" value={fmt(ht)} bg={navy} color="#fff" />
              <div className="flex items-stretch" style={{ background: grey }}>
                <div className="flex-1 px-3 py-2 text-right font-bold" style={{ color: navy }}>
                  TVA{" "}
                  <select value={tauxTVA} onChange={(e) => setTauxTVA(Number(e.target.value))} className="rounded-[3px] bg-transparent font-bold outline-none focus:bg-[#fde68a]/70" style={{ color: navy }}>
                    <option value={18}>18</option>
                    <option value={0}>0</option>
                  </select>
                  %
                </div>
                <div className="w-[45%] px-3 py-2 text-right font-bold" style={{ color: navy }}>{fmt(tva)}</div>
              </div>
              <TotRow label="TOTAL TTC" value={fmt(ttc)} bg={navy} color="#fff" />
              <div className="flex items-stretch">
                <div className="flex-1 px-3 py-2 text-right font-bold text-white" style={{ background: gold }}>NET À PAYER</div>
                <div className="w-[45%] px-3 py-2 text-right font-bold text-white" style={{ background: gold, opacity: 0.9 }}>{fmt(ttc)}</div>
              </div>
            </div>
          </div>

          {/* OPTION (éditable) */}
          <div className="mt-5">
            <div className="rounded-t-md px-3 py-1.5 font-bold text-white" style={{ fontSize: 11, letterSpacing: 1, background: navy }}>OPTION</div>
            <div className="rounded-b-md px-4 py-2" style={{ background: grey, fontSize: 10 }}>
              <EditArea
                value={options.join("\n")}
                onChange={(v) => setOptions(v.split("\n"))}
                rows={Math.max(2, options.length || 2)}
                placeholder="Une option par ligne…"
                style={{ color: navy }}
              />
            </div>
          </div>

          {/* Montant en lettres */}
          <div className="mt-4 font-bold" style={{ fontSize: 10.5, color: navy }}>
            Arrêtée la présente facture à la somme de :{" "}
            <span style={{ textTransform: "uppercase" }}>{ttc > 0 ? montantEnLettres(ttc) : ""}</span>
          </div>

          <DocSignatureBlock />
          <DocStamp label={os.comptabilite} />
          <div className="flex-1" />
          <DocFooter />
        </div>
      </div>

      <style>{`
        #doc-print, #doc-print p, #doc-print td, #doc-print li, #doc-print input, #doc-print select { color: #1a1a1a; }
        @media print {
          body * { visibility: hidden !important; }
          #doc-print, #doc-print * { visibility: visible !important; }
          #doc-print { position: absolute; left: 0; top: 0; max-width: none !important; box-shadow: none !important; padding: 0 !important; }
          #doc-print .no-print { display: none !important; }
          .doc-toolbar { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </ScreenContainer>
  );
}

function TotRow({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <div className="flex items-stretch">
      <div className="flex-1 px-3 py-2 text-right font-bold" style={{ background: bg, color }}>{label}</div>
      <div className="w-[45%] px-3 py-2 text-right font-bold" style={{ background: bg, color }}>{value}</div>
    </div>
  );
}
