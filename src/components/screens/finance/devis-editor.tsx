"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Printer, Save, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatFCFA } from "@/lib/format";
import { createQuote } from "@/lib/supabase/data/quotes";
import { createDocument } from "@/lib/supabase/data/documents";
import { fetchProspectOptions, type Opt } from "@/lib/supabase/data/options";
import { useCompanyIdentity } from "@/lib/documents/use-identity";
import { montantEnLettres } from "@/lib/documents/montant-lettres";
import { OS_COLORS } from "@/lib/one-security";
import { DocHeader, DocFooter, DocStamp, DocSignatureBlock } from "@/components/documents/doc-chrome";
import { EditField, EditFieldOnDark } from "@/components/documents/doc-edit";
import type { DevisData, DevisLigne } from "@/lib/documents/types";

const num = (v: string | number): number => Number(v) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const defaultNumero = () =>
  `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
const fmt = (n: number) =>
  Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/\s/g, ".");

interface EditorLigne {
  detail: string;
  nbreAgent: string;
  duree: string;
  prixUnitaire: number;
}
function emptyLigne(): EditorLigne {
  return { detail: "Agent de sécurité — poste de jour", nbreAgent: "1", duree: "12H/24H", prixUnitaire: 0 };
}
const ligneMontant = (l: EditorLigne) => Math.round(num(l.nbreAgent) * (Number(l.prixUnitaire) || 0));

const STATUTS = [
  { v: "BROUILLON", l: "Brouillon" },
  { v: "ENVOYE", l: "Envoyé" },
  { v: "ACCEPTE", l: "Accepté" },
  { v: "REFUSE", l: "Refusé" },
];

export function DevisEditor({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const os = useCompanyIdentity();
  const navy = os.couleurPrincipale;
  const gold = os.couleurAccent;
  const grey = OS_COLORS.grey;

  const { data: prospects } = useQuery({ queryKey: ["prospect-options"], queryFn: fetchProspectOptions });
  const prospectOpts: Opt[] = prospects ?? [];

  const [prospectId, setProspectId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [numero, setNumero] = useState(defaultNumero());
  const [dateEmission, setDateEmission] = useState(today());
  const [statut, setStatut] = useState("BROUILLON");
  const [lieu, setLieu] = useState("");
  const [lignes, setLignes] = useState<EditorLigne[]>([emptyLigne()]);

  const prospectLabel = prospectOpts.find((o) => o.id === prospectId)?.label ?? "";
  const clientLabel = clientNom.trim() || prospectLabel;
  const total = useMemo(() => lignes.reduce((s, l) => s + ligneMontant(l), 0), [lignes]);
  const valid = (prospectId !== "" || clientNom.trim() !== "") && total > 0;

  function setLigne(i: number, patch: Partial<EditorLigne>) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  const addLigne = () => setLignes((ls) => [...ls, emptyLigne()]);
  const removeLigne = (i: number) => setLignes((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  function pickProspect(id: string) {
    setProspectId(id);
    const lbl = prospectOpts.find((o) => o.id === id)?.label ?? "";
    if (lbl && !clientNom.trim()) setClientNom(lbl);
  }

  const devisData: DevisData = useMemo(
    () => ({
      client: clientLabel || "—",
      date: dateEmission,
      lieu: lieu || "—",
      lignes: lignes.map<DevisLigne>((l) => ({
        detail: l.detail,
        nbreAgent: num(l.nbreAgent),
        duree: l.duree,
        prixUnitaire: Number(l.prixUnitaire) || 0,
      })),
    }),
    [clientLabel, dateEmission, lieu, lignes],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const usedNumero = await createQuote({
        prospectId: prospectId || null,
        totalHT: total,
        tauxTVA: 0,
        statut,
        dateEnvoi: dateEmission,
        numero,
      });
      try {
        await createDocument({
          type: "devis",
          titre: `Devis ${usedNumero} — ${clientLabel || "client"}`,
          numero: usedNumero,
          clientId: null,
          donnees: devisData,
        });
      } catch {
        /* document détaillé optionnel */
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
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé : seuls DG, RP et Manager peuvent créer un devis."
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
          <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">Nouveau devis</div>
          <div className="text-muted text-[11.5px] font-semibold">Édition directe sur le document · cliquez et tapez</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="text-muted flex items-center gap-1.5 text-[11px] font-bold">
            Prospect
            <select
              value={prospectId}
              onChange={(e) => pickProspect(e.target.value)}
              className="border-border bg-surface2 text-foreground rounded-[8px] border px-2 py-1.5 text-[12px] font-semibold outline-none"
            >
              <option value="">— aucun —</option>
              {prospectOpts.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
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
            {mutation.isPending ? "Enregistrement…" : "Créer le devis"}
          </Button>
        </div>
      </div>

      {!valid && (
        <div className="doc-toolbar text-danger bg-danger/10 mb-3 rounded-lg px-4 py-2 text-center text-[12px] font-bold">
          Saisissez un client (sur le document) et au moins un montant.
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
            <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: 1 }}>DEVIS</span>
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
            <EditField value={clientNom} onChange={setClientNom} placeholder="Nom du client…" className="font-bold" style={{ fontSize: 16, color: navy, minWidth: 220 }} />
          </div>

          {/* Lieu */}
          <div className="mt-3 pb-1 font-bold" style={{ fontSize: 12, color: navy, borderBottom: `2px solid ${gold}` }}>
            Lieu : <EditField value={lieu} onChange={setLieu} placeholder="site / lieu…" style={{ fontSize: 12, color: navy, minWidth: 260 }} />
          </div>

          {/* Tableau éditable */}
          <table className="mt-4 w-full border-collapse" style={{ fontSize: 10.5 }}>
            <thead>
              <tr style={{ background: navy }}>
                <th className="px-3 py-2 text-left font-bold text-white" style={{ width: "40%" }}>Détail de la prestation</th>
                <th className={th}>Nbre Agent</th>
                <th className={th}>Durée/jr (H)</th>
                <th className={th}>Prix Unitaire</th>
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
                    <EditField type="number" min={0} value={l.nbreAgent} onChange={(v) => setLigne(i, { nbreAgent: v })} className="w-14 text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-center align-top">
                    <EditField value={l.duree} onChange={(v) => setLigne(i, { duree: v })} className="w-16 text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-center align-top">
                    <EditField type="number" min={0} value={l.prixUnitaire} onChange={(v) => setLigne(i, { prixUnitaire: Number(v) })} className="w-24 text-center" />
                  </td>
                  <td className="px-3 py-1.5 text-right align-top font-bold" style={{ color: navy }}>{fmt(ligneMontant(l))}</td>
                  <td className="no-print px-1 text-center align-middle">
                    {lignes.length > 1 && (
                      <button type="button" aria-label="Retirer" onClick={() => removeLigne(i)} className="text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-bold text-white" style={{ background: navy }}>TOTAL TTC</td>
                <td className="px-3 py-2 text-right font-bold text-white" style={{ background: navy }}>{fmt(total)}</td>
                <td className="no-print" />
              </tr>
            </tbody>
          </table>
          <button type="button" onClick={addLigne} className="no-print mt-1.5 flex items-center gap-1 text-[10.5px] font-bold" style={{ color: navy }}>
            <Plus className="size-3.5" /> Ajouter une ligne
          </button>

          {/* Montant en lettres */}
          <div className="mt-4 font-bold" style={{ fontSize: 10.5, color: navy }}>
            Arrêtée la présente facture à la somme de :{" "}
            <span style={{ textTransform: "uppercase" }}>{total > 0 ? montantEnLettres(total) : ""}</span>
          </div>

          {/* NB + totaux */}
          <div className="mt-4 flex items-start justify-between gap-6">
            <div className="max-w-[52%]" style={{ fontSize: 9.5 }}>
              <span className="font-bold" style={{ color: navy }}>NB : </span>
              <span style={{ color: "#4b5563" }}>{os.conditionsPaiement}</span>
            </div>
            <div className="w-[40%] overflow-hidden rounded-md" style={{ fontSize: 11 }}>
              <div className="flex items-stretch">
                <div className="flex-1 px-3 py-2 text-right font-bold text-white" style={{ background: navy }}>TOTAL TTC</div>
                <div className="w-[45%] px-3 py-2 text-right font-bold" style={{ color: navy, background: grey }}>{fmt(total)}</div>
              </div>
              <div className="flex items-stretch">
                <div className="flex-1 px-3 py-2 text-right font-bold text-white" style={{ background: gold }}>NET À PAYER</div>
                <div className="w-[45%] px-3 py-2 text-right font-bold text-white" style={{ background: gold, opacity: 0.9 }}>{fmt(total)}</div>
              </div>
            </div>
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
          #doc-print { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 12mm !important; }
          #doc-print .no-print { display: none !important; }
          .doc-toolbar { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </ScreenContainer>
  );
}
