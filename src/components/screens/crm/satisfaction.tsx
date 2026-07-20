"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
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
import { fetchSiteOptions } from "@/lib/supabase/data/options";
import { fetchAudits, createAudit } from "@/lib/supabase/data/satisfaction";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

function scoreMeta(score: number): { variant: PillVariant; text: string } {
  if (score >= 80) return { variant: "success", text: "text-success" };
  if (score >= 60) return { variant: "warning", text: "text-warning" };
  return { variant: "danger", text: "text-danger" };
}

export function SatisfactionScreen() {
  const { data: audits = [] } = useQuery({ queryKey: ["audits"], queryFn: fetchAudits });
  const avg = audits.length ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length) : 0;
  const good = audits.filter((a) => a.score >= 80).length;
  const bad = audits.filter((a) => a.score < 60).length;

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Satisfaction &amp; audits</h1>
          <p className="page-subtitle">Qualité de service perçue sur les sites gardés</p>
        </div>
        <NewAuditDialog />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-muted text-[11px] font-semibold">Score moyen</div>
          <div className={cn("mt-1 text-[22px] font-extrabold", scoreMeta(avg).text)}>{avg}/100</div>
        </Card>
        <Card className="p-4">
          <div className="text-muted text-[11px] font-semibold">Sites bien notés (≥80)</div>
          <div className="text-foreground mt-1 text-[22px] font-extrabold">{good}</div>
        </Card>
        <Card className="p-4">
          <div className="text-muted text-[11px] font-semibold">À surveiller (&lt;60)</div>
          <div className={cn("mt-1 text-[22px] font-extrabold", bad > 0 ? "text-danger" : "text-foreground")}>{bad}</div>
        </Card>
      </div>

      <Card className="mt-4 p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Audits récents
        </div>
        {audits.length === 0 ? (
          <EmptyState icon={Star} title="Aucun audit" description="Enregistrez un audit de satisfaction d'un site." />
        ) : (
          <div className="flex flex-col">
            {audits.map((a, i) => {
              const m = scoreMeta(a.score);
              return (
                <div
                  key={a.id}
                  className={cn("flex flex-wrap items-center gap-3.5 py-3", i < audits.length - 1 && "border-border border-b")}
                >
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
    </ScreenContainer>
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
    mutationFn: () =>
      createAudit({ siteId: siteId || null, auditeur, score: Number(score) || 0, commentaire }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audits"] });
      toast.success("Audit enregistré");
      setSiteId("");
      setAuditeur("");
      setScore("80");
      setCommentaire("");
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
