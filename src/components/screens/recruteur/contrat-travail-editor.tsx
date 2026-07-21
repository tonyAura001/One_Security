"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Bold, Heading2, Heading3, Italic, List, ListOrdered,
  Printer, RotateCcw, Save, Underline as UnderlineIcon, Undo2, Redo2,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import { useCompanyIdentity } from "@/lib/documents/use-identity";
import { RTE_PROSE } from "@/components/documents/rich-text-editor";
import { buildContratTravailHtml, type ContratTravailVars } from "@/lib/documents/contrat-travail-template";
import {
  createContratTravail, saveContratTravail,
  type ContratTravail, type ContractType,
} from "@/lib/supabase/data/rh-emploi";

const field =
  "w-full rounded-[9px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[10.5px] font-bold tracking-[0.3px] uppercase";
const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (d: string, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); };

function TBtn({ active, onClick, disabled, title, children }: { active?: boolean; onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled}
      className={cn("text-muted hover:bg-hover hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40", active && "bg-accent/14 text-accent")}>
      {children}
    </button>
  );
}

export function ContratTravailEditor({ contract, onClose }: { contract: ContratTravail | null; onClose: () => void }) {
  const qc = useQueryClient();
  const os = useCompanyIdentity();
  const navy = os.couleurPrincipale;
  const gold = os.couleurAccent;
  const isEdit = !!contract;

  const [employe, setEmploye] = useState(contract?.employe ?? "");
  const [poste, setPoste] = useState(contract?.poste ?? "Agent de sécurité");
  const [type, setType] = useState<ContractType>(contract?.type ?? "CDI");
  const [site, setSite] = useState(contract?.site ?? "");
  const [salaire, setSalaire] = useState(String(contract?.salaire ?? 0));
  const [dateDebut, setDateDebut] = useState(contract?.dateDebut ?? today());
  const [dateFin, setDateFin] = useState(contract?.dateFin ?? addMonths(today(), 12));

  const buildVars = (): ContratTravailVars => ({
    employeurName: os.name,
    employeurRccm: os.rccm,
    employeurAdresse: os.adresse,
    employeurRep: os.pdg,
    employeName: employe,
    poste,
    type,
    salaire: Number(salaire) || 0,
    dateDebutLabel: dateDebut ? formatDateFR(dateDebut) : "…",
    dateFinLabel: dateFin ? formatDateFR(dateFin) : "…",
    site,
    dateSignatureLabel: formatDateFR(today()),
  });

  const [bodyHtml, setBodyHtml] = useState(() =>
    contract?.corps ??
    buildContratTravailHtml({
      employeurName: os.name, employeurRccm: os.rccm, employeurAdresse: os.adresse, employeurRep: os.pdg,
      employeName: contract?.employe ?? "[NOM DU SALARIÉ]", poste: contract?.poste ?? "Agent de sécurité",
      type: contract?.type ?? "CDI", salaire: contract?.salaire ?? 0,
      dateDebutLabel: formatDateFR(today()), dateFinLabel: formatDateFR(addMonths(today(), 12)),
      site: contract?.site ?? "", dateSignatureLabel: formatDateFR(today()),
    }),
  );

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: bodyHtml,
    immediatelyRender: false,
    editorProps: { attributes: { class: "outline-none min-h-[400px]", "aria-label": "Corps du contrat de travail" } },
    onUpdate: ({ editor }) => setBodyHtml(editor.getHTML()),
  });

  function regenerate() {
    const html = buildContratTravailHtml(buildVars());
    editor?.commands.setContent(html);
    setBodyHtml(html);
    toast.success("Modèle régénéré");
  }

  const valid = employe.trim() !== "" && Number(salaire) > 0;

  const mutation = useMutation({
    mutationFn: () => {
      const input = { employe, poste, type, site, salaire: Number(salaire) || 0, dateDebut, dateFin: type === "CDD" ? dateFin : null, corps: bodyHtml };
      return isEdit ? saveContratTravail(contract!.id, input) : createContratTravail(input).then(() => undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contrats-travail"] });
      toast.success(isEdit ? "Contrat enregistré" : "Contrat de travail créé", employe);
      onClose();
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (DG/RH/Manager)." : "Échec de l'enregistrement."),
  });

  return (
    <ScreenContainer>
      <div className="doc-toolbar mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onClose}><ArrowLeft className="size-4" /> Retour</Button>
        <div className="min-w-0">
          <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">{isEdit ? "Modifier le contrat de travail" : "Nouveau contrat de travail"}</div>
          <div className="text-muted text-[11.5px] font-semibold">Document légal éditable · CDI / CDD</div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Exporter PDF</Button>
          <Button size="sm" onClick={() => valid && mutation.mutate()} disabled={!valid || mutation.isPending}>
            <Save className="size-4" /> {mutation.isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le contrat"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="doc-toolbar flex flex-col gap-4">
          <Card className="p-4">
            <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">Informations</div>
            <div className="flex flex-col gap-3">
              <div><label className={label}>Salarié *</label><input className={field} value={employe} onChange={(e) => setEmploye(e.target.value)} placeholder="Nom et prénom" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label}>Poste</label><input className={field} value={poste} onChange={(e) => setPoste(e.target.value)} /></div>
                <div><label className={label}>Type</label>
                  <select className={field} value={type} onChange={(e) => setType(e.target.value as ContractType)}>
                    <option value="CDI">CDI</option><option value="CDD">CDD</option>
                  </select>
                </div>
              </div>
              <div><label className={label}>Site affecté</label><input className={field} value={site} onChange={(e) => setSite(e.target.value)} placeholder="Ex. CBAO Indépendance" /></div>
              <div><label className={label}>Salaire brut mensuel (FCFA) *</label><input type="number" min={0} className={field} value={salaire} onChange={(e) => setSalaire(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label}>Date de début</label><input type="date" className={field} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} /></div>
                {type === "CDD" && <div><label className={label}>Date de fin</label><input type="date" className={field} value={dateFin} onChange={(e) => setDateFin(e.target.value)} /></div>}
              </div>
              <Button size="sm" variant="outline" onClick={regenerate}><RotateCcw className="size-3.5" /> Régénérer le modèle</Button>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-foreground mb-1.5 text-[12px] font-bold">💡 Conseils</div>
            <ul className="text-muted list-disc space-y-1 pl-4 text-[11px] font-semibold">
              <li>Renseignez les infos puis « Régénérer le modèle »</li>
              <li>Le corps reste librement éditable</li>
              <li>Signature de l&apos;employeur (DG) apposée en bas</li>
              <li>Clauses Code du travail sénégalais incluses</li>
            </ul>
          </Card>
        </div>

        <div>
          {editor && (
            <div className="doc-toolbar border-border bg-surface2 mb-0 flex flex-wrap items-center gap-0.5 rounded-t-[10px] border border-b-0 p-1.5">
              <TBtn title="Annuler" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="size-4" /></TBtn>
              <TBtn title="Rétablir" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="size-4" /></TBtn>
              <div className="bg-border mx-1 h-5 w-px" />
              <TBtn title="Titre d'article" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></TBtn>
              <TBtn title="Sous-titre" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></TBtn>
              <div className="bg-border mx-1 h-5 w-px" />
              <TBtn title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></TBtn>
              <TBtn title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></TBtn>
              <TBtn title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-4" /></TBtn>
              <div className="bg-border mx-1 h-5 w-px" />
              <TBtn title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></TBtn>
              <TBtn title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></TBtn>
              <div className="text-muted ml-auto pr-1 text-[11px] font-bold">Contrat de travail · {type}</div>
            </div>
          )}

          <div className="overflow-x-auto rounded-b-[10px] border border-t-0 border-border bg-black/5 p-4 sm:p-6">
            <div id="doc-print" className="mx-auto max-w-[820px] rounded-sm bg-white px-8 py-10 text-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:px-12">
              <header className="mb-6 flex items-start justify-between border-b pb-4" style={{ borderColor: gold }}>
                <div className="flex items-center gap-3">
                  {os.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={os.logo} alt={os.name} style={{ maxHeight: 48, maxWidth: 110, objectFit: "contain" }} />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-lg font-black text-white" style={{ background: navy }}>
                      <span>O<span style={{ color: gold }}>N</span>E</span>
                    </div>
                  )}
                  <div>
                    <div className="text-[15px] font-extrabold" style={{ color: navy }}>{os.name}</div>
                    <div className="text-[9px] font-semibold" style={{ color: "#6b7280" }}>{os.activites}</div>
                  </div>
                </div>
                <div className="text-right text-[9px] font-semibold" style={{ color: "#6b7280" }}>RCCM : {os.rccm}<br />NINEA : {os.ninea}</div>
              </header>

              <EditorContent editor={editor} className={cn(RTE_PROSE, "contrat-body [&_h1]:mb-4 [&_h1]:text-center [&_h1]:text-[17px] [&_h1]:font-extrabold")} style={{ ["--doc-navy" as string]: navy }} />

              <div className="mt-10 grid grid-cols-2 gap-10 text-[11px]">
                <div>
                  <div className="font-bold" style={{ color: navy }}>Pour l&apos;Employeur</div>
                  {os.signature.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={os.signature.image} alt="Signature" className="mt-1 h-12 object-contain" />
                  ) : <div className="h-12" />}
                  <div className="mt-1 border-t-2 pt-1 font-bold" style={{ borderColor: gold, color: navy }}>{os.signature.signataire || os.name}</div>
                  <div className="text-[10px]" style={{ color: "#6b7280" }}>{os.signature.fonction || "Direction"}</div>
                </div>
                <div>
                  <div className="font-bold" style={{ color: navy }}>Le Salarié</div>
                  <div className="h-12" />
                  <div className="mt-1 border-t-2 pt-1 font-bold" style={{ borderColor: gold, color: navy }}>{employe || "Le Salarié"}</div>
                  <div className="text-[10px]" style={{ color: "#6b7280" }}>« Lu et approuvé »</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
