"use client";

import { useState } from "react";
import { DevisEditor } from "@/components/screens/finance/devis-editor";

/**
 * Écran dédié « Création de devis » (secrétariat / commercial). Réutilise
 * l'éditeur de devis unifié (split édition ↔ aperçu A4). Après création, on
 * réinitialise l'éditeur pour enchaîner un nouveau devis.
 */
export function SecretaireDevis() {
  const [resetKey, setResetKey] = useState(0);
  return <DevisEditor key={resetKey} onClose={() => setResetKey((k) => k + 1)} />;
}
