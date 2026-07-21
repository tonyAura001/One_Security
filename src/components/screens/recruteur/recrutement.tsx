"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CalendarClock, Plus, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import {
  fetchRecrutementStats,
  fetchPipelineCandidatures,
  fetchPostes,
  createCandidature,
  updateCandidatureStatut,
  type CandidatureCard,
  type CandidatureStatut,
  type NewCandidatureInput,
} from "@/lib/supabase/data/recrutement";
import { Candidat360, RECRUIT_STAGES } from "./candidat-360";

const COLUMNS: KanbanColumn[] = RECRUIT_STAGES.map((s) => ({
  id: s.id,
  title: s.title,
  tone: s.tone,
}));

const QK = ["pipeline-candidatures"] as const;

export function RecrutementScreen() {
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["recrutement-stats"], queryFn: fetchRecrutementStats });
  const { data: candidatures = [] } = useQuery({ queryKey: QK, queryFn: fetchPipelineCandidatures });
  const [detailId, setDetailId] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: CandidatureStatut }) =>
      updateCandidatureStatut(id, statut),
    onMutate: async ({ id, statut }) => {
      await qc.cancelQueries({ queryKey: QK });
      const prev = qc.getQueryData<CandidatureCard[]>(QK);
      qc.setQueryData<CandidatureCard[]>(QK, (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, statut } : c)),
      );
      return { prev };
    },
    onError: (e: unknown, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK, ctx.prev);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refus/i.test(msg) ? "Accès refusé (DG/RH/Manager requis)." : `Échec : ${msg}`,
      );
    },
    onSuccess: (_d, { statut }) => {
      const label = RECRUIT_STAGES.find((s) => s.id === statut)?.title ?? statut;
      toast.success(`Candidat déplacé vers « ${label} »`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: ["recrutement-stats"] });
    },
  });

  const detail = detailId ? candidatures.find((c) => c.id === detailId) ?? null : null;
  if (detail) {
    return (
      <Candidat360
        candidature={detail}
        busy={move.isPending}
        onStatut={(statut) => move.mutate({ id: detail.id, statut })}
        onClose={() => setDetailId(null)}
      />
    );
  }

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">
            Ressources humaines
          </div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Recrutement</h1>
        </div>
        <NouveauCandidatDialog />
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-[15px] lg:grid-cols-4">
        <Kpi icon={Briefcase} tone="accent" value={stats?.postesOuverts ?? 0} label="Postes ouverts" />
        <Kpi icon={Users} tone="violet" value={stats?.candidaturesTotal ?? 0} label="Candidatures" />
        <Kpi icon={CalendarClock} tone="warning" value={stats?.entretiensAVenir ?? 0} label="Entretiens à venir" />
        <Kpi icon={TrendingUp} tone="success" value={`${stats?.tauxEmbauche ?? 0} %`} label="Taux d'embauche" />
      </div>

      {/* Pipeline kanban */}
      <div className="text-muted mb-2.5 text-[11px] font-bold tracking-[0.7px] uppercase">
        Pipeline candidats · glissez une carte pour changer d&apos;étape
      </div>
      <KanbanBoard<CandidatureCard>
        columns={COLUMNS}
        items={candidatures}
        getId={(c) => c.id}
        getColumn={(c) => c.statut}
        onMove={(id, toColumn) => move.mutate({ id, statut: toColumn as CandidatureStatut })}
        renderCard={(c) => <CandidatCard c={c} onClick={() => setDetailId(c.id)} />}
      />
    </ScreenContainer>
  );
}

function CandidatCard({ c, onClick }: { c: CandidatureCard; onClick: () => void }) {
  const initials = ((c.candidat.prenom[0] ?? "") + (c.candidat.nom[0] ?? "")).toUpperCase() || "··";
  return (
    <Card
      className="cursor-pointer p-[11px] transition-shadow hover:shadow-card-hover"
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <div className="bg-accent/14 text-accent flex size-9 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-[12.5px] font-bold">
            {`${c.candidat.prenom} ${c.candidat.nom}`.trim() || "—"}
          </div>
          <div className="text-muted mt-0.5 truncate text-[10.5px] font-semibold">{c.posteTitre}</div>
        </div>
      </div>
      <div className="text-muted mt-2.5 text-[10.5px] font-semibold">
        Postulé le {formatDateFR(c.datePostulation, "dd/MM/yyyy")}
      </div>
    </Card>
  );
}

function Kpi({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: LucideIcon;
  tone: "accent" | "violet" | "warning" | "success";
  value: string | number;
  label: string;
}) {
  const toneCls: Record<string, string> = {
    accent: "bg-accent/14 text-accent",
    violet: "bg-violet/14 text-violet",
    warning: "bg-warning/14 text-warning",
    success: "bg-success/14 text-success",
  };
  return (
    <Card className="p-4">
      <span className={cn("mb-3 flex size-10 items-center justify-center rounded-[12px]", toneCls[tone])}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div className="text-foreground text-[24px] font-extrabold tracking-[-0.5px]">{value}</div>
      <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{label}</div>
    </Card>
  );
}

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

function NouveauCandidatDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: postes = [] } = useQuery({ queryKey: ["postes"], queryFn: fetchPostes });
  const [posteId, setPosteId] = useState("");
  const [f, setF] = useState<NewCandidatureInput>({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    messageMotivation: "",
  });

  const set = (k: keyof NewCandidatureInput, v: string) => setF((s) => ({ ...s, [k]: v }));
  const valid = posteId !== "" && f.prenom.trim() !== "" && f.nom.trim() !== "";

  const mut = useMutation({
    mutationFn: () => createCandidature(posteId, f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: ["recrutement-stats"] });
      qc.invalidateQueries({ queryKey: ["postes"] });
      toast.success(`Candidature de ${f.prenom.trim()} ${f.nom.trim()} ajoutée`);
      setF({ prenom: "", nom: "", email: "", telephone: "", messageMotivation: "" });
      setPosteId("");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé (DG/RH/Manager)." : `Échec : ${msg}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" strokeWidth={2.4} /> Ajouter un candidat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau candidat</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className={label}>Poste visé *</label>
            <select className={field} value={posteId} onChange={(e) => setPosteId(e.target.value)}>
              <option value="">— Choisir un poste —</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>{p.titre}</option>
              ))}
            </select>
            {postes.length === 0 && (
              <p className="text-muted mt-1 text-[10.5px] font-medium">
                Aucun poste ouvert — créez d&apos;abord un poste dans « Postes ».
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Prénom *</label>
              <input className={field} value={f.prenom} onChange={(e) => set("prenom", e.target.value)} />
            </div>
            <div>
              <label className={label}>Nom *</label>
              <input className={field} value={f.nom} onChange={(e) => set("nom", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>E-mail</label>
              <input className={field} value={f.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className={label}>Téléphone</label>
              <input className={field} value={f.telephone} onChange={(e) => set("telephone", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Source / motivation</label>
            <input
              className={field}
              value={f.messageMotivation}
              onChange={(e) => set("messageMotivation", e.target.value)}
              placeholder="Ex : Recommandation, LinkedIn…"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Annuler</Button>
          </DialogClose>
          <Button size="sm" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Ajout…" : "Ajouter le candidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
