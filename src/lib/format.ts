import { format, formatDistanceToNow, type FormatOptions } from "date-fns";
import { fr } from "date-fns/locale";

const numberFR = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** "12450000" → "12 450 000" (French grouping). */
export function formatNumberFR(n: number): string {
  return numberFR.format(n);
}

/** "12450000" → "12 450 000 FCFA". */
export function formatFCFA(n: number, opts?: { suffix?: boolean }): string {
  const s = numberFR.format(n);
  return opts?.suffix === false ? s : `${s} FCFA`;
}

/** Compact FCFA for tight spaces: 12 450 000 → "12,5 M FCFA". */
export function formatFCFACompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "");
    return `${v} M FCFA`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${Math.round(n / 1000)} k FCFA`;
  }
  return formatFCFA(n);
}

export function formatPercent(n: number, fractionDigits = 0): string {
  return `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} %`;
}

type DateInput = Date | string | number | null | undefined;

function toDate(d: DateInput): Date {
  return d instanceof Date ? d : new Date(d ?? NaN);
}

/** true si la date est utilisable (évite le throw « Invalid time value »). */
function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

/**
 * e.g. "3 juillet 2026". Pass a date-fns pattern to override.
 * Renvoie « — » pour une date absente/invalide plutôt que de lever
 * (date-fns `format` throw sur une Invalid Date, ce qui crasherait le rendu).
 */
export function formatDateFR(d: DateInput, pattern = "d MMMM yyyy"): string {
  const date = toDate(d);
  if (!isValidDate(date)) return "—";
  const options: FormatOptions = { locale: fr };
  return format(date, pattern, options);
}

/** "il y a 3 jours". « — » si la date est absente/invalide. */
export function formatRelative(d: DateInput): string {
  const date = toDate(d);
  if (!isValidDate(date)) return "—";
  return formatDistanceToNow(date, { locale: fr, addSuffix: true });
}

/** Short day + date, e.g. "ven. 3 juil.". */
export function formatDayShort(d: DateInput): string {
  return formatDateFR(d, "EEE d MMM");
}
