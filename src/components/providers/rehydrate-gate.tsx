"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/store/ui";
import { usePayrollStore } from "@/lib/store/payroll";

/**
 * Persisted stores use `skipHydration` so the first client render matches
 * the server (defaults). This gate rehydrates them from localStorage once,
 * after mount, applying the persisted values without a hydration mismatch.
 *
 * La session (rôle/identité) n'est PAS persistée : elle est hydratée depuis
 * le serveur par le `SessionHydrator` du shell.
 */
export function RehydrateGate() {
  useEffect(() => {
    Promise.all([
      useUiStore.persist.rehydrate(),
      usePayrollStore.persist.rehydrate(),
    ]).finally(() => useUiStore.getState().markHydrated());
  }, []);
  return null;
}
