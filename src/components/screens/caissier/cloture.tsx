"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/lib/colors";
import { formatDateFR, formatFCFA, formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { fetchClotureJour, enregistrerCloture } from "@/lib/supabase/data/cloture";

const METHOD_TONE: Record<string, Tone> = {
  Espèces: "success",
  Wave: "accent",
  "Orange Money": "warning",
  Carte: "violet",
};

export function CaissierCloture() {
  const qc = useQueryClient();
  const { data: jour } = useQuery({ queryKey: ["cloture-jour"], queryFn: fetchClotureJour });
  const [fond, setFond] = useState("50000");
  const [compte, setCompte] = useState("");
  const [closed, setClosed] = useState(false);

  const total = jour?.total ?? 0;
  const especes = jour?.especes ?? 0;
  const byMethod = jour?.byMoyen ?? [];
  const fondNum = Number(fond.replace(/\s/g, "")) || 0;
  const compteNum = Number(compte.replace(/\s/g, "")) || 0;
  const expectedCash = fondNum + especes;
  const ecart = compteNum - expectedCash;

  const close = useMutation({
    mutationFn: () =>
      enregistrerCloture({
        fondCaisse: fondNum,
        ventesEspeces: especes,
        compteEspeces: compteNum,
        totalVentes: total,
        nbTransactions: jour?.count ?? 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloture-jour"] });
      setClosed(true);
      toast.success("Caisse clôturée · rapport enregistré");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé (DG/RF/Comptable)." : `Échec : ${msg}`);
    },
  });

  return (
    <ScreenContainer>
      <Card className="mx-auto max-w-[760px] p-[22px]">
        <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">
          Clôture journalière — {formatDateFR(new Date().toISOString().slice(0, 10))}
        </div>
        <div className="text-muted mt-1 mb-[18px] text-[12px] font-semibold">
          {jour?.count ?? 0} transaction{(jour?.count ?? 0) !== 1 ? "s" : ""} aujourd&apos;hui
        </div>

        <div className="border-border bg-surface2 mb-4 rounded-xl border p-4">
          <div className="text-muted text-[11px] font-semibold">Total des ventes</div>
          <div className="text-foreground mt-1.5 text-[26px] font-extrabold tracking-[-0.6px]">
            {formatNumberFR(total)} <span className="text-muted text-[12px] font-bold">FCFA</span>
          </div>
        </div>

        <div className="text-muted mb-2.5 text-[11px] font-bold tracking-[0.4px] uppercase">
          Répartition par mode
        </div>
        {byMethod.length === 0 ? (
          <div className="text-muted mb-[18px] text-[12.5px] font-semibold">Aucune vente aujourd&apos;hui.</div>
        ) : (
          <div className="mb-[18px] flex flex-col gap-3">
            {byMethod.map((m) => (
              <div key={m.moyen} className="flex items-center gap-2.5">
                <span className="text-foreground w-[92px] text-[12px] font-bold">{m.moyen}</span>
                <div className="flex-1">
                  <ProgressBar value={total > 0 ? (m.montant / total) * 100 : 0} tone={METHOD_TONE[m.moyen] ?? "accent"} height={8} />
                </div>
                <span className="text-foreground w-[90px] text-right text-[12px] font-extrabold">
                  {formatNumberFR(m.montant)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="border-border bg-surface2 rounded-[11px] border p-[12px_14px]">
            <div className="text-muted text-[10.5px] font-semibold">Fond de caisse</div>
            <input
              inputMode="numeric"
              value={fond}
              disabled={closed}
              onChange={(e) => setFond(e.target.value.replace(/[^\d]/g, ""))}
              className="text-foreground mt-1 w-full bg-transparent text-[15px] font-extrabold outline-none"
            />
          </div>
          <div className="border-border bg-surface2 rounded-[11px] border p-[12px_14px]">
            <div className="text-muted text-[10.5px] font-semibold">Comptage espèces</div>
            <input
              inputMode="numeric"
              value={compte}
              disabled={closed}
              placeholder={String(expectedCash)}
              onChange={(e) => setCompte(e.target.value.replace(/[^\d]/g, ""))}
              className="text-foreground mt-1 w-full bg-transparent text-[15px] font-extrabold outline-none"
            />
          </div>
          <div className="border-warning/30 bg-warning/10 rounded-[11px] border p-[12px_14px]">
            <div className="text-muted text-[10.5px] font-semibold">
              Écart (attendu {formatNumberFR(expectedCash)})
            </div>
            <div className="text-warning mt-1 text-[15px] font-extrabold">
              {ecart > 0 ? "+" : ecart < 0 ? "−" : ""}
              {formatNumberFR(Math.abs(ecart))}
            </div>
          </div>
        </div>

        {closed ? (
          <div className="border-success/35 bg-success/12 flex items-center gap-3 rounded-xl border px-4 py-3.5">
            <CheckCircle2 className="text-success size-5 flex-none" strokeWidth={2.2} />
            <div>
              <div className="text-foreground text-[13px] font-extrabold">Caisse clôturée</div>
              <div className="text-muted text-[11.5px] font-semibold">
                Rapport de caisse enregistré · écart {ecart > 0 ? "+" : ecart < 0 ? "−" : ""}
                {formatFCFA(Math.abs(ecart))} consigné
              </div>
            </div>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            disabled={compte === "" || close.isPending}
            onClick={() => close.mutate()}
          >
            <Lock strokeWidth={2} />
            {close.isPending ? "Clôture…" : "Clôturer la caisse & générer le rapport"}
          </Button>
        )}
      </Card>
    </ScreenContainer>
  );
}
