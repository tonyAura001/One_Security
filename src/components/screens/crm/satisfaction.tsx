"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchSiteOptions, fetchClientOptions } from "@/lib/supabase/data/options";
import { fetchAudits, createAudit } from "@/lib/supabase/data/satisfaction";
import {
  fetchReclamations,
  createReclamation,
  updateReclamationStatut,
  type Reclamation,
  type Severite,
  type ReclamationStatut,
  type NewReclamationInput,
} from "@/lib/supabase/data/reclamations";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

const SEVERITY_META: Record<Severite, { variant: PillVariant; label: string }> = {
  elevee: { variant: "danger", label: "Élevée" },
  moyenne: { variant: "warning", label: "Moyenne" },
  faible: { variant: "neutral", label: "Faible" },
};

const RECLAM_COLUMNS: KanbanColumn[] = [
  { id: "ouverte", title: "Ouverte", tone: "danger" },
  { id: "en_cours", title: "En cours", tone: "warning" },
  { id: "resolue", title: "Résolue", tone: "success" },
];

function scoreMeta(score: number): { variant: PillVariant; text: string } {
  if (score >= 80) return { variant: "success", text: "text-success" };
  if (score >= 60) return { variant: "warning", text: "text-warning" };
  return { variant: "danger", text: "text-danger" };
}

const RQK = ["reclamations"] as const;
type Tab = "reclamations" | "audits";

