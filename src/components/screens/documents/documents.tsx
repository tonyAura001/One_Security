"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import {
  fetchDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/supabase/data/documents";
import {
  DOC_TYPE_LABEL,
  type DevisData,
  type DevisLigne,
  type DocRecord,
  type DocumentType,
  type FactureData,
  type FactureLigne,
} from "@/lib/documents/types";
import { ONE_SECURITY } from "@/lib/one-security";
import { DevisTemplate } from "@/components/documents/devis-template";
import { FactureTemplate } from "@/components/documents/facture-template";

const field =
  "w-full rounded-[9px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[10.5px] font-bold tracking-[0.3px] uppercase";

function today() {
  return new Date().toISOString().slice(0, 10);
}
function seq() {
  return Date.now().toString().slice(-4);
}

function emptyDevis(): DevisData {
  return {
    client: "",
    date: today(),
    lieu: "",
    lignes: [
      { detail: "Agent de sécurité", nbreAgent: 1, duree: "12H/24H", prixUnitaire: 0 },
    ],
  };
}
function emptyFacture(): FactureData {
  return {
    client: "",
    date: today(),
    lignes: [
      { detail: "Gardiennage - JOUR", nbrePostes: "1", nbreAPS: "1", dureeJr: "12H/24H", dureeJrs: "1", montant: 0 },
    ],
    tauxTVA: 18,
    options: [...ONE_SECURITY.optionsFacturation],
  };
}

interface Draft {
  id: string | null;
  type: DocumentType;
  titre: string;
  numero: string;
  statut: string;
  donnees: DevisData | FactureData;
}

