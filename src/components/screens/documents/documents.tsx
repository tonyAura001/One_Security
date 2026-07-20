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
  snapshotDocument,
} from "@/lib/supabase/data/documents";
import {
  DOC_TYPE_LABEL,
  type CommuniqueData,
  type DevisData,
  type DevisLigne,
  type DocRecord,
  type DocumentData,
  type DocumentType,
  type FactureData,
  type FactureLigne,
  type FicheData,
  type RapportData,
} from "@/lib/documents/types";
import { ONE_SECURITY } from "@/lib/one-security";
import { DevisTemplate } from "@/components/documents/devis-template";
import { FactureTemplate } from "@/components/documents/facture-template";
import { RapportTemplate } from "@/components/documents/rapport-template";
import { CommuniqueTemplate } from "@/components/documents/communique-template";
import { FicheTemplate } from "@/components/documents/fiche-template";
import { RichTextEditor } from "@/components/documents/rich-text-editor";
import { DocumentVersions } from "./document-versions";
import type { DocVersion } from "@/lib/supabase/data/documents";

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

const CONSIGNES_DEFAUT = `<ul>
<li><strong>Assurer l'événement du début à la fin :</strong> présence obligatoire et vigilance continue pendant toute la durée de la mission, sans aucune interruption.</li>
<li><strong>Habillement correct :</strong> port de la tenue de travail réglementaire de One Security, complète, propre et portée avec fierté.</li>
<li><strong>Respecter les ordres :</strong> obéissance totale aux ordres de la hiérarchie et des superviseurs sur le terrain.</li>
<li><strong>Ne pas abandonner son poste :</strong> interdiction absolue de quitter son secteur sous aucun prétexte.</li>
<li><strong>Suivre les instructions :</strong> application rigoureuse des consignes de sectorisation du site.</li>
<li><strong>Aucune décision personnelle :</strong> interdiction de prendre des initiatives ou de modifier son service sans permission du responsable de mission.</li>
</ul>`;

function emptyRapport(): RapportData {
  return {
    destinataire: "",
    date: today(),
    objet: "",
    corps:
      "<h2>1. Diagnostic du site (Les Risques)</h2><p></p><h2>2. Dispositif sécuritaire proposé</h2><p></p><h2>Conclusion</h2><p></p>",
  };
}
function emptyCommunique(): CommuniqueData {
  return {
    objet: "",
    date: today(),
    corps: "<p>Chers clients, partenaires et collaborateurs,</p><p></p>",
  };
}
function emptyFiche(): FicheData {
  return {
    titreEvent: "",
    date: today(),
    effectif: "50 agents de sécurité",
    remuneration: "20 000 F CFA par agent",
    consignes: CONSIGNES_DEFAUT,
    nomAgent: "",
    cni: "",
  };
}

function emptyData(type: DocumentType): DocumentData {
  switch (type) {
    case "devis":
      return emptyDevis();
    case "facture_proforma":
      return emptyFacture();
    case "rapport":
      return emptyRapport();
    case "communique":
      return emptyCommunique();
    case "fiche_engagement":
      return emptyFiche();
  }
}

interface Draft {
  id: string | null;
  type: DocumentType;
  titre: string;
  numero: string;
  statut: string;
  donnees: DocumentData;
}

