import { describe, it, expect } from "vitest";
import { formatDateFR, formatFCFACompact, formatRelative } from "./format";

describe("format — dates robustes", () => {
  it("formate une date valide selon le motif", () => {
    expect(formatDateFR("2026-07-19", "dd/MM/yyyy")).toBe("19/07/2026");
  });

  it("renvoie « — » (ne throw pas) sur une date vide/invalide", () => {
    expect(formatDateFR("")).toBe("—");
    expect(formatDateFR("pas-une-date")).toBe("—");
    expect(formatDateFR(null)).toBe("—");
    expect(formatDateFR(undefined)).toBe("—");
    expect(formatRelative("")).toBe("—");
  });
});

describe("format — FCFA compact", () => {
  it("millions", () => {
    expect(formatFCFACompact(1250000)).toBe("1,3 M FCFA");
    expect(formatFCFACompact(2000000)).toBe("2 M FCFA");
  });
  it("milliers", () => {
    expect(formatFCFACompact(500000)).toBe("500 k FCFA");
  });
});
