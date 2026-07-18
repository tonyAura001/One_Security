"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { RoleAvatar } from "@/components/shell/avatar";
import { usePayrollStore } from "@/lib/store/payroll";
import { formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";

type View = "bulletins" | "approbation";

const BULLETINS = [
  {
    initials: "AS",
    name: "Abdou Sarr",
    post: "Agent · Port Autonome",
    brut: 165000,
    net: 142800,
    paid: true,
  },
  {
    initials: "FN",
    name: "Fatou Ndiaye",
    post: "Cheffe de poste · Ambassade France",
    brut: 210000,
    net: 181500,
    paid: true,
  },
  {
    initials: "MB",
    name: "Moussa Ba",
    post: "Agent cynophile · BICIS Plateau",
    brut: 185000,
    net: 160000,
    paid: false,
  },
  {
    initials: "AD",
    name: "Awa Diop",
    post: "Agent · Sonatel Siège",
    brut: 160000,
    net: 138400,
    paid: true,
  },
  {
    initials: "CF",
    name: "Cheikh Fall",
    post: "Agent nuit · Port Autonome",
    brut: 172000,
    net: 148700,
    paid: true,
  },
  {
    initials: "MS",
    name: "Mariama Sow",
    post: "Superviseure · Eiffage Sénégal",
    brut: 225000,
    net: 194600,
    paid: false,
  },
  {
    initials: "IG",
    name: "Ibrahima Guèye",
    post: "Agent · Ambassade USA",
    brut: 168000,
    net: 145200,
    paid: true,
  },
];

const MASSE = [
  { poste: "Salaires de base", detail: "52 agents", montant: 6180000 },
  { poste: "Primes de risque", detail: "Sites sensibles", montant: 1240000 },
  { poste: "Heures supplémentaires", detail: "214 h", montant: 520000 },
  {
    poste: "Indemnités transport & repas",
    detail: "52 agents",
    montant: 410000,
  },
  {
    poste: "Cotisations sociales",
    detail: "IPRES / CSS · employeur",
    montant: 570000,
  },
];

export function PayrollPaie() {
  const pathname = usePathname();
  const [view, setView] = useState<View>(
    pathname.includes("approbation") ? "approbation" : "bulletins",
  );
  const stage = usePayrollStore((s) => s.stage);
  const approve = usePayrollStore((s) => s.approve);
  const approved = stage === "approuve";
  const canApprove = stage === "valide";

  return (
    <ScreenContainer>
      <div className="mb-4">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "bulletins", label: "Bulletins de paie" },
            { value: "approbation", label: "Approbation masse salariale" },
          ]}
        />
      </div>

      {view === "bulletins" ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi
              label="Net à payer · Juin 2026"
              value="7 682 000 FCFA"
              tone="text-success"
            />
            <Kpi label="Bulletins générés" value="52 / 52 agents" />
            <Kpi
              label="Restant à payer"
              value="3 bulletins en attente"
              tone="text-warning"
            />
          </div>

          {approved && (
            <Card className="border-success/40 bg-success/8 mb-4 flex items-start gap-3 p-4">
              <CheckCircle2 className="text-success mt-0.5 size-5 flex-none" />
              <div>
                <div className="text-foreground text-[13px] font-bold">
                  Masse salariale validée
                </div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                  Approuvée le 3 juillet 2026 par M. Diallo — transmise à la
                  comptabilité pour paiement.
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
                Bulletins de paie — Juin 2026
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  toast.success("Bulletins générés", "52 bulletins PDF")
                }
              >
                <Plus className="size-3.5" />
                Générer les bulletins
              </Button>
            </div>
            <div className="border-border overflow-x-auto border-t">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-border border-b">
                    {["Agent", "Poste · Site", "Brut", "Net", "Statut"].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`text-muted px-4 py-3 text-[11px] font-bold tracking-[0.4px] uppercase ${i === 2 || i === 3 ? "text-right" : ""}`}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BULLETINS.map((b) => (
                    <tr
                      key={b.name}
                      className="border-border hover:bg-hover border-b last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-active text-accent flex size-8 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold">
                            {b.initials}
                          </span>
                          <span className="text-foreground text-[13px] font-bold">
                            {b.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-muted px-4 py-3 text-[12px] font-semibold">
                        {b.post}
                      </td>
                      <td className="tnum text-foreground px-4 py-3 text-right text-[13px] font-semibold">
                        {formatNumberFR(b.brut)}
                      </td>
                      <td className="tnum text-foreground px-4 py-3 text-right text-[13px] font-extrabold">
                        {formatNumberFR(b.net)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          variant={b.paid ? "success" : "warning"}
                          uppercase
                        >
                          {b.paid ? "Payé" : "En attente"}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <div className="px-4 py-3.5">
              <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
                Détail de la masse salariale
              </div>
              <div className="text-muted mt-0.5 text-[12px] font-semibold">
                Période · Juin 2026 — préparé par Awa N. (Comptabilité) · 52
                agents · 14 sites
              </div>
            </div>
            <div className="border-border overflow-x-auto border-t">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-border border-b">
                    {["Poste", "Détail", "Montant"].map((h, i) => (
                      <th
                        key={h}
                        className={`text-muted px-4 py-3 text-[11px] font-bold tracking-[0.4px] uppercase ${i === 2 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MASSE.map((m) => (
                    <tr key={m.poste} className="border-border border-b">
                      <td className="text-foreground px-4 py-3 text-[13px] font-bold">
                        {m.poste}
                      </td>
                      <td className="text-muted px-4 py-3 text-[12px] font-semibold">
                        {m.detail}
                      </td>
                      <td className="tnum text-foreground px-4 py-3 text-right text-[13px] font-semibold">
                        {formatNumberFR(m.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface2">
                    <td
                      className="text-foreground px-4 py-3 text-[13px] font-extrabold"
                      colSpan={2}
                    >
                      Total masse salariale brute
                    </td>
                    <td className="tnum text-foreground px-4 py-3 text-right text-[15px] font-extrabold">
                      8 920 000 FCFA
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="text-muted px-4 py-3 text-[11.5px] font-semibold">
              Comparé à mai 2026 : <span className="text-success">+3,1 %</span>{" "}
              (+270 000 FCFA)
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <div className="text-muted text-[11.5px] font-semibold">
                Total à valider
              </div>
              <div className="text-foreground mt-1 text-[24px] font-extrabold tracking-[-0.5px]">
                8 920 000 FCFA
              </div>
              <div className="text-muted mt-1 text-[11.5px] font-semibold">
                {approved
                  ? "Validée par le Directeur Général"
                  : "En attente de validation DG"}
              </div>

              {approved ? (
                <div className="bg-success/12 text-success mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold">
                  <CheckCircle2 className="size-4" /> Validé
                </div>
              ) : (
                <>
                  <Button
                    className="mt-4 w-full"
                    disabled={!canApprove}
                    onClick={() => {
                      approve();
                      toast.success(
                        "Masse salariale validée",
                        "Transmise à la comptabilité pour paiement",
                      );
                    }}
                  >
                    Valider la masse salariale
                  </Button>
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => toast.info("Renvoyée pour correction")}
                  >
                    Renvoyer pour correction
                  </Button>
                  {!canApprove && (
                    <div className="text-muted mt-2 text-center text-[11px] font-semibold">
                      En attente des niveaux 1 et 2 du circuit.
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card className="p-5">
              <div className="text-muted mb-3 text-[10.5px] font-bold tracking-[0.6px]">
                CIRCUIT D&apos;APPROBATION
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <RoleAvatar
                    initials="AN"
                    gradient={["#10B981", "#2D6BFF"]}
                    size={36}
                  />
                  <div>
                    <div className="text-foreground text-[13px] font-bold">
                      Awa N.
                    </div>
                    <div className="text-muted text-[11px] font-semibold">
                      Comptabilité · préparé
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleAvatar
                    initials="MD"
                    gradient={["#8B5CF6", "#2D6BFF"]}
                    size={36}
                  />
                  <div>
                    <div className="text-foreground text-[13px] font-bold">
                      M. Diallo
                    </div>
                    <div className="text-muted text-[11px] font-semibold">
                      Directeur Général · approbation finale
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </ScreenContainer>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-muted text-[11.5px] font-semibold">{label}</div>
      <div
        className={`mt-1 text-[19px] font-extrabold ${tone ?? "text-foreground"}`}
      >
        {value}
      </div>
    </Card>
  );
}
