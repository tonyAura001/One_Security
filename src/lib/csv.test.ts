import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("csv — sérialisation", () => {
  it("sépare par « ; » et les lignes par CRLF", () => {
    expect(
      toCsv([
        ["Nom", "Montant"],
        ["Client A", 1000],
      ]),
    ).toBe("Nom;Montant\r\nClient A;1000");
  });

  it("échappe les valeurs contenant ; \" ou saut de ligne", () => {
    expect(toCsv([["a;b", 'c"d', "e\nf"]])).toBe('"a;b";"c""d";"e\nf"');
  });

  it("traite null/undefined comme vide", () => {
    expect(toCsv([[null, undefined, "x"]])).toBe(";;x");
  });
});
