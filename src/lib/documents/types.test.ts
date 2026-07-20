import { describe, it, expect } from "vitest";
import {
  devisMontantLigne,
  devisTotal,
  factureTotaux,
  type DevisData,
  type FactureData,
} from "./types";

describe("documents — calculs devis", () => {
  it("montant ligne = nbre agents × prix unitaire", () => {
    expect(
      devisMontantLigne({ detail: "APR", nbreAgent: 50, duree: "12H/24H", prixUnitaire: 25000 }),
    ).toBe(1250000);
  });

  it("total devis = somme des lignes (TTC direct)", () => {
    const d: DevisData = {
      client: "Madame Diop",
      date: "2026-06-29",
      lieu: "Terrain ACAPES",
      lignes: [
        { detail: "APR", nbreAgent: 50, duree: "12H/24H", prixUnitaire: 25000 },
        { detail: "Renfort", nbreAgent: 2, duree: "8H", prixUnitaire: 10000 },
      ],
    };
    expect(devisTotal(d)).toBe(1270000);
  });
});

describe("documents — calculs facture proforma", () => {
  it("HT / TVA 18% / TTC (exemple réel : 350k → 413k)", () => {
    const f: FactureData = {
      client: "Mr Diop",
      date: "2026-03-25",
      tauxTVA: 18,
      options: [],
      lignes: [
        { detail: "Gardiennage JOUR", nbrePostes: "1", nbreAPS: "1", dureeJr: "12H", dureeJrs: "1", montant: 175000 },
        { detail: "Gardiennage NUIT", nbrePostes: "1", nbreAPS: "1", dureeJr: "12H", dureeJrs: "1", montant: 175000 },
      ],
    };
    expect(factureTotaux(f)).toEqual({ ht: 350000, tva: 63000, ttc: 413000 });
  });

  it("TVA 0% → TTC = HT", () => {
    const f: FactureData = {
      client: "X", date: "2026-01-01", tauxTVA: 0, options: [],
      lignes: [{ detail: "P", nbrePostes: "1", nbreAPS: "1", dureeJr: "", dureeJrs: "", montant: 100000 }],
    };
    expect(factureTotaux(f)).toEqual({ ht: 100000, tva: 0, ttc: 100000 });
  });
});
