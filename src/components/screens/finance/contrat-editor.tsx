"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Printer,
  RotateCcw,
  Save,
  Underline as UnderlineIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import { useCompanyIdentity } from "@/lib/documents/use-identity";
import { RTE_PROSE } from "@/components/documents/rich-text-editor";
import { buildContratHtml, type ContratVars } from "@/lib/documents/contrat-template";
import { fetchClientOptions, fetchSiteOptions, type Opt } from "@/lib/supabase/data/options";
import { createContract } from "@/lib/supabase/data/contracts";
import { createDocument } from "@/lib/supabase/data/documents";

const field =
  "w-full rounded-[9px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[10.5px] font-bold tracking-[0.3px] uppercase";

const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (d: string, m: number) => {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + m);
  return dt.toISOString().slice(0, 10);
};
/** Nombre de mois (arrondi) entre deux dates ISO. */
function monthsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const da = new Date(a);
  const db = new Date(b);
  return Math.max(
    0,
    (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()),
  );
}

const TYPES: { v: string; l: string }[] = [
  { v: "PRESTATION", l: "Prestation de services" },
  { v: "MISE_A_DISPOSITION", l: "Mise à disposition d'agents" },
  { v: "PONCTUEL", l: "Mission ponctuelle" },
];
const FREQUENCES: { v: string; l: string }[] = [
  { v: "MENSUELLE", l: "Mensuelle" },
  { v: "TRIMESTRIELLE", l: "Trimestrielle" },
  { v: "SEMESTRIELLE", l: "Semestrielle" },
  { v: "ANNUELLE", l: "Annuelle" },
];

