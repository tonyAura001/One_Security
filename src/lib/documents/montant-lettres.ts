/**
 * Conversion d'un entier en toutes lettres (français) — pour la mention
 * légale « Arrêtée la présente facture à la somme de … » des documents.
 * Gère les particularités : 70/80/90, « cent(s) », « quatre-vingts »,
 * « mille » invariable, pluriel de million/milliard.
 */

const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 0–99 en lettres. */
function below100(n: number): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return "dix-" + UNITS[n - 10];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    let word = TENS[t];
    if (u === 1) word += "-et-un";
    else if (u > 0) word += "-" + UNITS[u];
    return word;
  }
  if (n < 80) {
    const u = n - 60; // 10..19
    if (u === 11) return "soixante-et-onze";
    return "soixante-" + below100(u);
  }
  const u = n - 80; // 0..19
  if (u === 0) return "quatre-vingts";
  return "quatre-vingt-" + below100(u);
}

/** 0–999 en lettres. */
function below1000(n: number): string {
  if (n < 100) return below100(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const head = c === 1 ? "cent" : UNITS[c] + " cent";
  if (r === 0) return c > 1 ? head + "s" : head;
  return head + " " + below100(r);
}

/** Entier positif en toutes lettres. */
export function nombreEnLettres(n: number): string {
  const v = Math.floor(Math.abs(Number(n) || 0));
  if (v === 0) return "zéro";

  const milliard = Math.floor(v / 1_000_000_000);
  const million = Math.floor((v % 1_000_000_000) / 1_000_000);
  const mille = Math.floor((v % 1_000_000) / 1000);
  const reste = v % 1000;
  const parts: string[] = [];

  if (milliard)
    parts.push(below1000(milliard) + " milliard" + (milliard > 1 ? "s" : ""));
  if (million)
    parts.push(below1000(million) + " million" + (million > 1 ? "s" : ""));
  if (mille) {
    // « mille » est invariable ; vingt/cent perdent leur « s » devant.
    parts.push(
      mille === 1
        ? "mille"
        : below1000(mille).replace(/(vingt|cent)s$/, "$1") + " mille",
    );
  }
  if (reste) parts.push(below1000(reste));

  return parts.join(" ");
}

/** Montant FCFA en toutes lettres, ex. « cinq cent mille francs CFA ». */
export function montantEnLettres(n: number): string {
  const v = Math.floor(Math.abs(Number(n) || 0));
  const mots = nombreEnLettres(v);
  const franc = v <= 1 ? "franc CFA" : "francs CFA";
  const phrase = `${mots} ${franc}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