export function DocumentsScreen() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const docs = data ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);

  function startNew(type: DocumentType) {
    const year = new Date().getFullYear();
    setDraft({
      id: null,
      type,
      titre: `${DOC_TYPE_LABEL[type]} — nouveau`,
      numero: type === "devis" ? `${seq()}/${year}` : `${seq()}/DK-SECURITY/${year}`,
      statut: "brouillon",
      donnees: type === "devis" ? emptyDevis() : emptyFacture(),
    });
  }

  function edit(d: DocRecord) {
    if (d.type !== "devis" && d.type !== "facture_proforma") {
      toast.info("Ce type de document arrive à l'incrément suivant.");
      return;
    }
    setDraft({
      id: d.id,
      type: d.type,
      titre: d.titre,
      numero: d.numero ?? "",
      statut: d.statut,
      donnees: d.donnees as DevisData | FactureData,
    });
  }

  async function save() {
    if (!draft) return;
    try {
      if (draft.id) {
        await updateDocument(draft.id, {
          titre: draft.titre,
          numero: draft.numero,
          statut: draft.statut,
          donnees: draft.donnees,
        });
        toast.success("Document enregistré");
      } else {
        const id = await createDocument({
          type: draft.type,
          titre: draft.titre,
          numero: draft.numero,
          donnees: draft.donnees,
        });
        setDraft({ ...draft, id });
        toast.success("Document créé");
      }
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé (DG/RP/RF/RH/Comptable)."
          : `Échec : ${msg}`,
      );
    }
  }

  async function remove(id: string) {
    try {
      await deleteDocument(id);
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document supprimé");
    } catch {
      toast.error("Suppression refusée");
    }
  }

  if (draft) {
    return (
      <DocumentEditor
        draft={draft}
        setDraft={setDraft}
        onBack={() => setDraft(null)}
        onSave={save}
      />
    );
  }

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            Devis, factures et documents officiels — charte One Security
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => startNew("devis")}>
            <Plus className="size-4" /> Nouveau devis
          </Button>
          <Button size="sm" variant="outline" onClick={() => startNew("facture_proforma")}>
            <Plus className="size-4" /> Facture proforma
          </Button>
        </div>
      </div>

      <Card className="p-[18px_20px]">
        {docs.length === 0 && (
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Créez un devis ou une facture proforma pour commencer."
          />
        )}
        {docs.map((d, i) => (
          <div
            key={d.id}
            className={`flex flex-wrap items-center gap-3 py-3 ${
              i < docs.length - 1 ? "border-border border-b" : ""
            }`}
          >
            <FileText className="text-accent size-4 flex-none" strokeWidth={1.9} />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => edit(d)}
                className="text-foreground truncate text-left text-[13px] font-bold hover:underline"
              >
                {d.titre}
              </button>
              <div className="text-muted text-[11px] font-semibold">
                {DOC_TYPE_LABEL[d.type]} · N° {d.numero ?? "—"} ·{" "}
                {formatDateFR(d.updatedAt, "d MMM yyyy")}
              </div>
            </div>
            <StatusPill
              variant={
                d.statut === "signe"
                  ? "success"
                  : d.statut === "finalise"
                    ? "info"
                    : "neutral"
              }
              uppercase
            >
              {d.statut}
            </StatusPill>
            <Button size="xs" variant="outline" onClick={() => edit(d)}>
              Ouvrir
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => remove(d.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </Card>
    </ScreenContainer>
  );
}

function DocumentEditor({
  draft,
  setDraft,
  onBack,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const dateLabel = useMemo(
    () => formatDateFR(draft.donnees.date, "dd/MM/yyyy"),
    [draft.donnees.date],
  );

  function setDonnees(donnees: DevisData | FactureData) {
    setDraft({ ...draft, donnees });
  }

  return (
    <ScreenContainer>
      {/* Toolbar (non imprimée) */}
      <div className="doc-toolbar mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <input
          className={`${field} max-w-[280px] flex-1`}
          value={draft.titre}
          onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
        />
        <select
          className={`${field} max-w-[150px]`}
          value={draft.statut}
          onChange={(e) => setDraft({ ...draft, statut: e.target.value })}
        >
          <option value="brouillon">Brouillon</option>
          <option value="finalise">Finalisé</option>
          <option value="signe">Signé</option>
        </select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Exporter PDF
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* Éditeur de champs (non imprimé) */}
        <Card className="doc-toolbar h-fit p-4">
          <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
            {DOC_TYPE_LABEL[draft.type]}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className={label}>Numéro</label>
              <input
                className={field}
                value={draft.numero}
                onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Client</label>
                <input
                  className={field}
                  value={draft.donnees.client}
                  onChange={(e) =>
                    setDonnees({ ...draft.donnees, client: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={label}>Date</label>
                <input
                  type="date"
                  className={field}
                  value={draft.donnees.date}
                  onChange={(e) =>
                    setDonnees({ ...draft.donnees, date: e.target.value })
                  }
                />
              </div>
            </div>

            {draft.type === "devis" ? (
              <DevisFields
                data={draft.donnees as DevisData}
                onChange={setDonnees}
              />
            ) : (
              <FactureFields
                data={draft.donnees as FactureData}
                onChange={setDonnees}
              />
            )}
          </div>
        </Card>

        {/* Aperçu A4 (imprimé) */}
        <div className="overflow-x-auto">
          <div
            id="doc-print"
            className="origin-top scale-[0.62] sm:scale-75 lg:scale-90 xl:scale-100"
          >
            {draft.type === "devis" ? (
              <DevisTemplate
                data={draft.donnees as DevisData}
                numero={draft.numero}
                dateLabel={dateLabel}
              />
            ) : (
              <FactureTemplate
                data={draft.donnees as FactureData}
                numero={draft.numero}
                dateLabel={dateLabel}
              />
            )}
          </div>
        </div>
      </div>

      {/* CSS impression : n'imprime que le document A4. */}
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

function DevisFields({
  data,
  onChange,
}: {
  data: DevisData;
  onChange: (d: DevisData) => void;
}) {
  function setLigne(i: number, patch: Partial<DevisLigne>) {
    const lignes = data.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l));
    onChange({ ...data, lignes });
  }
  return (
    <>
      <div>
        <label className={label}>Lieu</label>
        <input
          className={field}
          value={data.lieu}
          onChange={(e) => onChange({ ...data, lieu: e.target.value })}
        />
      </div>
      <div className="text-muted text-[10.5px] font-bold tracking-[0.3px] uppercase">
        Prestations
      </div>
      {data.lignes.map((l, i) => (
        <div key={i} className="border-border rounded-lg border p-2.5">
          <input
            className={`${field} mb-2`}
            placeholder="Détail de la prestation"
            value={l.detail}
            onChange={(e) => setLigne(i, { detail: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              className={field}
              placeholder="Nbre agents"
              value={l.nbreAgent}
              onChange={(e) => setLigne(i, { nbreAgent: Number(e.target.value) })}
            />
            <input
              className={field}
              placeholder="Durée"
              value={l.duree}
              onChange={(e) => setLigne(i, { duree: e.target.value })}
            />
            <input
              type="number"
              className={field}
              placeholder="Prix unit."
              value={l.prixUnitaire}
              onChange={(e) => setLigne(i, { prixUnitaire: Number(e.target.value) })}
            />
          </div>
          {data.lignes.length > 1 && (
            <button
              type="button"
              className="text-danger mt-1.5 text-[11px] font-bold"
              onClick={() =>
                onChange({ ...data, lignes: data.lignes.filter((_, j) => j !== i) })
              }
            >
              Retirer
            </button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange({
            ...data,
            lignes: [
              ...data.lignes,
              { detail: "", nbreAgent: 1, duree: "12H/24H", prixUnitaire: 0 },
            ],
          })
        }
      >
        <Plus className="size-4" /> Ajouter une ligne
      </Button>
    </>
  );
}

function FactureFields({
  data,
  onChange,
}: {
  data: FactureData;
  onChange: (d: FactureData) => void;
}) {
  function setLigne(i: number, patch: Partial<FactureLigne>) {
    const lignes = data.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l));
    onChange({ ...data, lignes });
  }
  return (
    <>
      <div>
        <label className={label}>Taux TVA (%)</label>
        <input
          type="number"
          className={field}
          value={data.tauxTVA}
          onChange={(e) => onChange({ ...data, tauxTVA: Number(e.target.value) })}
        />
      </div>
      <div className="text-muted text-[10.5px] font-bold tracking-[0.3px] uppercase">
        Prestations
      </div>
      {data.lignes.map((l, i) => (
        <div key={i} className="border-border rounded-lg border p-2.5">
          <input
            className={`${field} mb-2`}
            placeholder="Détail de la prestation"
            value={l.detail}
            onChange={(e) => setLigne(i, { detail: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={field}
              placeholder="Nbre postes"
              value={l.nbrePostes}
              onChange={(e) => setLigne(i, { nbrePostes: e.target.value })}
            />
            <input
              className={field}
              placeholder="Nbre A.P.S"
              value={l.nbreAPS}
              onChange={(e) => setLigne(i, { nbreAPS: e.target.value })}
            />
            <input
              className={field}
              placeholder="Durée/jr"
              value={l.dureeJr}
              onChange={(e) => setLigne(i, { dureeJr: e.target.value })}
            />
            <input
              type="number"
              className={field}
              placeholder="Montant"
              value={l.montant}
              onChange={(e) => setLigne(i, { montant: Number(e.target.value) })}
            />
          </div>
          {data.lignes.length > 1 && (
            <button
              type="button"
              className="text-danger mt-1.5 text-[11px] font-bold"
              onClick={() =>
                onChange({ ...data, lignes: data.lignes.filter((_, j) => j !== i) })
              }
            >
              Retirer
            </button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange({
            ...data,
            lignes: [
              ...data.lignes,
              { detail: "", nbrePostes: "1", nbreAPS: "1", dureeJr: "12H/24H", dureeJrs: "1", montant: 0 },
            ],
          })
        }
      >
        <Plus className="size-4" /> Ajouter une ligne
      </Button>
      <div>
        <label className={label}>Options (une par ligne)</label>
        <textarea
          className={`${field} min-h-[80px] resize-y`}
          value={data.options.join("\n")}
          onChange={(e) =>
            onChange({ ...data, options: e.target.value.split("\n") })
          }
        />
      </div>
    </>
  );
}