function TBtn({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-muted hover:bg-hover hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        active && "bg-accent/14 text-accent",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Éditeur de contrat pleine page — document juridique WYSIWYG (TipTap réel).
 * Le panneau « Informations » alimente les variables ; le corps OHADA (9
 * articles) est éditable ; en-tête léger + signatures (DG + client) ; Export PDF.
 */
export function ContratEditor({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const os = useCompanyIdentity();
  const navy = os.couleurPrincipale;
  const gold = os.couleurAccent;

  const { data: clients } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });
  const { data: sites } = useQuery({ queryKey: ["site-options"], queryFn: fetchSiteOptions });
  const clientOpts: Opt[] = clients ?? [];
  const siteOpts: Opt[] = sites ?? [];

  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("PRESTATION");
  const [frequence, setFrequence] = useState("MENSUELLE");
  const [dateSignature, setDateSignature] = useState(today());
  const [dateDebut, setDateDebut] = useState(today());
  const [dateFin, setDateFin] = useState(addMonths(today(), 12));
  const [montantHT, setMontantHT] = useState(0);
  const [tauxTVA, setTauxTVA] = useState(18);

  const clientLabel = clientOpts.find((o) => o.id === clientId)?.label ?? "";
  const siteLabel = siteOpts.find((o) => o.id === siteId)?.label ?? "";
  const dureeMois = monthsBetween(dateDebut, dateFin) || 12;

  const buildVars = (): ContratVars => ({
    prestataireName: os.name,
    prestataireCapital: os.capital,
    prestataireRccm: os.rccm,
    prestataireAdresse: os.adresse,
    prestataireRep: os.pdg,
    clientName: clientLabel || "[NOM DU CLIENT]",
    objet:
      titre.trim() ||
      (siteLabel ? `Prestation de sécurité — site ${siteLabel}` : ""),
    dureeLabel: `${dureeMois} mois`,
    dateDebutLabel: dateDebut ? formatDateFR(dateDebut) : "…",
    dateFinLabel: dateFin ? formatDateFR(dateFin) : "…",
    montantHT,
    tauxTVA,
    dateSignatureLabel: dateSignature ? formatDateFR(dateSignature) : "…",
  });

  // Corps initial — construit une seule fois au montage (défauts d'identité).
  const [bodyHtml, setBodyHtml] = useState(() =>
    buildContratHtml({
      prestataireName: os.name,
      prestataireCapital: os.capital,
      prestataireRccm: os.rccm,
      prestataireAdresse: os.adresse,
      prestataireRep: os.pdg,
      clientName: "[NOM DU CLIENT]",
      objet: "",
      dureeLabel: "12 mois",
      dateDebutLabel: formatDateFR(today()),
      dateFinLabel: formatDateFR(addMonths(today(), 12)),
      montantHT: 0,
      tauxTVA: 18,
      dateSignatureLabel: formatDateFR(today()),
    }),
  );

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: bodyHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "outline-none min-h-[400px]", "aria-label": "Corps du contrat" },
    },
    onUpdate: ({ editor }) => setBodyHtml(editor.getHTML()),
  });

  /** Régénère le corps depuis les variables actuelles (écrase les éditions). */
  function regenerate() {
    const html = buildContratHtml(buildVars());
    editor?.commands.setContent(html);
    setBodyHtml(html);
    toast.success("Modèle régénéré", "Le corps a été reconstruit depuis les variables.");
  }

  const valid = clientId !== "" && siteId !== "" && dateDebut !== "" && montantHT > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      await createContract({
        clientId,
        siteId,
        type,
        montantHT,
        tauxTVA,
        frequenceFacturation: frequence,
        dateSignature,
        dateDebut,
        dateFin: dateFin || null,
        description: titre.trim() || `Contrat de prestation — ${clientLabel}`,
      });
      // Archivage best-effort du contrat rédigé (texte exact) en Document.
      try {
        await createDocument({
          type: "contrat",
          titre: titre.trim() || `Contrat — ${clientLabel || "client"}`,
          numero: null,
          clientId,
          donnees: {
            html: bodyHtml,
            client: clientLabel,
            site: siteLabel,
            montantHT,
            tauxTVA,
            dateDebut,
            dateFin,
          },
        });
      } catch {
        /* le document détaillé est optionnel */
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Contrat créé et enregistré");
      onClose();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|permission|refus/i.test(msg);
      toast.error(
        denied
          ? "Accès refusé : seuls DG, RP et RF peuvent créer un contrat."
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
            Nouveau contrat
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            Éditeur de contrat — titres, articles, clauses (OHADA)
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
            {mutation.isPending ? "Enregistrement…" : "Créer le contrat"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* ── Informations (non imprimé) ── */}
        <div className="doc-toolbar flex flex-col gap-4">
          <Card className="p-4">
            <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
              Informations
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={label}>Client *</label>
                <select className={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {clientOpts.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Site *</label>
                <select className={field} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {siteOpts.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Titre / objet du contrat</label>
                <input
                  className={field}
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex : Contrat de gardiennage"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Type</label>
                  <select className={field} value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => (
                      <option key={t.v} value={t.v}>{t.l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Fréquence</label>
                  <select className={field} value={frequence} onChange={(e) => setFrequence(e.target.value)}>
                    {FREQUENCES.map((f) => (
                      <option key={f.v} value={f.v}>{f.l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Date de signature</label>
                  <input type="date" className={field} value={dateSignature} onChange={(e) => setDateSignature(e.target.value)} />
                </div>
                <div>
                  <label className={label}>Date de début</label>
                  <input type="date" className={field} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Date de fin</label>
                  <input type="date" className={field} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                </div>
                <div>
                  <label className={label}>TVA (%)</label>
                  <select className={field} value={tauxTVA} onChange={(e) => setTauxTVA(Number(e.target.value))}>
                    <option value={18}>18 %</option>
                    <option value={0}>0 %</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Montant mensuel HT (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={montantHT}
                  onChange={(e) => setMontantHT(Number(e.target.value))}
                />
              </div>
              <Button size="sm" variant="outline" onClick={regenerate}>
                <RotateCcw className="size-3.5" /> Régénérer le modèle
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-foreground mb-1.5 text-[12px] font-bold">💡 Conseils</div>
            <ul className="text-muted list-disc space-y-1 pl-4 text-[11px] font-semibold">
              <li>Remplissez les Informations puis « Régénérer le modèle »</li>
              <li>Le corps reste librement éditable (titres, gras, listes)</li>
              <li>La signature du DG et le cachet sont apposés en bas</li>
              <li>Clauses légales sénégalaises (OHADA) incluses</li>
            </ul>
          </Card>
        </div>

        {/* ── Le contrat (papier A4 éditable + imprimé) ── */}
        <div>
          {/* Barre de mise en forme (non imprimée) */}
          {editor && (
            <div className="doc-toolbar border-border bg-surface2 mb-0 flex flex-wrap items-center gap-0.5 rounded-t-[10px] border border-b-0 p-1.5">
              <TBtn title="Annuler" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                <Undo2 className="size-4" />
              </TBtn>
              <TBtn title="Rétablir" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                <Redo2 className="size-4" />
              </TBtn>
              <div className="bg-border mx-1 h-5 w-px" />
              <TBtn title="Titre d'article" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 className="size-4" />
              </TBtn>
              <TBtn title="Sous-titre" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <Heading3 className="size-4" />
              </TBtn>
              <div className="bg-border mx-1 h-5 w-px" />
              <TBtn title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold className="size-4" />
              </TBtn>
              <TBtn title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic className="size-4" />
              </TBtn>
              <TBtn title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon className="size-4" />
              </TBtn>
              <div className="bg-border mx-1 h-5 w-px" />
              <TBtn title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List className="size-4" />
              </TBtn>
              <TBtn title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered className="size-4" />
              </TBtn>
              <div className="text-muted ml-auto pr-1 text-[11px] font-bold">
                Contrat de prestation · OHADA
              </div>
            </div>
          )}

          {/* Le papier (imprimé) */}
          <div className="overflow-x-auto rounded-b-[10px] border border-t-0 border-border bg-black/5 p-4 sm:p-6">
            <div
              id="doc-print"
              className="mx-auto max-w-[820px] rounded-sm bg-white px-8 py-10 text-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:px-12"
            >
              {/* En-tête léger */}
              <header className="mb-6 flex items-start justify-between border-b pb-4" style={{ borderColor: gold }}>
                <div className="flex items-center gap-3">
                  {os.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={os.logo} alt={os.name} style={{ maxHeight: 48, maxWidth: 110, objectFit: "contain" }} />
                  ) : (
                    <div
                      className="flex size-11 items-center justify-center rounded-lg font-black text-white"
                      style={{ background: navy }}
                    >
                      <span>O<span style={{ color: gold }}>N</span>E</span>
                    </div>
                  )}
                  <div>
                    <div className="text-[15px] font-extrabold" style={{ color: navy }}>{os.name}</div>
                    <div className="text-[9px] font-semibold" style={{ color: "#6b7280" }}>{os.activites}</div>
                  </div>
                </div>
                <div className="text-right text-[9px] font-semibold" style={{ color: "#6b7280" }}>
                  RCCM : {os.rccm}
                  <br />
                  NINEA : {os.ninea}
                </div>
              </header>

              {/* Corps éditable */}
              <EditorContent
                editor={editor}
                className={cn(
                  RTE_PROSE,
                  "contrat-body [&_h1]:mb-4 [&_h1]:text-center [&_h1]:text-[18px] [&_h1]:font-extrabold",
                )}
                style={{ ["--doc-navy" as string]: navy }}
              />

              {/* Signatures */}
              <div className="mt-10 grid grid-cols-2 gap-10 text-[11px]">
                <div>
                  <div className="font-bold" style={{ color: navy }}>Pour le Prestataire</div>
                  {os.signature.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={os.signature.image} alt="Signature" className="mt-1 h-12 object-contain" />
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="mt-1 border-t-2 pt-1 font-bold" style={{ borderColor: gold, color: navy }}>
                    {os.signature.signataire || os.name}
                  </div>
                  <div className="text-[10px]" style={{ color: "#6b7280" }}>
                    {os.signature.fonction || "Signature et cachet"}
                  </div>
                </div>
                <div>
                  <div className="font-bold" style={{ color: navy }}>Pour le Client</div>
                  <div className="h-12" />
                  <div className="mt-1 border-t-2 pt-1 font-bold" style={{ borderColor: gold, color: navy }}>
                    Le Client
                  </div>
                  <div className="text-[10px]" style={{ color: "#6b7280" }}>Signature et cachet</div>
                </div>
              </div>
            </div>
          </div>
          {!valid && (
            <div className="doc-toolbar text-muted mt-2 text-center text-[11px] font-semibold">
              Client, site, date de début et montant requis pour créer le contrat.
            </div>
          )}
        </div>
      </div>

      {/* Impression : n'imprime que le document. */}
      <style>{`
        /* Papier toujours blanc → couleurs fixes (jamais les couleurs du thème). */
        .contrat-body, .contrat-body p, .contrat-body li { color: #1f2937 !important; }
        .contrat-body strong { color: #111827 !important; }
        .contrat-body h1, .contrat-body h2, .contrat-body h3 { color: var(--doc-navy) !important; }
        .contrat-body .ProseMirror { min-height: 400px; caret-color: var(--doc-navy); }
        @media print {
          body * { visibility: hidden !important; }
          #doc-print, #doc-print * { visibility: visible !important; }
          #doc-print { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 14mm !important; }
          #doc-print .no-print { display: none !important; }
          .doc-toolbar { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </ScreenContainer>
  );
}
