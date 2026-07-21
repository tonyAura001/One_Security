"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Play, RefreshCw, Save, Users } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { usePayrollCycle } from "@/lib/hooks/use-payroll-cycle";
import {
  fetchPayslips,
  generatePaie,
  updateBulletin,
  computeBulletin,
  fetchAgentsSalaire,
  updateAgentSalaire,
  bulkUpdateSalaire,
  type AgentSalaire,
  type BulletinComponents,
} from "@/lib/supabase/data/payroll";
import type { Payslip } from "@/lib/api/types";
import { currentPeriode } from "@/lib/supabase/data/cycle-paie";
import { formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CircuitStepper } from "./circuit-stepper";

type View = "bulletins" | "salaires" | "approbation";

const field =
  "w-full rounded-[9px] border border-border bg-surface2 px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground outline-none focus:border-accent/50";
const fcfa = (n: number) => `${formatNumberFR(n)} F CFA`;

export function PayrollPaie() {
  const pathname = usePathname();
  const [view, setView] = useState<View>(pathname.includes("approbation") ? "approbation" : "bulletins");

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">RH · Paie</div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Paie &amp; Bulletins de salaire</h1>
        </div>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "bulletins", label: "Bulletins" },
            { value: "salaires", label: "Salaires" },
            { value: "approbation", label: "Approbation" },
          ]}
        />
      </div>

      {view === "bulletins" && <BulletinsView />}
      {view === "salaires" && <SalairesView />}
      {view === "approbation" && <ApprobationView />}
    </ScreenContainer>
  );
}

// ── Bulletins : liste + panneau éditable ────────────────────────────────────

