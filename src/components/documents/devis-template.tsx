import { A4Page, DocFooter, DocHeader, DocStamp, DocSignatureBlock } from "./doc-chrome";
import type { WithSignature } from "@/lib/documents/types";

import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";
import {
  type DevisData,
  devisMontantLigne,
  devisTotal,
} from "@/lib/documents/types";

/** Format FCFA : séparateur de milliers par point, sans décimale. */
function fmt(n: number): string {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("fr-FR").replace(/ | |\s/g, ".");
}

export function DevisTemplate({
  data,
  numero,
  dateLabel,
}: {
  data: DevisData;
  numero: string;
  dateLabel: string;
}) {
  const total = devisTotal(data);

  return (
    <A4Page>
      <DocHeader />

      {/* Bandeau titre */}
      <div
        className="flex items-center justify-between rounded-lg px-5 py-3"
        style={{ background: OS_COLORS.navy }}
      >
        <span
          className="font-bold text-white"
          style={{ fontSize: 22, letterSpacing: 1 }}
        >
          DEVIS
        </span>
        <span className="text-white" style={{ fontSize: 11 }}>
          Dakar, le {dateLabel}
        </span>
      </div>

      {/* Bande client */}
      <div
        className="mt-3 rounded-md px-4 py-2"
        style={{ background: OS_COLORS.grey }}
      >
        <span style={{ fontSize: 10, color: OS_COLORS.navy }}>
          N° {numero} - Client :{" "}
        </span>
        <span
          className="font-bold"
          style={{ fontSize: 16, color: OS_COLORS.navy }}
        >
          {data.client}
        </span>
      </div>

      {/* Lieu */}
      <div
        className="mt-3 pb-1 font-bold"
        style={{
          fontSize: 12,
          color: OS_COLORS.navy,
          borderBottom: `2px solid ${OS_COLORS.gold}`,
        }}
      >
        Lieu : {data.lieu}
      </div>

      {/* Tableau des prestations */}
      <table
        className="mt-4 w-full border-collapse"
        style={{ fontSize: 10.5 }}
      >
        <thead>
          <tr style={{ background: OS_COLORS.navy }}>
            <th
              className="px-3 py-2 text-left font-bold text-white"
              style={{ width: "42%" }}
            >
              Détail de la prestation
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Nbre Agent
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Durée/jr (H)
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Prix Unitaire
            </th>
            <th className="px-3 py-2 text-right font-bold text-white">
              Montant (Fcfa)
            </th>
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((l, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${OS_COLORS.grey}` }}>
              <td className="px-3 py-2 font-bold align-top">{l.detail}</td>
              <td className="px-2 py-2 text-center align-top">{l.nbreAgent}</td>
              <td className="px-2 py-2 text-center align-top">{l.duree}</td>
              <td className="px-2 py-2 text-center align-top">
                {fmt(l.prixUnitaire)}
              </td>
              <td className="px-3 py-2 text-right font-bold align-top">
                {fmt(devisMontantLigne(l))}
              </td>
            </tr>
          ))}
          <tr>
            <td
              colSpan={4}
              className="px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              TOTAL TTC
            </td>
            <td
              className="px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Montant en lettres */}
      <div
        className="mt-4 font-bold"
        style={{ fontSize: 10.5, color: OS_COLORS.navy }}
      >
        Arrêtée la présente facture à la somme de :{" "}
        <span
          className="ml-1 inline-block align-bottom"
          style={{
            minWidth: "45%",
            borderBottom: `1px solid ${OS_COLORS.navy}`,
          }}
        />
      </div>

      {/* NB + totaux */}
      <div className="mt-4 flex items-start justify-between gap-6">
        <div className="max-w-[52%]" style={{ fontSize: 9.5 }}>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            NB :{" "}
          </span>
          <span style={{ color: "#4b5563" }}>{ONE_SECURITY.nbPaiement}</span>
        </div>

        <div className="w-[40%] overflow-hidden rounded-md" style={{ fontSize: 11 }}>
          <div className="flex items-stretch">
            <div
              className="flex-1 px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              TOTAL TTC
            </div>
            <div
              className="w-[45%] px-3 py-2 text-right font-bold"
              style={{ color: OS_COLORS.navy, background: OS_COLORS.grey }}
            >
              {fmt(total)}
            </div>
          </div>
          <div className="flex items-stretch">
            <div
              className="flex-1 px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.gold }}
            >
              NET À PAYER
            </div>
            <div
              className="w-[45%] px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.goldLight }}
            >
              {fmt(total)}
            </div>
          </div>
        </div>
      </div>

      <DocSignatureBlock signature={(data as WithSignature).signature} />

      <DocStamp label={ONE_SECURITY.comptabilite} />

      <div className="flex-1" />
      <DocFooter />
    </A4Page>
  );
}
