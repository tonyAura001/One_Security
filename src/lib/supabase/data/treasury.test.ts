import { describe, it, expect } from "vitest";
import { computeTreasuryStats, computeBalanceSeries } from "./treasury";
import type { Account, Movement } from "@/lib/api/treasury";

const accounts = [{ balance: 1000 }] as Account[];
const movements = [
  { date: "2026-01-15", amount: 500 },
  { date: "2026-02-10", amount: -200 },
] as Movement[];

describe("treasury — stats", () => {
  it("total / encaissements / décaissements / prévisionnel J+30", () => {
    expect(computeTreasuryStats(accounts, movements)).toEqual({
      total: 1000,
      encaissements: 500,
      decaissements: 200,
      forecast30: 1090, // 1000 + 500*0.3 - 200*0.3
    });
  });
});

describe("treasury — série de solde cumulé", () => {
  it("reconstruit le solde mois par mois", () => {
    expect(computeBalanceSeries(accounts, movements)).toEqual([
      { month: "2026-01", solde: 1200 },
      { month: "2026-02", solde: 1000 },
    ]);
  });

  it("sans mouvement : un point au solde total", () => {
    const series = computeBalanceSeries(accounts, []);
    expect(series).toHaveLength(1);
    expect(series[0].solde).toBe(1000);
  });
});
