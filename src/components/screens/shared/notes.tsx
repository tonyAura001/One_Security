"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  fetchContenus,
  createContenu,
  updateContenu,
  deleteContenu,
} from "@/lib/supabase/data/contenu";

const COLORS: { v: string; bg: string }[] = [
  { v: "jaune", bg: "bg-amber-200/25 border-amber-400/30" },
  { v: "bleu", bg: "bg-blue-200/20 border-blue-400/30" },
  { v: "vert", bg: "bg-emerald-200/20 border-emerald-400/30" },
  { v: "rose", bg: "bg-rose-200/20 border-rose-400/30" },
];
const colorCls = (v: string | null) =>
  COLORS.find((c) => c.v === v)?.bg ?? COLORS[0].bg;

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function NotesScreen() {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ["contenu", "note"],
    queryFn: () => fetchContenus("note"),
  });

  const pin = useMutation({
    mutationFn: ({ id, epingle }: { id: string; epingle: boolean }) =>
      updateContenu(id, { epingle }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contenu", "note"] }),
    onError: () => toast.error("Action refusée."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteContenu(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenu", "note"] });
      toast.success("Note supprimée");
    },
    onError: () => toast.error("Suppression refusée."),
  });

  return (
    <ScreenContainer>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          MES NOTES · {notes.length}
        </div>
        <NewNoteDialog />
      </div>

      {notes.length === 0 ? (
        <EmptyState title="Aucune note" description="Créez une note personnelle." />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {notes.map((n) => (
            <div
              key={n.id}
              className={cn("flex flex-col rounded-2xl border p-4", colorCls(n.categorie))}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-foreground text-[13px] font-extrabold">{n.titre}</div>
                {n.mine && (
                  <div className="flex flex-none gap-1">
                    <button
                      onClick={() => pin.mutate({ id: n.id, epingle: !n.epingle })}
                      className="text-muted hover:text-accent rounded p-0.5"
                      title={n.epingle ? "Désépingler" : "Épingler"}
                    >
                      {n.epingle ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => remove.mutate(n.id)}
                      className="text-muted rounded p-0.5 hover:text-red-500"
                      title="Supprimer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {n.corps && (
                <p className="text-foreground/85 mt-2 flex-1 text-[12px] leading-[1.5] whitespace-pre-wrap">
                  {n.corps}
                </p>
              )}
              <div className="text-muted mt-3 text-[10px] font-semibold">
                {n.mine ? "Moi" : n.auteur} · {formatRelative(n.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScreenContainer>
  );
}

function NewNoteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");
  const [couleur, setCouleur] = useState("jaune");

  const mutation = useMutation({
    mutationFn: () => createContenu({ type: "note", titre, corps, categorie: couleur }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenu", "note"] });
      toast.success("Note créée");
      setTitre("");
      setCorps("");
      setCouleur("jaune");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(`Échec : ${e instanceof Error ? e.message : String(e)}`),
  });
  const valid = titre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Nouvelle note</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[420px]">
        <DialogHeader><DialogTitle>Nouvelle note</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Titre *</label>
            <input className={field} value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={label}>Contenu</label>
            <textarea className={`${field} min-h-[100px] resize-y`} value={corps} onChange={(e) => setCorps(e.target.value)} />
          </div>
          <div>
            <label className={label}>Couleur</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => setCouleur(c.v)}
                  className={cn(
                    "size-8 rounded-lg border-2",
                    c.bg,
                    couleur === c.v ? "border-accent" : "border-transparent",
                  )}
                  aria-label={c.v}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
