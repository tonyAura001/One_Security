"use client";

import { useState } from "react";
import { ContratEditor } from "@/components/screens/finance/contrat-editor";

/**
 * Écran dédié « Éditeur de contrat » (secrétariat / commercial). Réutilise
 * l'éditeur de contrat unifié (document juridique WYSIWYG, clauses OHADA).
 * Après création, on réinitialise pour enchaîner un nouveau contrat.
 */
export function SecretaireContratEditor() {
  const [resetKey, setResetKey] = useState(0);
  return <ContratEditor key={resetKey} onClose={() => setResetKey((k) => k + 1)} />;
}