/** Écran unifié « Satisfaction & Qualité » : réclamations (kanban) + audits. */
export function SatisfactionScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("reclamations");

  const { data: reclamations = [] } = useQuery({ queryKey: RQK, queryFn: fetchReclamations });
  const { data: audits = [] } = useQuery({ queryKey: ["audits"], queryFn: fetchAudits });

  // KPIs consolidés.
  const total = reclamations.length;
  const openCount = reclamations.filter((r) => r.statut === "ouverte").length;
  const resolved = reclamations.filter((r) => r.statut === "resolue").length;
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 100;
  const auditAvg = audits.length
    ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length)
    : null;
  const scoreQualite = auditAvg !== null ? Math.round((auditAvg + resolutionRate) / 2) : resolutionRate;

  const move = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: ReclamationStatut }) =>
      updateReclamationStatut(id, statut),
    onMutate: async ({ id, statut }) => {
      await qc.cancelQueries({ queryKey: RQK });
      const prev = qc.getQueryData<Reclamation[]>(RQK);
      qc.setQueryData<Reclamation[]>(RQK, (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, statut } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(RQK, ctx.prev);
      toast.error("Déplacement refusé (accès requis).");
    },
    onSuccess: (_d, { statut }) => {
      const l = RECLAM_COLUMNS.find((c) => c.id === statut)?.title ?? statut;
      toast.success(`Réclamation → « ${l} »`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: RQK }),
  });

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">CRM · Qualité</div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Satisfaction &amp; Qualité</h1>
        </div>
        {tab === "reclamations" ? <NewReclamationDialog /> : <NewAuditDialog />}
      </div>

      {/* KPIs consolidés */}
      <div className="mb-5 grid grid-cols-2 gap-[15px] lg:grid-cols-4">
        <Kpi label="Score qualité" value={`${scoreQualite}/100`} valueClass={scoreMeta(scoreQualite).text} />
        <Kpi label="Réclamations ouvertes" value={String(openCount)} valueClass={openCount > 0 ? "text-danger" : "text-foreground"} />
        <Kpi label="Taux de résolution" value={`${resolutionRate} %`} valueClass="text-success" />
        <Kpi label="Score audits moyen" value={auditAvg !== null ? `${auditAvg}/100` : "—"} valueClass={auditAvg !== null ? scoreMeta(auditAvg).text : "text-foreground"} />
      </div>

      {/* Onglets */}
      <Card className="mb-[15px] flex gap-1 p-1.5">
        {([
          { id: "reclamations" as Tab, label: `Réclamations (${total})` },
          { id: "audits" as Tab, label: `Audits (${audits.length})` },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold transition-colors",
              tab === t.id ? "bg-accent/14 text-accent" : "text-muted hover:bg-hover hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </Card>

      {tab === "reclamations" ? (
        reclamations.length === 0 ? (
          <Card className="p-[18px_20px]">
            <EmptyState title="Aucune réclamation" description="Enregistrez une réclamation client pour en assurer le suivi." />
          </Card>
        ) : (
          <>
            <div className="text-muted mb-2.5 text-[11px] font-bold tracking-[0.7px] uppercase">
              Glissez une réclamation pour changer son statut
            </div>
            <KanbanBoard<Reclamation>
              columns={RECLAM_COLUMNS}
              items={reclamations}
              getId={(r) => r.id}
              getColumn={(r) => r.statut}
              onMove={(id, toColumn) => move.mutate({ id, statut: toColumn as ReclamationStatut })}
              renderCard={(r) => <ReclamationCard r={r} />}
            />
          </>
        )
      ) : (
        <Card className="p-[18px_20px]">
          <div className="text-foreground mb-1 text-[15px] font-extrabold tracking-[-0.3px]">Audits de satisfaction</div>
          <p className="text-muted mb-3.5 text-[12px] font-semibold">Qualité de service perçue sur les sites gardés.</p>
          {audits.length === 0 ? (
            <EmptyState icon={Star} title="Aucun audit" description="Enregistrez un audit de satisfaction d'un site." />
          ) : (
            <div className="flex flex-col">
              {audits.map((a, i) => {
                const m = scoreMeta(a.score);
                return (
                  <div key={a.id} className={cn("flex flex-wrap items-center gap-3.5 py-3", i < audits.length - 1 && "border-border border-b")}>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-[13px] font-bold">{a.site}</div>
                      <div className="text-muted mt-0.5 text-[11px] font-semibold">
                        {a.auditeur ?? "—"} · {formatDateFR(a.date)}
                        {a.commentaire ? ` · ${a.commentaire}` : ""}
                      </div>
                    </div>
                    <StatusPill variant={m.variant} uppercase>{a.score}/100</StatusPill>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </ScreenContainer>
  );
}

function Kpi({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <Card className="p-4">
      <div className="text-muted text-[11px] font-semibold">{label}</div>
      <div className={cn("mt-1 text-[22px] font-extrabold", valueClass ?? "text-foreground")}>{value}</div>
    </Card>
  );
}

function ReclamationCard({ r }: { r: Reclamation }) {
  const sev = SEVERITY_META[r.severite];
  return (
    <Card className="p-[12px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted text-[10.5px] font-extrabold">{r.ref}</span>
        <StatusPill variant={sev.variant} uppercase>{sev.label}</StatusPill>
      </div>
      <div className="text-foreground mt-1.5 text-[12.5px] font-bold">{r.objet}</div>
      <div className="text-muted mt-1 truncate text-[11px] font-semibold">{r.client}</div>
      <div className="text-muted mt-2 text-[10.5px] font-semibold">{formatDateFR(r.createdAt, "dd/MM/yyyy")}</div>
    </Card>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

function NewReclamationDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [description, setDescription] = useState("");
  const [severite, setSeverite] = useState<Severite>("moyenne");
  const { data: clients } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });

  const mutation = useMutation({
    mutationFn: () => {
      const input: NewReclamationInput = { clientId: clientId || null, objet, description, severite };
      return createReclamation(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RQK });
      toast.success("Réclamation enregistrée");
      setClientId(""); setObjet(""); setDescription(""); setSeverite("moyenne");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé." : `Échec : ${msg}`);
    },
  });
  const valid = objet.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouvelle réclamation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>Nouvelle réclamation</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Client</label>
            <select className={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Aucun / non client —</option>
              {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Objet *</label>
            <input className={field} value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex. Agent absent au poste de nuit" autoFocus />
          </div>
          <div>
            <label className={label}>Gravité</label>
            <select className={field} value={severite} onChange={(e) => setSeverite(e.target.value as Severite)}>
              <option value="elevee">Élevée</option>
              <option value="moyenne">Moyenne</option>
              <option value="faible">Faible</option>
            </select>
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea className={`${field} min-h-[80px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails de la réclamation…" />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>{mutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewAuditDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [auditeur, setAuditeur] = useState("");
  const [score, setScore] = useState("80");
  const [commentaire, setCommentaire] = useState("");
  const { data: sites } = useQuery({ queryKey: ["site-options"], queryFn: fetchSiteOptions });

  const mutation = useMutation({
    mutationFn: () => createAudit({ siteId: siteId || null, auditeur, score: Number(score) || 0, commentaire }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audits"] });
      toast.success("Audit enregistré");
      setSiteId(""); setAuditeur(""); setScore("80"); setCommentaire("");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (DG/RP/Manager)." : `Échec : ${e instanceof Error ? e.message : e}`),
  });
  const valid = Number(score) >= 0 && Number(score) <= 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouvel audit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>Nouvel audit de satisfaction</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Site</label>
            <select className={field} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(sites ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Auditeur</label>
              <input className={field} value={auditeur} onChange={(e) => setAuditeur(e.target.value)} placeholder="Nom" />
            </div>
            <div>
              <label className={label}>Score /100 *</label>
              <input inputMode="numeric" className={field} value={score} onChange={(e) => setScore(e.target.value.replace(/[^\d]/g, "").slice(0, 3))} />
            </div>
          </div>
          <div>
            <label className={label}>Commentaire</label>
            <textarea className={`${field} min-h-[70px] resize-y`} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>{mutation.isPending ? "…" : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
