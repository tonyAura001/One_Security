"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Lock, MapPin, Plus, Search, Trash2, Users, Video } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import { fetchUserOptions, type Opt } from "@/lib/supabase/data/options";
import {
  fetchReunions, createReunion, updateReunion, deleteReunion,
  type Reunion, type NewReunionInput,
} from "@/lib/supabase/data/reunions";

const field = "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function ReunionsScreen() {
  const { data: reunions = [] } = useQuery({ queryKey: ["reunions"], queryFn: fetchReunions });
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Reunion | null>(null);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n ? reunions.filter((r) => r.titre.toLowerCase().includes(n) || r.organisateur.toLowerCase().includes(n)) : reunions;
    return [...list].sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime());
  }, [reunions, q]);

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-muted text-[12px] font-bold">{reunions.length} réunion{reunions.length !== 1 ? "s" : ""}</div>
          <div className="text-muted mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-semibold">
            <Lock className="size-3" /> Seuls les participants voient et sont notifiés d&apos;une réunion.
          </div>
        </div>
        <NewReunionDialog />
      </div>

      <Card className="p-[18px_20px]">
        <div className="relative mb-3.5 max-w-[360px]">
          <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une réunion…" className={cn(field, "pl-9")} />
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Aucune réunion" description="Planifiez une réunion — seuls les participants la verront." />
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <button key={r.id} type="button" onClick={() => setDetail(r)}
                className={cn("hover:bg-hover flex flex-wrap items-center gap-3.5 rounded-lg px-2 py-3 text-left transition-colors", i < rows.length - 1 && "border-border border-b")}>
                <div className="bg-accent/14 text-accent flex size-11 flex-none flex-col items-center justify-center rounded-[12px]">
                  <span className="text-[14px] leading-none font-extrabold">{formatDateFR(r.dateHeure, "dd")}</span>
                  <span className="text-[8px] font-bold">{formatDateFR(r.dateHeure, "MMM").replace(".", "").toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-[13px] font-bold">{r.titre}</div>
                  <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">
                    {hhmm(r.dateHeure)} · {r.dureeMin} min · {r.organisateur}
                  </div>
                </div>
                <span className="text-muted inline-flex items-center gap-1 text-[11.5px] font-semibold"><Users className="size-3.5" /> {r.participants.length}</span>
                {r.mode === "visio" ? <StatusPill variant="violet" uppercase><Video className="size-3" /> Visio</StatusPill> : <StatusPill variant="info" uppercase>Présentiel</StatusPill>}
                {r.compteRendu && <StatusPill variant="success" uppercase>CR</StatusPill>}
              </button>
            ))}
          </div>
        )}
      </Card>

      {detail && <ReunionDetailDialog reunion={detail} onClose={() => setDetail(null)} />}
    </ScreenContainer>
  );
}

function NewReunionDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: users = [] } = useQuery({ queryKey: ["user-options"], queryFn: fetchUserOptions });
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [heure, setHeure] = useState("09:00");
  const [dureeMin, setDureeMin] = useState("60");
  const [lieu, setLieu] = useState("");
  const [mode, setMode] = useState("presentiel");
  const [ordre, setOrdre] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const mut = useMutation({
    mutationFn: () => {
      const input: NewReunionInput = {
        titre, dateHeure: new Date(`${date}T${heure}:00`).toISOString(),
        dureeMin: Number(dureeMin) || 60, lieu, mode, ordreDuJour: ordre, participantIds: [...sel],
      };
      return createReunion(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reunions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Réunion planifiée", `${sel.size} participant(s) notifié(s)`);
      setTitre(""); setLieu(""); setOrdre(""); setSel(new Set()); setDureeMin("60"); setMode("presentiel");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé." : "Échec de la planification."),
  });
  const valid = titre.trim().length > 0 && date !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Planifier une réunion</Button></DialogTrigger>
      <DialogContent className="max-w-[480px]">
        <DialogHeader><DialogTitle>Planifier une réunion</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mut.mutate(); }} className="flex max-h-[70vh] flex-col gap-3.5 overflow-y-auto">
          <div><label className={label}>Titre *</label><input className={field} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Réunion de direction mensuelle" autoFocus /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={label}>Date *</label><input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className={label}>Heure</label><input type="time" className={field} value={heure} onChange={(e) => setHeure(e.target.value)} /></div>
            <div><label className={label}>Durée (min)</label><input type="number" min={15} step={15} className={field} value={dureeMin} onChange={(e) => setDureeMin(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={label}>Lieu</label><input className={field} value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Salle, visio…" /></div>
            <div><label className={label}>Mode</label>
              <select className={field} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="presentiel">Présentiel</option>
                <option value="visio">Visio</option>
              </select>
            </div>
          </div>
          <div><label className={label}>Ordre du jour</label><textarea className={`${field} min-h-[70px] resize-y`} value={ordre} onChange={(e) => setOrdre(e.target.value)} placeholder="Points à aborder…" /></div>
          <div>
            <label className={label}>Participants ({sel.size})</label>
            <div className="border-border max-h-[180px] overflow-y-auto rounded-[10px] border">
              {users.length === 0 && <div className="text-muted p-3 text-[12px] font-semibold">Aucun utilisateur.</div>}
              {users.map((u: Opt) => (
                <label key={u.id} className="border-border hover:bg-hover flex cursor-pointer items-center gap-2.5 border-b px-3 py-2 text-[12.5px] font-semibold last:border-0">
                  <input type="checkbox" checked={sel.has(u.id)} onChange={() => toggle(u.id)} />
                  {u.label}
                </label>
              ))}
            </div>
            <p className="text-muted mt-1 text-[10.5px] font-medium">Seuls les participants cochés (et vous) verront et recevront cette réunion.</p>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mut.isPending}>{mut.isPending ? "Planification…" : "Planifier"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReunionDetailDialog({ reunion, onClose }: { reunion: Reunion; onClose: () => void }) {
  const qc = useQueryClient();
  const [cr, setCr] = useState(reunion.compteRendu ?? "");

  const save = useMutation({
    mutationFn: () => updateReunion(reunion.id, { compteRendu: cr }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reunions"] }); toast.success("Compte-rendu enregistré"); },
    onError: () => toast.error("Accès refusé (organisateur requis)."),
  });
  const remove = useMutation({
    mutationFn: () => deleteReunion(reunion.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reunions"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Réunion supprimée"); onClose(); },
    onError: () => toast.error("Accès refusé (organisateur requis)."),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader><DialogTitle>{reunion.titre}</DialogTitle></DialogHeader>
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <div className="text-muted flex items-center gap-2 text-[12.5px] font-semibold"><CalendarClock className="size-4" /> {formatDateFR(reunion.dateHeure, "EEEE d MMMM yyyy")} · {hhmm(reunion.dateHeure)} · {reunion.dureeMin} min</div>
          {reunion.lieu && <div className="text-muted flex items-center gap-2 text-[12.5px] font-semibold"><MapPin className="size-4" /> {reunion.lieu}</div>}
          <div className="text-muted flex items-center gap-2 text-[12.5px] font-semibold">{reunion.mode === "visio" ? <Video className="size-4" /> : <Users className="size-4" />} {reunion.mode === "visio" ? "Visio" : "Présentiel"} · organisée par {reunion.organisateur}</div>

          <div className="border-border bg-surface2 rounded-xl border p-3">
            <div className="text-muted mb-1.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">Participants ({reunion.participants.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {reunion.participants.map((p) => (
                <span key={p.id} className="bg-accent/12 text-accent rounded-full px-2.5 py-1 text-[11.5px] font-bold">{p.name}</span>
              ))}
            </div>
          </div>

          {reunion.ordreDuJour && (
            <div>
              <div className="text-muted mb-1 text-[10.5px] font-bold tracking-[0.4px] uppercase">Ordre du jour</div>
              <div className="text-foreground text-[12.5px] font-medium whitespace-pre-wrap">{reunion.ordreDuJour}</div>
            </div>
          )}

          <div>
            <div className="text-muted mb-1 text-[10.5px] font-bold tracking-[0.4px] uppercase">Compte-rendu</div>
            <textarea className={`${field} min-h-[90px] resize-y`} value={cr} onChange={(e) => setCr(e.target.value)} placeholder="Décisions, points clés, actions…" />
            <Button size="xs" variant="outline" className="mt-1.5" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "…" : "Enregistrer le compte-rendu"}</Button>
          </div>
        </div>
        <DialogFooter className="mt-1 items-center justify-between">
          <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}><Trash2 className="size-3.5" /> Supprimer</Button>
          <DialogClose asChild><Button type="button" variant="outline" size="sm">Fermer</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
