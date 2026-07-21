/**
 * Template de contrat de travail (Code du travail sénégalais / convention
 * collective sécurité privée). Génère le corps HTML éditable, variables
 * substituées, pour CDI ou CDD.
 */
import { montantEnLettres } from "./montant-lettres";

export interface ContratTravailVars {
  employeurName: string;
  employeurRccm: string;
  employeurAdresse: string;
  employeurRep: string;
  employeName: string;
  poste: string;
  type: "CDI" | "CDD";
  salaire: number;
  dateDebutLabel: string;
  dateFinLabel: string;
  site: string;
  dateSignatureLabel: string;
}

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/\s/g, ".");
}

export function buildContratTravailHtml(v: ContratTravailVars): string {
  const cdd = v.type === "CDD";
  const titre = cdd ? "CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE" : "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE";
  const poste = v.poste?.trim() || "Agent de sécurité";
  const site = v.site?.trim() || "[…]";
  const duree = cdd
    ? `Le présent contrat est conclu pour une durée déterminée, du <strong>${v.dateDebutLabel}</strong> au <strong>${v.dateFinLabel}</strong>. Il prendra fin de plein droit à son terme, sauf renouvellement exprès dans les limites fixées par le Code du travail.`
    : `Le présent contrat est conclu pour une durée indéterminée à compter du <strong>${v.dateDebutLabel}</strong>.`;
  const enLettres = montantEnLettres(v.salaire || 0);

  return `
<h1>${titre}</h1>
<p><strong>Entre les soussignés :</strong></p>
<p><strong>${v.employeurName}</strong>, immatriculée au RCCM sous le numéro ${v.employeurRccm}, dont le siège social est situé à ${v.employeurAdresse}, représentée par ${v.employeurRep}, ci-après désignée « l'Employeur »,</p>
<p>Et</p>
<p><strong>${v.employeName || "[NOM DU SALARIÉ]"}</strong>, ci-après désigné(e) « le Salarié »,</p>
<p>Il a été convenu et arrêté ce qui suit :</p>
<h2>Article 1 — Engagement et fonctions</h2>
<p>Le Salarié est engagé par l'Employeur en qualité de <strong>${poste}</strong>. Il exercera ses fonctions sur le site de <strong>${site}</strong> et, en tant que de besoin, sur tout autre site confié à l'Employeur, dans le respect des consignes de sécurité en vigueur.</p>
<h2>Article 2 — Durée du contrat</h2>
<p>${duree}</p>
<h2>Article 3 — Période d'essai</h2>
<p>Le présent contrat est assorti d'une période d'essai conformément au Code du travail et à la convention collective applicable, durant laquelle chacune des parties pourra y mettre fin sans préavis ni indemnité.</p>
<h2>Article 4 — Rémunération</h2>
<p>En contrepartie de son travail, le Salarié percevra un salaire brut mensuel de <strong>${fmt(v.salaire)} FCFA</strong> (${enLettres}), payable à terme échu selon les modalités en vigueur dans l'entreprise, sous déduction des cotisations et retenues légales.</p>
<h2>Article 5 — Durée du travail</h2>
<p>La durée du travail est fixée conformément à la législation en vigueur et aux nécessités du service de sécurité, y compris le travail de nuit, les dimanches et jours fériés, dans les limites légales et conventionnelles.</p>
<h2>Article 6 — Obligations du Salarié</h2>
<ul>
<li>Exécuter les missions de surveillance et de gardiennage avec vigilance, probité et professionnalisme</li>
<li>Porter la tenue et les équipements fournis, et en assurer le bon entretien</li>
<li>Respecter le règlement intérieur, les consignes de poste et l'obligation de discrétion</li>
<li>Signaler sans délai tout incident, anomalie ou fait susceptible de porter atteinte à la sécurité</li>
</ul>
<h2>Article 7 — Congés</h2>
<p>Le Salarié bénéficie des congés payés dans les conditions prévues par le Code du travail sénégalais.</p>
<h2>Article 8 — Protection sociale</h2>
<p>Le Salarié est affilié aux organismes de sécurité sociale (IPRES) et de prévoyance (CSS) conformément à la réglementation en vigueur.</p>
<h2>Article 9 — Rupture du contrat</h2>
<p>Le contrat pourra être rompu dans les conditions et selon les préavis fixés par le Code du travail et la convention collective. Toute faute grave pourra entraîner un licenciement sans préavis ni indemnité.</p>
<h2>Article 10 — Dispositions générales</h2>
<p>Pour tout ce qui n'est pas prévu au présent contrat, les parties se réfèrent au Code du travail sénégalais et à la convention collective de la sécurité privée. Tout litige relèvera des juridictions compétentes de Dakar.</p>
<p>Fait à Dakar, le ${v.dateSignatureLabel}, en deux exemplaires originaux dont un remis à chaque partie.</p>
`.trim();
}
