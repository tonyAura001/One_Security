import { A4Page, DocFooter, DocHeader, DocStamp } from "./doc-chrome";

import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";
import { type FactureData, factureTotaux } from "@/lib/documents/types";

/** Format FCFA : séparateur de milliers par point, sans décimale. */
function fmt(n: number): string {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("fr-FR").replace(/ | |\s/g, ".");
}

export function FactureTemplate({
  data,
  numero,
  dateLabel,
}: {
  data: FactureData;
  numero: string;
  dateLabel: string;
}) {
  const { ht, tva, ttc } = factureTotaux(data);

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
          FACTURE PROFORMA
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

      {/* Tableau des prestations */}
      <table className="mt-4 w-full border-collapse" style={{ fontSize: 10 }}>
        <thead>
          <tr style={{ background: OS_COLORS.navy }}>
            <th
              className="px-3 py-2 text-left font-bold text-white"
              style={{ width: "34%" }}
            >
              Détail de la prestation
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Nbre postes
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Nbre A.P.S
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Durée/jr (H)
            </th>
            <th className="px-2 py-2 text-center font-bold text-white">
              Durée (jrs)
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
              <td className="px-2 py-2 text-center align-top">{l.nbrePostes}</td>
              <td className="px-2 py-2 text-center align-top">{l.nbreAPS}</td>
              <td className="px-2 py-2 text-center align-top">{l.dureeJr}</td>
              <td className="px-2 py-2 text-center align-top">{l.dureeJrs}</td>
              <td className="px-3 py-2 text-right font-bold align-top">
                {fmt(l.montant)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* NB + totaux */}
      <div className="mt-4 flex items-start justify-between gap-6">
        <div className="max-w-[52%]" style={{ fontSize: 9.5 }}>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            NB :{" "}
          </span>
          <span style={{ color: "#4b5563" }}>{ONE_SECURITY.nbPaiement}</span>
        </div>

        <div
          className="w-[40%] overflow-hidden rounded-md"
          style={{ fontSize: 11 }}
        >
          <div className="flex items-stretch">
            <div
              className="flex-1 px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              TOTAL HT
            </div>
            <div
              className="w-[45%] px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              {fmt(ht)}
            </div>
          </div>
          <div className="flex items-stretch">
            <div
              className="flex-1 px-3 py-2 text-right font-bold"
              style={{ color: OS_COLORS.navy, background: OS_COLORS.grey }}
            >
              TVA {data.tauxTVA}%
            </div>
            <div
              className="w-[45%] px-3 py-2 text-right font-bold"
              style={{ color: OS_COLORS.navy, background: OS_COLORS.grey }}
            >
              {fmt(tva)}
            </div>
          </div>
          <div className="flex items-stretch">
            <div
              className="flex-1 px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              TOTAL TTC
            </div>
            <div
              className="w-[45%] px-3 py-2 text-right font-bold text-white"
              style={{ background: OS_COLORS.navy }}
            >
              {fmt(ttc)}
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
              {fmt(ttc)}
            </div>
          </div>
        </div>
      </div>

      {/* Section OPTION */}
      <div className="mt-5">
        <div
          className="rounded-t-md px-3 py-1.5 font-bold text-white"
          style={{ fontSize: 11, letterSpacing: 1, background: OS_COLORS.navy }}
        >
          OPTION
        </div>
        <div
          className="rounded-b-md px-4 py-2"
          style={{ background: OS_COLORS.grey, fontSize: 10 }}
        >
          <ul className="list-disc space-y-1 pl-4">
            {data.options.map((opt, i) => (
              <li key={i} style={{ color: OS_COLORS.navy }}>
                {opt}
              </li>
            ))}
          </ul>
        </div>
      </div>

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

      <DocStamp label={ONE_SECURITY.comptabilite} />

      <div className="flex-1" />
      <DocFooter />
    </A4Page>
  );
}
