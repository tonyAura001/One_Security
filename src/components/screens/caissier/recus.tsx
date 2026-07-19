"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { RECEIPTS } from "@/lib/api/data";
import { fetchReceipts } from "@/lib/supabase/data/caisse";
import type { Receipt } from "@/lib/api/types";
import { formatFCFA, formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const METHOD_VARIANT: Record<Receipt["method"], PillVariant> = {
  Espèces: "success",
  Wave: "info",
  "Orange Money": "warning",
};

export function CaissierRecus() {
  const { data, isSuccess } = useQuery({ queryKey: ["receipts"], queryFn: fetchReceipts });
  const receipts = isSuccess && data.length > 0 ? data : RECEIPTS;
  const [selectedId, setSelectedId] = useState<string>("");
  const selected =
    receipts.find((r) => r.id === selectedId) ?? receipts[0] ?? null;

  const totalDay = receipts.reduce((sum, r) => sum + r.total, 0);

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[1.7fr_1fr]">
        <Card className="p-[18px_20px]">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Reçus émis — aujourd&apos;hui
            </div>
            <span className="text-muted text-[12px] font-bold">
              {formatNumberFR(receipts.length)} reçus · {formatFCFA(totalDay)}
            </span>
          </div>

          <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
            <div className="w-[92px]">N° reçu</div>
            <div className="flex-1">Articles</div>
            <div className="w-[124px]">Paiement</div>
            <div className="w-[100px] text-right">Montant</div>
            <div className="w-[64px] text-right">Heure</div>
          </div>

          {receipts.map((r) => {
            const active = r.id === selected?.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                aria-pressed={active}
                className={cn(
                  "border-border hover:bg-hover flex w-full items-center gap-3.5 border-b px-1 py-3 text-left transition-colors last:border-0",
                  active && "bg-active hover:bg-active",
                )}
              >
                <div className="text-foreground w-[92px] text-[12px] font-extrabold">
                  {r.ref}
                </div>
                <div className="text-foreground flex-1 text-[12.5px] font-bold">
                  {formatNumberFR(r.items)} article{r.items > 1 ? "s" : ""}
                </div>
                <div className="w-[124px]">
                  <StatusPill variant={METHOD_VARIANT[r.method]} uppercase>
                    {r.method}
                  </StatusPill>
                </div>
                <div className="text-foreground w-[100px] text-right text-[12.5px] font-extrabold">
                  {formatNumberFR(r.total)}
                </div>
                <div className="text-muted w-[64px] text-right text-[11px] font-semibold">
                  {r.time}
                </div>
              </button>
            );
          })}
        </Card>

        <Card className="flex flex-col p-[18px_20px]">
          <div className="mb-4 flex items-center gap-2.5">
            <IconTile icon={ReceiptIcon} tone="accent" size={34} />
            <div>
              <div className="text-foreground text-[14px] font-extrabold tracking-[-0.2px]">
                Aperçu du reçu
              </div>
              <div className="text-muted text-[11.5px] font-semibold">
                Dakar Sécurité — boutique
              </div>
            </div>
          </div>

          {selected ? (
            <div className="flex flex-1 flex-col">
              <div className="border-border bg-surface2 rounded-xl border border-dashed p-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-[13px] font-extrabold">
                    {selected.ref}
                  </span>
                  <span className="text-muted inline-flex items-center gap-1.5 text-[11.5px] font-semibold">
                    <Clock className="size-3.5" strokeWidth={1.8} />
                    {selected.time}
                  </span>
                </div>

                <div className="border-border my-3 border-t border-dashed" />

                <div className="text-muted flex items-center justify-between text-[12px] font-semibold">
                  <span>Articles</span>
                  <span className="text-foreground">
                    {formatNumberFR(selected.items)}
                  </span>
                </div>
                <div className="text-muted mt-2 flex items-center justify-between text-[12px] font-semibold">
                  <span>Mode de paiement</span>
                  <StatusPill
                    variant={METHOD_VARIANT[selected.method]}
                    uppercase
                  >
                    {selected.method}
                  </StatusPill>
                </div>

                <div className="border-border my-3 border-t border-dashed" />

                <div className="flex items-baseline justify-between">
                  <span className="text-muted text-[12px] font-bold">
                    Total payé
                  </span>
                  <span className="text-foreground text-[20px] font-extrabold tracking-[-0.5px]">
                    {formatFCFA(selected.total)}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() =>
                  toast.success(`Reçu ${selected.ref} envoyé à l'impression`)
                }
              >
                <Printer strokeWidth={1.8} />
                Réimprimer le reçu
              </Button>
            </div>
          ) : (
            <div className="text-muted flex flex-1 items-center justify-center text-[12px] font-semibold">
              Sélectionnez un reçu pour l&apos;aperçu
            </div>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