export function DocumentsScreen() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const docs = data ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newType, setNewType] = useState<DocumentType>("devis");

  function startNew(type: DocumentType) {
    const year = new Date().getFullYear();
    const numero =
      type === "devis"
        ? `${seq()}/${year}`
        : type === "facture_proforma"
          ? `${seq()}/DK-SECURITY/${year}`
          : "";
    setDraft({
      id: null,
      type,
      titre: `${DOC_TYPE_LABEL[type]} — nouveau`,
      numero,
      statut: "brouillon",
      donnees: emptyData(type),
    });
  }

  function edit(d: DocRecord) {
    setDraft({
      id: d.id,
      type: d.type,
      titre: d.titre,
      numero: d.numero ?? "",
      statut: d.statut,
      donnees: d.donnees,
    });
  }

  async function save() {
    if (!draft) return;
    try {
      let docId = draft.id;
      if (draft.id) {
        await updateDocument(draft.id, {
          titre: draft.titre,
          numero: draft.numero,
          statut: draft.statut,
          donnees: draft.donnees,
        });
        toast.success("Document enregistré");
      } else {
        docId = await createDocument({
          type: draft.type,
          titre: draft.titre,
          numero: draft.numero,
          donnees: draft.donnees,
        });
        setDraft({ ...draft, id: docId });
        toast.success("Document créé");
      }
      // Instantané de version (historique). Best-effort : n'échoue pas le save.
      if (docId) {
        try {
          await snapshotDocument(docId, {
            titre: draft.titre,
            statut: draft.statut,
            donnees: draft.donnees,
          });
          qc.invalidateQueries({ queryKey: ["doc-versions", docId] });
        } catch {
          /* historique non bloquant */
        }
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
        <div className="flex items-center gap-2">
          <select
            className={`${field} max-w-[190px]`}
            value={newType}
            onChange={(e) => setNewType(e.target.value as DocumentType)}
          >
            {(Object.keys(DOC_TYPE_LABEL) as DocumentType[]).map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => startNew(newType)}>
            <Plus className="size-4" /> Nouveau
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
  const date = (draft.donnees as { date?: string }).date ?? "";
  const dateLabel = useMemo(
    () =>
      draft.type === "devis" || draft.type === "facture_proforma"
        ? formatDateFR(date, "dd/MM/yyyy")
        : formatDateFR(date, "d MMMM yyyy"),
    [date, draft.type],
  );

  function setDonnees(donnees: DocumentData) {
    setDraft({ ...draft, donnees });
  }

  function restoreVersion(v: DocVersion) {
    setDraft({
      ...draft,
      titre: v.titre ?? draft.titre,
      statut: v.statut ?? draft.statut,
      donnees: v.donnees,
    });
    toast.success(`Version v${v.version} restaurée`, "Enregistrez pour confirmer");
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
        {/* Colonne gauche : champs + historique (non imprimée) */}
        <div className="flex flex-col gap-4">
        {/* Éditeur de champs (non imprimé) */}
        <Card className="doc-toolbar h-fit p-4">
          <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
            {DOC_TYPE_LABEL[draft.type]}
          </div>
          <div className="flex flex-col gap-3">
            {(draft.type === "devis" ||
              draft.type === "facture_proforma") && (
              <div>
                <label className={label}>Numéro</label>
                <input
                  className={field}
                  value={draft.numero}
                  onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
                />
              </div>
            )}

            {draft.type === "devis" && (
              <DevisFields data={draft.donnees as DevisData} onChange={setDonnees} />
            )}
            {draft.type === "facture_proforma" && (
              <FactureFields data={draft.donnees as FactureData} onChange={setDonnees} />
            )}
            {draft.type === "rapport" && (
              <RapportFields data={draft.donnees as RapportData} onChange={setDonnees} />
            )}
            {draft.type === "communique" && (
              <CommuniqueFields data={draft.donnees as CommuniqueData} onChange={setDonnees} />
            )}
            {draft.type === "fiche_engagement" && (
              <FicheFields data={draft.donnees as FicheData} onChange={setDonnees} />
            )}
          </div>
        </Card>

          {draft.id && (
            <DocumentVersions documentId={draft.id} onRestore={restoreVersion} />
          )}
        </div>

        {/* Aperçu A4 (imprimé) */}
        <div className="overflow-x-auto">
          <div
            id="doc-print"
            className="origin-top scale-[0.62] sm:scale-75 lg:scale-90 xl:scale-100"
          >
            {draft.type === "devis" && (
              <DevisTemplate
                data={draft.donnees as DevisData}
                numero={draft.numero}
                dateLabel={dateLabel}
              />
            )}
            {draft.type === "facture_proforma" && (
              <FactureTemplate
                data={draft.donnees as FactureData}
                numero={draft.numero}
                dateLabel={dateLabel}
              />
            )}
            {draft.type === "rapport" && (
              <RapportTemplate
                data={draft.donnees as RapportData}
                dateLabel={dateLabel}
              />
            )}
            {draft.type === "communique" && (
              <CommuniqueTemplate
                data={draft.donnees as CommuniqueData}
                dateLabel={dateLabel}
              />
            )}
            {draft.type === "fiche_engagement" && (
              <FicheTemplate
                data={draft.donnees as FicheData}
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Client</label>
          <input
            className={field}
            value={data.client}
            onChange={(e) => onChange({ ...data, client: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input
            type="date"
            className={field}
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </div>
      </div>
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Client</label>
          <input
            className={field}
            value={data.client}
            onChange={(e) => onChange({ ...data, client: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input
            type="date"
            className={field}
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </div>
      </div>
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

function RapportFields({
  data,
  onChange,
}: {
  data: RapportData;
  onChange: (d: RapportData) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>À l'attention de</label>
          <input
            className={field}
            value={data.destinataire}
            onChange={(e) => onChange({ ...data, destinataire: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input
            type="date"
            className={field}
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={label}>Objet</label>
        <input
          className={field}
          value={data.objet}
          onChange={(e) => onChange({ ...data, objet: e.target.value })}
          placeholder="Rapport de sécurité – …"
        />
      </div>
      <div>
        <label className={label}>Corps du rapport</label>
        <RichTextEditor
          value={data.corps}
          onChange={(corps) => onChange({ ...data, corps })}
        />
      </div>
    </>
  );
}

function CommuniqueFields({
  data,
  onChange,
}: {
  data: CommuniqueData;
  onChange: (d: CommuniqueData) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Objet</label>
          <input
            className={field}
            value={data.objet}
            onChange={(e) => onChange({ ...data, objet: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input
            type="date"
            className={field}
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={label}>Corps du communiqué</label>
        <RichTextEditor
          value={data.corps}
          onChange={(corps) => onChange({ ...data, corps })}
        />
      </div>
    </>
  );
}

function FicheFields({
  data,
  onChange,
}: {
  data: FicheData;
  onChange: (d: FicheData) => void;
}) {
  return (
    <>
      <div>
        <label className={label}>Événement</label>
        <input
          className={field}
          value={data.titreEvent}
          onChange={(e) => onChange({ ...data, titreEvent: e.target.value })}
          placeholder="Sécurisation de l'événement …"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Effectif</label>
          <input
            className={field}
            value={data.effectif}
            onChange={(e) => onChange({ ...data, effectif: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Rémunération</label>
          <input
            className={field}
            value={data.remuneration}
            onChange={(e) => onChange({ ...data, remuneration: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Nom de l'agent</label>
          <input
            className={field}
            value={data.nomAgent}
            onChange={(e) => onChange({ ...data, nomAgent: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>CNI</label>
          <input
            className={field}
            value={data.cni}
            onChange={(e) => onChange({ ...data, cni: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={label}>Date</label>
        <input
          type="date"
          className={field}
          value={data.date}
          onChange={(e) => onChange({ ...data, date: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Consignes</label>
        <RichTextEditor
          value={data.consignes}
          onChange={(consignes) => onChange({ ...data, consignes })}
        />
      </div>
    </>
  );
}
