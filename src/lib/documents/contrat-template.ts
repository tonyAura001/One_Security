/**
 * Template de contrat de prestation (droit sénégalais / OHADA, 9 articles).
 * Génère le corps HTML du contrat avec les variables substituées. Le corps est
 * ensuite librement éditable dans l'éditeur riche (TipTap).
 */
import { montantEnLettres } from "./montant-lettres";

export interface ContratVars {
  // Prestataire (issu de l'identité de l'entreprise / réglages)
  prestataireName: string;
  prestataireCapital: string;
  prestataireRccm: string;
  prestataireAdresse: string;
  prestataireRep: string;
  // Client
  clientName: string;
  // Contenu
  objet: string;
  dureeLabel: string;
  dateDebutLabel: string;
  dateFinLabel: string;
  montantHT: number;
  tauxTVA: number;
  dateSignatureLabel: string;
}

function fmt(n: number): string {
  return Math.round(Number(n) || 0)
    .toLocaleString("fr-FR")
    .replace(/\s/g, ".");
}

/** Corps HTML complet du contrat, variables substituées. */
export function buildContratHtml(v: ContratVars): string {
  const ttc = Math.round((v.montantHT || 0) * (1 + (v.tauxTVA || 0) / 100));
  const enLettres = montantEnLettres(v.montantHT || 0);
  const objet = v.objet?.trim() || "[Description détaillée des prestations]";

  return `
<h1>CONTRAT DE PRESTATION DE SERVICES</h1>
<p><strong>Entre les soussignés :</strong></p>
<p><strong>${v.prestataireName}</strong>, société au capital de ${v.prestataireCapital}, immatriculée au RCCM sous le numéro ${v.prestataireRccm}, dont le siège social est situé à ${v.prestataireAdresse}, représentée par ${v.prestataireRep}, ci-après désignée « le Prestataire »</p>
<p>Et</p>
<p><strong>${v.clientName}</strong>, dont le siège social est situé à […], représenté(e) par […], ci-après désigné(e) « le Client »</p>
<h2>Article 1 — Objet du contrat</h2>
<p>Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s'engage à fournir au Client les prestations suivantes :</p>
<p>${objet}</p>
<h2>Article 2 — Durée</h2>
<p>Le présent contrat est conclu pour une durée de ${v.dureeLabel} à compter du ${v.dateDebutLabel}, soit jusqu'au ${v.dateFinLabel}. Il pourra être renouvelé par accord exprès des deux parties.</p>
<h2>Article 3 — Obligations du Prestataire</h2>
<p>Le Prestataire s'engage à :</p>
<ul>
<li>Exécuter les prestations définies à l'Article 1 avec professionnalisme et diligence</li>
<li>Mettre à disposition du personnel qualifié et formé</li>
<li>Respecter les normes en vigueur applicables à son activité</li>
<li>Informer le Client de tout incident susceptible d'affecter l'exécution des prestations</li>
</ul>
<h2>Article 4 — Obligations du Client</h2>
<p>Le Client s'engage à :</p>
<ul>
<li>Mettre à disposition du Prestataire les informations et accès nécessaires</li>
<li>Régler les factures dans les délais convenus</li>
<li>Informer le Prestataire de tout changement susceptible d'affecter l'exécution du contrat</li>
</ul>
<h2>Article 5 — Prix et conditions de paiement</h2>
<p>En contrepartie des prestations, le Client versera au Prestataire la somme de <strong>${fmt(v.montantHT)} FCFA HT par mois</strong>, soit <strong>${fmt(ttc)} FCFA TTC</strong> (TVA ${v.tauxTVA}%). Soit, en toutes lettres : ${enLettres} hors taxes par mois.</p>
<p>Les factures sont payables à réception, au plus tard dans un délai de 30 jours.</p>
<p>Tout retard de paiement entraînera l'application de pénalités de retard au taux légal en vigueur.</p>
<h2>Article 6 — Confidentialité</h2>
<p>Chaque partie s'engage à garder confidentielles toutes les informations obtenues dans le cadre de l'exécution du présent contrat et à ne pas les divulguer à des tiers sans l'accord préalable écrit de l'autre partie.</p>
<h2>Article 7 — Résiliation</h2>
<p>Le présent contrat pourra être résilié par l'une ou l'autre des parties :</p>
<ul>
<li>En cas de manquement grave de l'une des parties à ses obligations, non réparé dans un délai de 15 jours suivant mise en demeure</li>
<li>À l'expiration de la durée convenue, si aucune des parties ne souhaite le renouveler</li>
<li>D'un commun accord entre les parties</li>
</ul>
<h2>Article 8 — Litiges</h2>
<p>En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties s'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents de Dakar, Sénégal.</p>
<h2>Article 9 — Dispositions générales</h2>
<p>Le présent contrat est régi par le droit sénégalais et les dispositions de l'OHADA. Toute modification devra faire l'objet d'un avenant signé par les deux parties.</p>
<p>Fait à Dakar, le ${v.dateSignatureLabel}, en deux exemplaires originaux.</p>
`.trim();
}
