"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Video, Users } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
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
import { fetchContenus, createContenu } from "@/lib/supabase/data/contenu";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

function isUpcoming(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() >= Date.now() - 3600_000;
}

export function ReunionsScreen() {
  const { data: reunions = [] } = useQuery({
    queryKey: ["contenu", "reunion"],
    queryFn: () => fetchContenus("reunion"),
  });
  const sorted = [...reunions].sort(
    (a, b) => new Date(a.dateEvenement ?? 0).getTime() - new Date(b.dateEvenement ?? 0).getTime(),
  );

  return (
    <ScreenContainer>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          RÉUNIONS · {reunions.length}
        </div>
        <NewReunionDialog />
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucune réunion" description="Planifiez une réunion d'équipe." />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((r) => {
            const distanciel = (r.meta.mode as string) === "distanciel";
            const upcoming = isUpcoming(r.dateEvenement);
            return (
              <Card key={r.id} className="flex flex-wrap items-center gap-3.5 p-[16px_18px]">
                <span className="bg-active text-accent flex size-10 flex-none items-center justify-center rounded-xl">
                  {distanciel ? <Video className="size-5" /> : <Users className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[13.5px] font-bold">{r.titre}</div>
                  <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                    {r.dateEvenement ? formatDateFR(r.dateEvenement, "EEEE d MMM · HH:mm") : "Date à définir"}
                    {distanciel ? " · Distanciel" : " · Présentiel"}
                  </div>
                  {r.corps && <div className="text-muted mt-1 text-[11px]">{r.corps}</div>}
                </div>
                <StatusPill variant={upcoming ? "info" : "neutral"} uppercase>
                  {upcoming ? "À venir" : "Passée"}
                </StatusPill>
                {distanciel && upcoming && (r.meta.lien as string) && (
                  <Button size="xs" onClick={() => window.open(String(r.meta.lien), "_blank", "noopener")}>
                    Rejoindre
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </ScreenContainer>
  );
}

function NewReunionDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [mode, setMode] = useState("presentiel");
  const [lien, setLien] = useState("");
  const [corps, setCorps] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createContenu({
        type: "reunion",
        titre,
        corps,
        dateEvenement: date || null,
        meta: { mode, lien: lien || null },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenu", "reunion"] });
      toast.success("Réunion planifiée");
      setTitre("");
      setDate("");
      setLien("");
      setCorps("");
      setMode("presentiel");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(`Échec : ${e instanceof Error ? e.message : String(e)}`),
  });
  const valid = titre.trim() && date;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouvelle réunion</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>Planifier une réunion</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Objet *</label>
            <input className={field} value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Date & heure *</label>
              <input type="datetime-local" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={label}>Mode</label>
              <select className={field} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="presentiel">Présentiel</option>
                <option value="distanciel">Distanciel</option>
              </select>
            </div>
          </div>
          {mode === "distanciel" && (
            <div>
              <label className={label}>Lien visio</label>
              <input className={field} value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" />
            </div>
          )}
          <div>
            <label className={label}>Ordre du jour</label>
            <textarea className={`${field} min-h-[70px] resize-y`} value={corps} onChange={(e) => setCorps(e.target.value)} />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "…" : "Planifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