function BulletinsView() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState(currentPeriode());
  const { data: payslips = [] } = useQuery({ queryKey: ["payslips", periode], queryFn: () => fetchPayslips(periode) });
  const [selId, setSelId] = useState<string | null>(null);
  const selected = payslips.find((p) => p.id === selId) ?? payslips[0] ?? null;

  const totalBrut = payslips.reduce((s, p) => s + p.gross, 0);
  const totalNet = payslips.reduce((s, p) => s + p.net, 0);
  const totalPatronal = payslips.reduce((s, p) => s + (p.ipresPatronal ?? 0) + (p.cssPatronal ?? 0), 0);

  const generate = useMutation({
    mutationFn: () => generatePaie(periode),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["payslips", periode] });
      toast.success(r.created > 0 ? `${r.created} bulletin(s) généré(s)` : "Bulletins déjà à jour", `Période ${periode}`);
    },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (DG/RF/RH)." : "Échec de la génération."),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="text-muted flex items-center gap-2 text-[12px] font-bold">
          Période
          <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className={cn(field, "w-[150px]")} />
        </label>
        <Button size="sm" disabled={generate.isPending} onClick={() => generate.mutate()}>
          <Play className="size-4" /> {generate.isPending ? "Génération…" : "Générer les bulletins"}
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-[15px] lg:grid-cols-4">
        <Kpi label="Bulletins générés" value={String(payslips.length)} />
        <Kpi label="Masse salariale brute" value={fcfa(totalBrut)} />
        <Kpi label="Total net à payer" value={fcfa(totalNet)} tone="text-success" />
        <Kpi label="Charges patronales" value={fcfa(totalPatronal)} tone="text-warning" />
      </div>

      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[1fr_360px] lg:items-start">
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="bg-surface2 border-border border-b">
                {["Agent", "Brut", "Net", "Statut"].map((h, i) => (
                  <th key={h} className={cn("text-muted px-4 py-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase", i >= 1 && i <= 2 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 && (
                <tr><td colSpan={4} className="text-muted px-4 py-10 text-center text-[12.5px] font-semibold">Aucun bulletin pour {periode}. Cliquez « Générer les bulletins ».</td></tr>
              )}
              {payslips.map((p) => (
                <tr key={p.id} onClick={() => setSelId(p.id)}
                  className={cn("border-border hover:bg-hover cursor-pointer border-b last:border-0", selected?.id === p.id && "bg-accent/[0.06]")}>
                  <td className="text-foreground px-4 py-3 text-[12.5px] font-bold">{p.agent}<div className="text-muted text-[10.5px] font-semibold">{p.role}</div></td>
                  <td className="tnum text-foreground px-4 py-3 text-right text-[12.5px] font-semibold">{formatNumberFR(p.gross)}</td>
                  <td className="tnum text-foreground px-4 py-3 text-right text-[12.5px] font-extrabold">{formatNumberFR(p.net)}</td>
                  <td className="px-4 py-3"><StatusPill variant="warning" uppercase>En attente</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {selected ? <BulletinEditor key={selected.id} payslip={selected} periode={periode} /> : (
          <Card className="p-5"><div className="text-muted text-[12.5px] font-semibold">Sélectionnez un bulletin pour l&apos;éditer.</div></Card>
        )}
      </div>
    </>
  );
}

function BulletinEditor({ payslip, periode }: { payslip: Payslip; periode: string }) {
  const qc = useQueryClient();
  const [c, setC] = useState<BulletinComponents>({
    base: payslip.base ?? payslip.gross,
    heuresSup: payslip.heuresSup ?? 0,
    primeAnciennete: payslip.primeAnciennete ?? 0,
    autresPrimes: payslip.autresPrimes ?? 0,
  });
  useEffect(() => {
    setC({ base: payslip.base ?? payslip.gross, heuresSup: payslip.heuresSup ?? 0, primeAnciennete: payslip.primeAnciennete ?? 0, autresPrimes: payslip.autresPrimes ?? 0 });
  }, [payslip]);

  const live = useMemo(() => computeBulletin(c), [c]);
  const set = (k: keyof BulletinComponents, v: string) => setC((s) => ({ ...s, [k]: Number(v) || 0 }));

  const save = useMutation({
    mutationFn: () => updateBulletin(payslip.id, c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payslips", periode] }); toast.success("Bulletin enregistré", payslip.agent); },
    onError: (e: unknown) => toast.error(/row-level|refus/i.test(String(e)) ? "Accès refusé (DG/RF/RH)." : "Échec de l'enregistrement."),
  });

  return (
    <Card className="p-5">
      <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">Bulletin — {payslip.agent}</div>
      <div className="flex flex-col gap-2.5">
        <EditLine label="Salaire de base" value={c.base} onChange={(v) => set("base", v)} />
        <EditLine label="Heures supplémentaires" value={c.heuresSup} onChange={(v) => set("heuresSup", v)} plus />
        <EditLine label="Prime ancienneté" value={c.primeAnciennete} onChange={(v) => set("primeAnciennete", v)} plus />
        <EditLine label="Autres primes" value={c.autresPrimes} onChange={(v) => set("autresPrimes", v)} plus />
      </div>

      <Row bold label="Salaire brut" value={fcfa(live.brut)} className="border-border mt-3 border-t pt-3" />
      <div className="mt-2 flex flex-col gap-1.5">
        <Row label="IPRES salarié (5,6 %)" value={`−${formatNumberFR(live.ipres)} F CFA`} danger />
        <Row label="CSS salarié (3,6 %)" value={`−${formatNumberFR(live.css)} F CFA`} danger />
        <Row label="IR (barème)" value={`−${formatNumberFR(live.ir)} F CFA`} danger />
      </div>
      <Row bold label="NET À PAYER" value={fcfa(live.net)} className="border-border mt-3 border-t pt-3" big />

      <div className="border-border text-muted mt-3 border-t pt-3 text-[11px] font-semibold">
        <div className="mb-1 font-bold">Charges patronales :</div>
        <div className="flex justify-between"><span>IPRES patronal (8,4 %)</span><span className="tnum">{fcfa(live.ipresPatronal)}</span></div>
        <div className="flex justify-between"><span>CSS patronal (7 %)</span><span className="tnum">{fcfa(live.cssPatronal)}</span></div>
      </div>

      <Button className="mt-4 w-full" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        <Save className="size-4" /> {save.isPending ? "Enregistrement…" : "Enregistrer le bulletin"}
      </Button>
    </Card>
  );
}

function EditLine({ label, value, onChange, plus }: { label: string; value: number; onChange: (v: string) => void; plus?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted text-[12px] font-semibold">{label}</span>
      <div className="flex items-center gap-1">
        {plus && <span className="text-muted text-[12px] font-bold">+</span>}
        <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className={cn(field, "tnum w-[110px] text-right")} />
      </div>
    </div>
  );
}
function Row({ label, value, bold, danger, big, className }: { label: string; value: string; bold?: boolean; danger?: boolean; big?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className={cn("text-[12px]", bold ? "text-foreground font-extrabold" : "text-muted font-semibold", danger && "text-danger")}>{label}</span>
      <span className={cn("tnum", danger ? "text-danger font-bold" : "text-foreground", bold && "font-extrabold", big ? "text-[16px]" : "text-[12.5px]")}>{value}</span>
    </div>
  );
}

// ── Salaires : configuration individuelle + en lot ──────────────────────────

function SalairesView() {
  const qc = useQueryClient();
  const { data: agents = [] } = useQuery({ queryKey: ["agents-salaire"], queryFn: fetchAgentsSalaire });
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<"set" | "percent">("set");
  const [bulkVal, setBulkVal] = useState("");

  useEffect(() => { setEdits(Object.fromEntries(agents.map((a) => [a.id, a.salaire]))); }, [agents]);

  const val = (a: AgentSalaire) => edits[a.id] ?? a.salaire;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSel = agents.length > 0 && sel.size === agents.length;

  const saveOne = useMutation({
    mutationFn: (a: AgentSalaire) => updateAgentSalaire(a.id, val(a)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents-salaire"] }); toast.success("Salaire enregistré"); },
    onError: () => toast.error("Accès refusé (DG/RP/RH/Manager)."),
  });
  const bulk = useMutation({
    mutationFn: () => {
      const targets = agents.filter((a) => sel.has(a.id)).map((a) => ({ id: a.id, salaire: val(a) }));
      const value = Number(bulkVal) || 0;
      return bulkUpdateSalaire(targets, bulkMode === "set" ? { mode: "set", value } : { mode: "percent", value });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents-salaire"] }); toast.success(`${sel.size} salaire(s) mis à jour`); setSel(new Set()); setBulkVal(""); },
    onError: () => toast.error("Accès refusé (DG/RP/RH/Manager)."),
  });

  return (
    <>
      <Card className="mb-[15px] flex flex-wrap items-center gap-3 p-3.5">
        <span className="text-muted flex items-center gap-1.5 text-[12px] font-bold"><Users className="size-4" /> {sel.size} sélectionné(s)</span>
        <div className="border-border bg-surface2 flex items-center gap-0.5 rounded-[9px] border p-0.5">
          {(["set", "percent"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setBulkMode(m)}
              className={cn("rounded-[7px] px-2.5 py-1 text-[11.5px] font-bold transition-colors", bulkMode === m ? "bg-accent/16 text-accent" : "text-muted hover:text-foreground")}>
              {m === "set" ? "Salaire fixe" : "Ajustement %"}
            </button>
          ))}
        </div>
        <input inputMode="numeric" value={bulkVal} onChange={(e) => setBulkVal(e.target.value.replace(/[^\d.-]/g, ""))}
          placeholder={bulkMode === "set" ? "Ex. 100000" : "Ex. 5"} className={cn(field, "w-[130px]")} />
        <Button size="sm" disabled={sel.size === 0 || bulkVal === "" || bulk.isPending} onClick={() => bulk.mutate()}>
          <RefreshCw className="size-3.5" /> {bulk.isPending ? "Application…" : "Appliquer à la sélection"}
        </Button>
        <span className="text-muted ml-auto text-[11px] font-medium">
          {bulkMode === "set" ? "Fixe le salaire de base des agents cochés." : "Ajuste le salaire des agents cochés (+/− %)."}
        </span>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="bg-surface2 border-border border-b">
              <th className="px-3 py-2.5 text-left">
                <input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(agents.map((a) => a.id)))} aria-label="Tout sélectionner" />
              </th>
              {["Agent", "Poste", "Salaire de base", ""].map((h, i) => (
                <th key={h || i} className={cn("text-muted px-3 py-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase", i === 2 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-border border-b last:border-0">
                <td className="px-3 py-2"><input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Sélectionner ${a.name}`} /></td>
                <td className="text-foreground px-3 py-2 text-[12.5px] font-bold">{a.name}</td>
                <td className="text-muted px-3 py-2 text-[12px] font-semibold">{a.poste}</td>
                <td className="px-3 py-2 text-right">
                  <input type="number" min={0} value={val(a)} onChange={(e) => setEdits((s) => ({ ...s, [a.id]: Number(e.target.value) || 0 }))} className={cn(field, "tnum w-[130px] text-right")} />
                </td>
                <td className="px-2 py-2 text-center">
                  <Button size="icon-sm" variant="ghost" aria-label="Enregistrer" disabled={saveOne.isPending} onClick={() => saveOne.mutate(a)}>
                    <Save className={cn("size-4", val(a) !== a.salaire ? "text-accent" : "text-muted")} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── Approbation : masse salariale + circuit ─────────────────────────────────

function ApprobationView() {
  const { stage, advance, isPending } = usePayrollCycle();
  const periode = currentPeriode();
  const { data: payslips = [] } = useQuery({ queryKey: ["payslips", periode], queryFn: () => fetchPayslips(periode) });
  const totalBrut = payslips.reduce((s, p) => s + p.gross, 0);
  const approved = stage === "approuve";
  const canApprove = stage === "valide";

  return (
    <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[1fr_320px] lg:items-start">
      <Card className="p-5">
        <div className="text-muted text-[11.5px] font-semibold">Masse salariale brute · {periode}</div>
        <div className="text-foreground mt-1 text-[24px] font-extrabold tracking-[-0.5px]">{fcfa(totalBrut)}</div>
        <div className="text-muted mt-1 text-[11.5px] font-semibold">{payslips.length} agents · {approved ? "validée par le DG" : "en attente de validation"}</div>
        {approved ? (
          <div className="bg-success/12 text-success mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold"><CheckCircle2 className="size-4" /> Validé</div>
        ) : (
          <>
            <Button className="mt-4 w-full" disabled={!canApprove || isPending} onClick={() => advance.mutate()}>Valider la masse salariale</Button>
            {!canApprove && <div className="text-muted mt-2 text-center text-[11px] font-semibold">En attente des niveaux 1 et 2 du circuit.</div>}
          </>
        )}
      </Card>
      <Card className="p-5">
        <div className="text-muted mb-3 text-[10.5px] font-bold tracking-[0.6px] uppercase">Circuit d&apos;approbation</div>
        <CircuitStepper />
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-muted text-[11px] font-semibold">{label}</div>
      <div className={cn("mt-1 text-[18px] font-extrabold tracking-[-0.3px]", tone ?? "text-foreground")}>{value}</div>
    </Card>
  );
}
