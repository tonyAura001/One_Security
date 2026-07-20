"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileDown, Send } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchProspectOptions } from "@/lib/supabase/data/options";
import { createQuote } from "@/lib/supabase/data/quotes";
import { useCompanyIdentity } from "@/lib/documents/use-identity";
import { formatFCFA } from "@/lib/format";
import { toast } from "@/lib/toast";

const TVA_RATE = 0.18;
const PRESTATION = "Gardiennage 24h/24 — 6 agents + 1 superviseur";

/** Reusable read-only field cell matching the mockup's boxed inputs. */
function FieldBox({
  label,
  children,
  bold = false,
}: {
  label: string;
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-muted mb-1.5 text-[11px] font-bold">{label}</div>
      <div
        className={`border-border bg-surface2 text-foreground rounded-[10px] border px-[13px] py-[11px] text-[12.5px] ${
          bold ? "font-bold" : "font-semibold"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function SecretaireDevis() {
  const qc = useQueryClient();
  const os = useCompanyIdentity();
  const { data: prospects = [] } = useQuery({
    queryKey: ["prospect-options"],
    queryFn: fetchProspectOptions,
  });
  const [prospectId, setProspectId] = useState<string>("");
  const [monthlyTariff, setMonthlyTariff] = useState<number>(2_650_000);
  const [months, setMonths] = useState<number>(12);

  const clientName =
    prospects.find((p) => p.id === prospectId)?.label ?? "Prospect à sélectionner";

  const { subtotal, tva, total } = useMemo(() => {
    const sub = monthlyTariff * months;
    const t = Math.round(sub * TVA_RATE);
    return { subtotal: sub, tva: t, total: sub + t };
  }, [monthlyTariff, months]);

  const save = useMutation({
    mutationFn: () =>
      createQuote({
        prospectId: prospectId || null,
        totalHT: subtotal,
        tauxTVA: 18,
        statut: "ENVOYE",
        dateEnvoi: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis enregistré et envoyé");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé (DG/RP/Manager)." : `Échec : ${msg}`);
    },
  });

  const noSuffix = { suffix: false } as const;

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* ---------- Left: quote form ---------- */}
        <Card className="rounded-2xl p-5">
          <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
            Nouveau devis
          </div>

          <div className="flex flex-col gap-3.5">
            {/* Client selector */}
            <div>
              <div className="text-muted mb-1.5 text-[11px] font-bold">
                CLIENT
              </div>
              <div className="relative">
                <select
                  aria-label="Client du devis"
                  value={prospectId}
                  onChange={(e) => setProspectId(e.target.value)}
                  className="border-border bg-surface2 text-foreground focus-visible:border-accent w-full appearance-none rounded-[10px] border px-[13px] py-[11px] pr-9 text-[12.5px] font-bold outline-none"
                >
                  <option value="">— Sélectionner un prospect —</option>
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="text-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
                  strokeWidth={1.8}
                />
              </div>
            </div>

            <FieldBox label="PRESTATION">{PRESTATION}</FieldBox>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-muted mb-1.5 text-[11px] font-bold">
                  DURÉE
                </div>
                <div className="border-border bg-surface2 flex items-center gap-2 rounded-[10px] border px-[13px] py-[11px]">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    aria-label="Durée en mois"
                    value={months}
                    onChange={(e) =>
                      setMonths(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="text-foreground w-10 bg-transparent text-[12.5px] font-semibold outline-none"
                  />
                  <span className="text-muted text-[12.5px] font-semibold">
                    mois
                  </span>
                </div>
              </div>
              <div>
                <div className="text-muted mb-1.5 text-[11px] font-bold">
                  TARIF MENSUEL
                </div>
                <div className="border-border bg-surface2 flex items-center gap-1 rounded-[10px] border px-[13px] py-[11px]">
                  <input
                    type="number"
                    min={0}
                    step={50_000}
                    aria-label="Tarif mensuel en FCFA"
                    value={monthlyTariff}
                    onChange={(e) =>
                      setMonthlyTariff(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="text-foreground w-full bg-transparent text-[12.5px] font-bold outline-none"
                  />
                  <span className="text-muted text-[12.5px] font-semibold">
                    FCFA
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldBox label="TVA">18 %</FieldBox>
              <FieldBox label="VALIDITÉ">30 jours</FieldBox>
            </div>

            <div className="mt-1.5 flex gap-2.5">
              <Button
                className="h-11 flex-1 rounded-[11px] text-[13px] font-extrabold"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                <Send strokeWidth={1.8} />
                {save.isPending ? "Enregistrement…" : "Enregistrer & envoyer"}
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-[11px] px-[18px] text-[13px] font-bold"
                onClick={() => window.print()}
              >
                <FileDown strokeWidth={1.8} />
                Aperçu PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* ---------- Right: A4 printable preview (paper — theme-independent) ---------- */}
        <div className="border-border rounded-xl border bg-white px-8 py-[30px] text-[#0F1626] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <div className="mb-4 flex items-start justify-between border-b-2 border-[#0F1626] pb-3.5">
            <div>
              <div className="text-base font-extrabold text-[#0F1626]">
                {os.name}
              </div>
              <div className="mt-[3px] text-[10px] font-semibold text-[#5B6577]">
                {os.adresse} · NINEA {os.ninea}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-[#2D6BFF]">DEVIS</div>
              <div className="text-[10px] font-semibold text-[#5B6577]">
                Proforma
              </div>
            </div>
          </div>

          <div className="mb-[3px] text-[10.5px] font-semibold text-[#5B6577]">
            Destinataire
          </div>
          <div className="mb-4 text-[12.5px] font-bold text-[#0F1626]">
            {clientName}
          </div>

          <div className="flex border-b border-[#E4E8EF] pb-[7px] text-[9px] font-bold tracking-[0.4px] text-[#5B6577]">
            <div className="flex-1">DÉSIGNATION</div>
            <div className="w-[60px] text-center">QTÉ</div>
            <div className="w-[90px] text-right">MONTANT</div>
          </div>
          <div className="flex border-b border-[#E4E8EF] py-2.5 text-[11px] font-semibold text-[#0F1626]">
            <div className="flex-1">Gardiennage 24h/24 (mensuel)</div>
            <div className="w-[60px] text-center">{months}</div>
            <div className="w-[90px] text-right font-extrabold">
              {formatFCFA(subtotal, noSuffix)}
            </div>
          </div>

          <div className="flex justify-between py-2 text-[11px] font-semibold text-[#5B6577]">
            <span>Sous-total HT</span>
            <span>{formatFCFA(subtotal, noSuffix)}</span>
          </div>
          <div className="flex justify-between pb-2 text-[11px] font-semibold text-[#5B6577]">
            <span>TVA 18 %</span>
            <span>{formatFCFA(tva, noSuffix)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#0F1626] pt-2.5 text-sm font-extrabold text-[#0F1626]">
            <span>Total TTC</span>
            <span>{formatFCFA(total)}</span>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
