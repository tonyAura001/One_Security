"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet, FileText, Globe, Lock, Plus, ShoppingCart, Trash2, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Tone } from "@/lib/colors";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatDateFR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { useSession } from "@/lib/store/session";
import { fetchUserOptions, type Opt } from "@/lib/supabase/data/options";
import { fetchInvoices } from "@/lib/supabase/data/invoices";
import { fetchMembers } from "@/lib/supabase/data/members";
import { fetchReceipts } from "@/lib/supabase/data/caisse";
import {
  fetchRapports, createRapport, updateRapport, deleteRapport,
  type Rapport, type RapportVisibilite, type RapportInput,
} from "@/lib/supabase/data/rapports-fgac";

const field = "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

const CATEGORIES: { v: string; l: string }[] = [
  { v: "general", l: "Général" },
  { v: "securite", l: "Sécurité" },
  { v: "incident", l: "Incident" },
  { v: "operationnel", l: "Opérationnel" },
  { v: "financier", l: "Financier" },
  { v: "rh", l: "RH" },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.v === v)?.l ?? v;

const VIS: Record<RapportVisibilite, { icon: LucideIcon; label: string; hint: string; variant: PillVariant }> = {
  prive: { icon: Lock, label: "Privé", hint: "Vous seul — et le Directeur Général.", variant: "neutral" },
  choisis: { icon: Users, label: "Personnes choisies", hint: "Les personnes cochées — et le Directeur Général.", variant: "info" },
  tous: { icon: Globe, label: "Tout le monde", hint: "Tout le personnel de la plateforme.", variant: "success" },
};

// ── Écran ────────────────────────────────────────────────────────────────

export function SharedRapports() {
  const { data: rapports = [] } = useQuery({ queryKey: ["rapports"], queryFn: fetchRapports });
  const [detail, setDetail] = useState<Rapport | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <ScreenContainer>
      {/* ── Rapports d'équipe (rédigés + contrôle d'accès) ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">Rapports d&apos;équipe</h2>
          <div className="text-muted mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold">
            <Lock className="size-3" /> Chacun rédige son rapport et choisit qui peut le voir. Le DG voit tout.
          </div>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> Nouveau rapport</Button>
      </div>

      <Card className="mb-6 p-[18px_20px]">
        {rapports.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun rapport" description="Rédigez un rapport — vous choisissez qui pourra le consulter." />
        ) : (
          <div className="flex flex-col">
            {rapports.map((r, i) => {
              const v = VIS[r.visibilite];
              return (
                <button key={r.id} type="button" onClick={() => setDetail(r)}
                  className={cn("hover:bg-hover flex flex-wrap items-center gap-3.5 rounded-lg px-2 py-3 text-left transition-colors", i < rapports.length - 1 && "border-border border-b")}>
                  <IconTile icon={FileText} tone="accent" size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-[13px] font-bold">{r.titre}</div>
                    <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">
                      {catLabel(r.categorie)} · par {r.auteur} · {formatDateFR(r.createdAt, "dd/MM/yy")}
                    </div>
                  </div>
                  {r.mine && <StatusPill variant="violet" uppercase>Le mien</StatusPill>}
                  <StatusPill variant={v.variant} uppercase>{v.label}{r.visibilite === "choisis" ? ` · ${r.lecteurs.length}` : ""}</StatusPill>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Centre d'export (données réelles) ── */}
      <h2 className="text-foreground mb-3 text-[16px] font-extrabold tracking-[-0.3px]">Exports (données réelles)</h2>
      <ExportCenter />

      {creating && <RapportFormDialog rapport={null} editable onClose={() => setCreating(false)} />}
      {detail && <RapportFormDialog rapport={detail} editable={detail.mine} onClose={() => setDetail(null)} />}
    </ScreenContainer>
  );
}

// ── Dialog rapport (créer / consulter / éditer) ──────────────────────────

