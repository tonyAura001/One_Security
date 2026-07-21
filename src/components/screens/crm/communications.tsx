"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Mail, MapPin, Phone, Plus, ReceiptText, ScrollText, StickyNote, UserPlus, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import { fetchClientOptions, type Opt } from "@/lib/supabase/data/options";
import {
  fetchClientTimeline, createInteraction, MANUAL_TYPES,
  type TimelineKind, type InteractionType, type NewInteractionInput,
} from "@/lib/supabase/data/interactions";

const field = "rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

const KIND: Record<TimelineKind, { icon: LucideIcon; label: string; tint: string; text: string }> = {
  appel: { icon: Phone, label: "Appel", tint: "bg-accent/12", text: "text-accent" },
  email: { icon: Mail, label: "E-mail", tint: "bg-violet/12", text: "text-violet" },
  reunion: { icon: Users, label: "Réunion", tint: "bg-warning/14", text: "text-warning" },
  visite: { icon: MapPin, label: "Visite", tint: "bg-success/12", text: "text-success" },
  note: { icon: StickyNote, label: "Note", tint: "bg-muted/15", text: "text-muted" },
  contrat: { icon: ScrollText, label: "Contrat", tint: "bg-accent/12", text: "text-accent" },
  facture: { icon: ReceiptText, label: "Facture", tint: "bg-warning/14", text: "text-warning" },
  devis: { icon: FileText, label: "Devis", tint: "bg-violet/12", text: "text-violet" },
  contact: { icon: UserPlus, label: "Contact", tint: "bg-success/12", text: "text-success" },
};
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function CommunicationsScreen() {
  const { data: items = [] } = useQuery({ queryKey: ["client-timeline"], queryFn: fetchClientTimeline });
  const { data: clients = [] } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });
  const [clientId, setClientId] = useState("");
  const [kind, setKind] = useState<"" | TimelineKind>("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) if (MANUAL_TYPES.includes(it.kind as InteractionType)) c[it.kind] = (c[it.kind] ?? 0) + 1;
    return c;
  }, [items]);
  const totalManual = MANUAL_TYPES.reduce((s, t) => s + (counts[t] ?? 0), 0);

  const rows = useMemo(
    () => items.filter((it) => (clientId ? it.clientId === clientId : true) && (kind ? it.kind === kind : true)),
    [items, clientId, kind],
  );

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted text-[12px] font-semibold">
          Journal des interactions — appels, e-mails, réunions, visites, et tout ce qui est rattaché au client.
        </div>
        <NewInteractionDialog clients={clients} />
      </div>

      {/* KPIs par type */}
      <div className="mb-4 grid grid-cols-3 gap-[12px] sm:grid-cols-6">
        {MANUAL_TYPES.map((t) => {
          const m = KIND[t];
          const Icon = m.icon;
          return (
            <Card key={t} className="p-3.5">
              <div className={cn("mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold", m.text)}><Icon className="size-3.5" /> {m.label}</div>
              <div className="text-foreground text-[20px] font-extrabold">{counts[t] ?? 0}</div>
            </Card>
          );
        })}
        <Card className="p-3.5">
          <div className="text-muted mb-1.5 text-[11px] font-bold">Total</div>
          <div className="text-foreground text-[20px] font-extrabold">{totalManual}</div>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="mb-[15px] flex flex-wrap items-center gap-2 p-3">
        <select className={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Tous les clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as TimelineKind | "")}>
          <option value="">Tous les types</option>
          {(Object.keys(KIND) as TimelineKind[]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}
        </select>
        <span className="text-muted ml-auto text-[12px] font-bold">{rows.length} interaction{rows.length !== 1 ? "s" : ""}</span>
      </Card>

      {/* Timeline */}
      <Card className="p-[18px_20px]">
        {rows.length === 0 ? (
          <EmptyState icon={Phone} title="Aucune interaction" description="Enregistrez une interaction, ou elle apparaîtra dès qu'un contrat/facture/devis/contact est lié au client." />
        ) : (
          <div className="flex flex-col">
            {rows.map((it, i) => {
              const m = KIND[it.kind];
              const Icon = m.icon;
              return (
                <div key={it.id} className={cn("flex items-start gap-3.5 py-3", i < rows.length - 1 && "border-border border-b")}>
                  <span className={cn("mt-0.5 flex size-9 flex-none items-center justify-center rounded-[11px]", m.tint, m.text)}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-[13px] font-bold">{it.title}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold", m.tint, m.text)}>{m.label}</span>
                      <span className="text-muted text-[11.5px] font-bold">· {it.clientName}</span>
                    </div>
                    <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{it.detail}</div>
                  </div>
                  <div className="text-muted flex-none text-right text-[11px] font-semibold">
                    {formatDateFR(it.date, "dd/MM/yy")}<div className="text-[10px]">{hhmm(it.date)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </ScreenContainer>
  );
}

function NewInteractionDialog({ clients }: { clients: Opt[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<InteractionType>("appel");
  const [dt, setDt] = useState(() => new Date().toISOString().slice(0, 16));
  const [resume, setResume] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () => {
      const input: NewInteractionInput = { clientId, type, dateHeure: new Date(dt).toISOString(), resume, notes };
      return createInteraction(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-timeline"] });
      toast.success("Interaction enregistrée");
      setClientId(""); setResume(""); setNotes(""); setType("appel");
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (commerce)." : "Échec de l'enregistrement."),
  });
  const valid = clientId !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Ajouter interaction</Button></DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader><DialogTitle>Nouvelle interaction</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) mut.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={`${label}`}>Client *</label>
            <select className={`${field} w-full`} value={clientId} onChange={(e) => setClientId(e.target.value)} autoFocus>
              <option value="">Sélectionner un client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type *</label>
              <select className={`${field} w-full`} value={type} onChange={(e) => setType(e.target.value as InteractionType)}>
                <option value="appel">Appel</option>
                <option value="email">E-mail</option>
                <option value="reunion">Réunion</option>
                <option value="visite">Visite</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className={label}>Date &amp; heure</label>
              <input type="datetime-local" className={`${field} w-full`} value={dt} onChange={(e) => setDt(e.target.value)} />
            </div>
          </div>
          <div><label className={label}>Résumé</label><input className={`${field} w-full`} value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Résumé de l'interaction…" /></div>
          <div><label className={label}>Notes</label><textarea className={`${field} min-h-[70px] w-full resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Détails, engagements, suite à donner…" /></div>
          <DialogFooter className="mt-1">
            <DialogClose asChild><Button type="button" variant="outline" size="sm">Annuler</Button></DialogClose>
            <Button type="submit" size="sm" disabled={!valid || mut.isPending}>{mut.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
