/**
 * Génération et téléchargement de fichiers CSV côté navigateur.
 *
 * Séparateur « ; » (convention Excel FR) + BOM UTF-8 pour les accents.
 * Aucune dépendance, aucun backend : construit un Blob et déclenche le
 * téléchargement via un lien temporaire.
 */

type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
  const s = value == null ? "" : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Sérialise des lignes (1re ligne = en-têtes) en CSV « ; ». */
export function toCsv(rows: Cell[][]): string {
  return rows.map((r) => r.map(escapeCell).join(";")).join("\r\n");
}

/** Déclenche le téléchargement d'un CSV depuis des lignes. No-op côté serveur. */
export function downloadCsv(filename: string, rows: Cell[][]): void {
  if (typeof document === "undefined") return;
  const blob = new Blob(["﻿" + toCsv(rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
