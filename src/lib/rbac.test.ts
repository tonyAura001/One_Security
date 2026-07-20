import { describe, it, expect } from "vitest";
import {
  ROLE_ORDER,
  FUNCTIONAL_SCREENS,
  roleMenu,
  allowedScreens,
  canAccess,
  homeScreen,
  isScreenKey,
  type MenuItem,
  type RoleId,
  type ScreenKey,
} from "./rbac";

function keysOf(items: MenuItem[]): ScreenKey[] {
  const acc: ScreenKey[] = [];
  for (const it of items) {
    if (it.key) acc.push(it.key);
    if (it.children) acc.push(...keysOf(it.children));
  }
  return acc;
}

describe("RBAC — contrôle d'accès", () => {
  it("chaque rôle n'expose que des écrans fonctionnels dans son menu", () => {
    for (const role of ROLE_ORDER) {
      for (const key of keysOf(roleMenu(role))) {
        expect(
          FUNCTIONAL_SCREENS.has(key),
          `${role} expose l'écran non-fonctionnel « ${key} »`,
        ).toBe(true);
      }
    }
  });

  it("l'écran d'accueil de chaque rôle est accessible", () => {
    for (const role of ROLE_ORDER) {
      expect(canAccess(role, homeScreen(role))).toBe(true);
    }
  });

  it("le DG accède aux écrans transverses", () => {
    expect(canAccess("dg", "documents")).toBe(true);
    expect(canAccess("dg", "taches")).toBe(true);
    expect(canAccess("dg", "messagerie")).toBe(true);
    expect(canAccess("dg", "dashboard")).toBe(true);
  });

  it("les écrans non câblés sont bloqués pour TOUS (y compris DG)", () => {
    const hidden: ScreenKey[] = [
      "rentabilite",
      "satisfaction",
      "veille",
      "projets",
      "bibliotheque",
      "notes",
      "pos",
      "cloture",
    ];
    for (const role of ROLE_ORDER) {
      for (const key of hidden) {
        expect(
          canAccess(role, key),
          `${role} ne devrait pas accéder à « ${key} »`,
        ).toBe(false);
      }
    }
  });

  it("un agent terrain n'accède pas à la finance ni au CRM", () => {
    const agentDenied: ScreenKey[] = ["finance", "tresorerie", "crm", "prospects", "membres"];
    for (const key of agentDenied) {
      expect(canAccess("agent", key)).toBe(false);
    }
  });

  it("les paramètres sont universels", () => {
    for (const role of ROLE_ORDER) {
      expect(allowedScreens(role).has("parametres")).toBe(true);
    }
  });

  it("isScreenKey valide les clés connues", () => {
    expect(isScreenKey("finance")).toBe(true);
    expect(isScreenKey("home")).toBe(true);
    expect(isScreenKey("nimportequoi")).toBe(false);
  });

  it("tous les rôles connus sont couverts", () => {
    const expected: RoleId[] = [
      "dg", "rp", "rf", "rh", "manager",
      "controleur", "surveillant", "juriste", "comptable", "agent",
    ];
    expect(new Set(ROLE_ORDER)).toEqual(new Set(expected));
  });
});