function RapportFormDialog({ rapport, editable: editableProp, onClose }: { rapport: Rapport | null; editable: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { role } = useSession();
  const editable = editableProp || role === "dg" || rapport === null;
  const { data: users = [] } = useQuery({ queryKey: ["user-options"], queryFn: fetchUserOptions });

  const [titre, setTitre] = useState(rapport?.titre ?? "");
  const [categorie, setCategorie] = useState(rapport?.categorie ?? "general");
  const [visibilite, setVisibilite] = useState<RapportVisibilite>(rapport?.visibilite ?? "prive");
  const [corps, setCorps] = useState(rapport?.corps ?? "");
  const [sel, setSel] = useState<Set<string>>(new Set(rapport?.lecteurs ?? []));
  useEffect(() => { if (rapport) setSel(new Set(rapport.lecteurs)); }, [rapport]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const input = (): RapportInput => ({ titre, corps, categorie, visibilite, lecteurIds: [...sel] });

  const save = useMutation({
    mutationFn: () => (rapport ? updateRapport(rapport.id, input()) : createRapport(input())),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rapports"] }); toast.success(rapport ? "Rapport modifié" : "Rapport créé"); onClose(); },
    onError: () => toast.error("Accès refusé."),
  });
  const remove = useMutation({
    mutationFn: () => deleteRapport(rapport!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rapports"] }); toast.success("Rapport supprimé"); onClose(); },
    onError: () => toast.error("Suppression refusée."),
  });

  const valid = titre.trim().length > 0;
  const V = VIS[visibilite];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader><DialogTitle>{rapport ? (editable ? "Modifier le rapport" : rapport.titre) : "Nouveau rapport"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (editable && valid) save.mutate(); }} className="flex max-h-[70vh] flex-col gap-3.5 overflow-y-auto">
          <div>
            <label className={label}>Titre *</label>
            <input className={field} value={titre} onChange={(e) => setTitre(e.target.value)} disabled={!editable} placeholder="Ex : Rapport d'incident — poste nord" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Catégorie</label>
              <select className={field} value={categorie} onChange={(e) => setCategorie(e.target.value)} disabled={!editable}>
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Auteur</label>
              <input className={field} value={rapport?.auteur ?? "Vous"} disabled />
            </div>
          </div>
          <div>
            <label className={label}>Contenu</label>
            <textarea className={`${field} min-h-[140px] resize-y`} value={corps} onChange={(e) => setCorps(e.target.value)} disabled={!editable} placeholder="Rédigez votre rapport…" />
          </div>

          {/* Visibilité */}
          <div>
            <label className={label}>Qui peut voir ce rapport ?</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(VIS) as RapportVisibilite[]).map((k) => {
                const m = VIS[k]; const Icon = m.icon; const active = visibilite === k;
                return (
                  <button key={k} type="button" disabled={!editable} onClick={() => setVisibilite(k)}
                    className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors disabled:opacity-70", active ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface2 text-muted hover:bg-hover")}>
                    <Icon className="size-4" />
                    <span className="text-[11px] font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-muted mt-1.5 text-[10.5px] font-medium">{V.hint}</p>
          </div>

          {visibilite === "choisis" && (
            <div>
              <label className={label}>Personnes autorisées ({sel.size})</label>
              <div className="border-border max-h-[160px] overflow-y-auto rounded-[10px] border">
                {users.map((u: Opt) => (
                  <label key={u.id} className={cn("border-border flex items-center gap-2.5 border-b px-3 py-2 text-[12.5px] font-semibold last:border-0", editable ? "hover:bg-hover cursor-pointer" : "opacity-70")}>
                    <input type="checkbox" checked={sel.has(u.id)} disabled={!editable} onChange={() => toggle(u.id)} />
                    {u.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="mt-1 items-center justify-between">
            {rapport && editable ? (
              <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}><Trash2 className="size-3.5" /> Supprimer</Button>
            ) : <span />}
            <div className="flex gap-2">
              <DialogClose asChild><Button type="button" variant="outline" size="sm">Fermer</Button></DialogClose>
              {editable && <Button type="submit" size="sm" disabled={!valid || save.isPending}>{save.isPending ? "Enregistrement…" : rapport ? "Enregistrer" : "Créer le rapport"}</Button>}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Centre d'export (inchangé) ───────────────────────────────────────────

type Row = (string | number)[];
const EXPORTS: { key: string; title: string; description: string; icon: LucideIcon; tone: Tone; file: string; load: () => Promise<Row[]> }[] = [
  { key: "financier", title: "Rapport financier — factures", description: "Toutes les factures (montants, statuts, échéances)", icon: FileText, tone: "danger", file: "rapport-factures",
    load: async () => { const f = await fetchInvoices(); return [["Référence", "Client", "Montant", "Statut", "Échéance"], ...f.map((x) => [x.ref, x.client, x.amount, x.status, x.due])]; } },
  { key: "recouvrement", title: "État de recouvrement", description: "Factures en retard à relancer", icon: FileSpreadsheet, tone: "warning", file: "recouvrement",
    load: async () => { const f = (await fetchInvoices()).filter((x) => x.status === "retard"); return [["Référence", "Client", "Montant", "Échéance"], ...f.map((x) => [x.ref, x.client, x.amount, x.due])]; } },
  { key: "rh", title: "Rapport RH & effectifs", description: "Membres, rôles et statuts", icon: Users, tone: "accent", file: "rapport-rh",
    load: async () => { const m = await fetchMembers(); return [["Nom", "E-mail", "Téléphone", "Rôle", "Statut"], ...m.map((x) => [x.name, x.email, x.phone, x.roleLabel, x.statut])]; } },
  { key: "caisse", title: "Rapport de caisse (boutique)", description: "Reçus de ventes", icon: ShoppingCart, tone: "success", file: "rapport-caisse",
    load: async () => { const r = await fetchReceipts(); return [["Référence", "Heure", "Articles", "Total", "Moyen"], ...r.map((x) => [x.ref, x.time, x.items, x.total, x.method])]; } },
];

function ExportCenter() {
  const gen = useMutation({
    mutationFn: async (r: (typeof EXPORTS)[number]) => { const rows = await r.load(); downloadCsv(r.file, rows); return r.title; },
    onSuccess: (t) => toast.success(`« ${t} » exporté`),
    onError: () => toast.error("Export refusé (accès requis pour ce rapport)."),
  });
  return (
    <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2">
      {EXPORTS.map((r) => (
        <Card key={r.key} className="flex items-center gap-3.5 p-[16px_18px]">
          <IconTile icon={r.icon} tone={r.tone} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-foreground text-[13.5px] font-bold">{r.title}</div>
            <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{r.description}</div>
          </div>
          <Button size="sm" variant="outline" disabled={gen.isPending} onClick={() => gen.mutate(r)}><FileSpreadsheet className="size-4" /> Exporter</Button>
        </Card>
      ))}
    </div>
  );
}
