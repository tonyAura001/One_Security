"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { getRecentActivity } from "@/lib/api/activity";
import {
  fetchProduits,
  fetchDaySummary,
  createVente,
} from "@/lib/supabase/data/caisse";
import { useCartStore, cartTotal, cartCount } from "@/lib/store/cart";
import { formatFCFA, formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type PaymentMethod = "Espèces" | "Wave" | "Orange Money";
const METHODS: PaymentMethod[] = ["Espèces", "Wave", "Orange Money"];

function stockLabel(stock: number, threshold: number) {
  if (stock === 0) return { text: "Rupture de stock", cls: "text-danger" };
  if (stock <= threshold)
    return { text: `Stock : ${stock} · bas`, cls: "text-warning" };
  return { text: `Stock : ${stock}`, cls: "text-muted" };
}

export function CaissierPos() {
  const qc = useQueryClient();
  const { lines, add, increment, decrement, remove, clear } = useCartStore();
  const [method, setMethod] = useState<PaymentMethod>("Espèces");
  const [received, setReceived] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["produits"],
    queryFn: fetchProduits,
  });
  const { data: day } = useQuery({
    queryKey: ["caisse-day"],
    queryFn: fetchDaySummary,
  });

  const total = cartTotal(lines);
  const count = cartCount(lines);
  const receivedNum = Number(received.replace(/\s/g, "")) || 0;
  const change = receivedNum - total;

  const sale = useMutation({
    mutationFn: () =>
      createVente({
        lines: lines.map((l) => ({ produitId: l.id, quantite: l.qty })),
        payments: [{ moyen: method, montant: total }],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produits"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["caisse-day"] });
      toast.success(
        "Vente encaissée",
        method === "Espèces"
          ? `Rendu monnaie : ${formatFCFA(Math.max(0, change))}`
          : `Réglé via ${method}`,
      );
      clear();
      setReceived("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      const denied = /row-level security|policy|refusé|42501/i.test(msg);
      toast.error(denied ? "Accès refusé pour encaisser." : `Échec : ${msg}`);
    },
  });

  function checkout() {
    if (lines.length === 0 || sale.isPending) return;
    if (method === "Espèces" && receivedNum < total) {
      toast.error("Montant reçu insuffisant");
      return;
    }
    sale.mutate();
  }

  return (
    <ScreenContainer>
      {/* Day summary */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 px-4 py-3.5">
        <div>
          <span className="text-muted text-[11.5px] font-semibold">
            Ventes du jour
          </span>
          <div className="text-foreground mt-0.5 text-[18px] font-extrabold">
            {formatNumberFR(day?.total ?? 0)}{" "}
            <span className="text-muted text-[11px]">FCFA</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-muted text-[11.5px] font-semibold">
            Transactions
          </span>
          <div className="text-foreground mt-0.5 text-[18px] font-extrabold">
            {day?.count ?? 0}
          </div>
        </div>
        <div className="text-right">
          <span className="text-muted text-[11.5px] font-semibold">Caisse</span>
          <div className="text-success mt-1 flex items-center gap-1.5 text-[14px] font-extrabold">
            <span className="bg-success size-2 rounded-full" />
            Ouverte · Awa N.
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Catalogue */}
        <Card className="p-[18px_20px]">
          <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
            Catalogue équipements
          </div>
          {products.length === 0 && (
            <EmptyState
              icon={ShoppingBag}
              title="Catalogue vide"
              description="Ajoutez des produits depuis la Boutique."
            />
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {products.map((p) => {
              const s = stockLabel(p.stock, p.threshold);
              const out = p.stock === 0;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "border-border bg-surface2 flex flex-col rounded-[13px] border p-3.5",
                    out && "opacity-70",
                  )}
                >
                  <div className="text-foreground min-h-[33px] text-[12.5px] leading-[1.3] font-bold">
                    {p.name}
                  </div>
                  <div className="text-foreground mt-2 text-[15px] font-extrabold">
                    {formatNumberFR(p.price)}{" "}
                    <span className="text-muted text-[10px]">FCFA</span>
                  </div>
                  <div
                    className={cn(
                      "mt-[3px] text-[10.5px] font-semibold",
                      s.cls,
                    )}
                  >
                    {s.text}
                  </div>
                  {out ? (
                    <button
                      disabled
                      className="border-border text-muted mt-2.5 cursor-not-allowed rounded-[9px] border bg-transparent py-2.5 text-[11.5px] font-extrabold"
                    >
                      Indisponible
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        add({ id: p.id, name: p.name, price: p.price })
                      }
                      className="bg-active text-accent hover:bg-accent mt-2.5 rounded-[9px] py-2.5 text-[11.5px] font-extrabold transition-colors hover:text-white"
                    >
                      + Ajouter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cart */}
        <Card className="p-[18px_20px] lg:sticky lg:top-4">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Panier · {count}
            </div>
            {lines.length > 0 && (
              <button
                onClick={clear}
                className="text-muted hover:text-danger text-[11.5px] font-bold"
              >
                Vider
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Panier vide"
              description="Ajoutez des articles du catalogue"
            />
          ) : (
            <>
              <div className="mb-3.5 flex flex-col">
                {lines.map((l) => (
                  <div
                    key={l.id}
                    className="border-border flex items-center gap-2.5 border-b py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[12.5px] font-bold">
                        {l.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() => decrement(l.id)}
                          aria-label="Retirer une unité"
                          className="border-border text-muted hover:bg-hover flex size-5 items-center justify-center rounded-md border"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-foreground min-w-4 text-center text-[12px] font-bold">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => increment(l.id)}
                          aria-label="Ajouter une unité"
                          className="border-border text-muted hover:bg-hover flex size-5 items-center justify-center rounded-md border"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-foreground text-[12.5px] font-extrabold whitespace-nowrap">
                      {formatNumberFR(l.price * l.qty)}
                    </div>
                    <button
                      onClick={() => remove(l.id)}
                      aria-label="Supprimer la ligne"
                      className="text-muted hover:text-danger p-0.5"
                    >
                      <X className="size-[15px]" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-baseline justify-between py-1.5 pb-3.5">
                <span className="text-muted text-[13px] font-bold">Total</span>
                <span className="text-foreground text-[22px] font-extrabold tracking-[-0.5px]">
                  {formatFCFA(total)}
                </span>
              </div>

              <div className="text-muted mb-2 text-[10.5px] font-bold tracking-[0.4px]">
                MODE DE PAIEMENT
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "rounded-[10px] border px-1 py-2.5 text-[11px] font-extrabold transition-colors",
                      method === m
                        ? "border-accent bg-active text-accent"
                        : "border-border bg-surface2 text-muted hover:bg-hover",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {method === "Espèces" && (
                <div className="border-border bg-surface2 mb-3 rounded-[10px] border p-3">
                  <label className="text-muted text-[10.5px] font-bold tracking-[0.4px]">
                    MONTANT REÇU
                  </label>
                  <input
                    inputMode="numeric"
                    value={received}
                    onChange={(e) =>
                      setReceived(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="0"
                    className="text-foreground mt-1 w-full border-0 bg-transparent text-[18px] font-extrabold outline-none"
                  />
                  {receivedNum > 0 && (
                    <div className="mt-1 flex items-center justify-between text-[12px] font-bold">
                      <span className="text-muted">Rendu monnaie</span>
                      <span
                        className={change >= 0 ? "text-success" : "text-danger"}
                      >
                        {formatFCFA(Math.max(0, change))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={checkout}
                disabled={sale.isPending}
                className="bg-success w-full py-3.5 text-[14px] text-white hover:brightness-110"
                style={{ boxShadow: "0 6px 16px rgba(16,185,129,.3)" }}
              >
                {sale.isPending ? "Encaissement…" : "Encaisser la vente"}
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* ── Activité récente (flux RBAC caissier) ── */}
      <div className="mt-4">
        <ActivityFeed items={getRecentActivity("agent")} />
      </div>
    </ScreenContainer>
  );
}
