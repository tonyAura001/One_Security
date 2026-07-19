import { A4Page, DocHeader, DocStamp } from "@/components/documents/doc-chrome";
import { RichTextView } from "@/components/documents/rich-text-editor";
import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";
import { type FicheData } from "@/lib/documents/types";

/** Trait pointillé de remplissage pour les champs à compléter à la main. */
const DOTS = "………………………………………";

export function FicheTemplate({
  data,
  dateLabel,
}: {
  data: FicheData;
  dateLabel: string;
}) {
  return (
    <A4Page>
      <DocHeader />

      {/* Titre + sous-titre */}
      <h1
        className="text-center font-bold"
        style={{ fontSize: 18, color: OS_COLORS.navy }}
      >
        Fiche D&apos;engagement Individuelle de Mission
      </h1>
      <p
        className="mt-1 text-center font-bold"
        style={{ fontSize: 13, color: OS_COLORS.gold }}
      >
        {data.titreEvent}
      </p>

      {/* Cadre de la mission */}
      <div
        className="mt-6 py-1.5 text-center font-bold uppercase text-white"
        style={{ background: OS_COLORS.navy, fontSize: 11, letterSpacing: 1 }}
      >
        Cadre de la mission
      </div>
      <div
        className="grid grid-cols-2"
        style={{
          border: `1px solid ${OS_COLORS.navy}`,
          borderTop: "none",
          fontSize: 12,
        }}
      >
        <div
          className="px-4 py-3"
          style={{ borderRight: `1px solid ${OS_COLORS.grey}` }}
        >
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            Effectif total mobilisé :{" "}
          </span>
          {data.effectif}
        </div>
        <div className="px-4 py-3">
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            Rémunération convenue :{" "}
          </span>
          {data.remuneration}
        </div>
      </div>

      {/* Engagement sur les consignes */}
      <p className="mt-5" style={{ fontSize: 12, lineHeight: 1.6 }}>
        <span className="font-bold">En signant cette fiche,</span> je
        m&apos;engage sur l&apos;honneur à respecter strictement les consignes
        suivantes de One Security ci-dessous :
      </p>
      <div className="mt-2">
        <RichTextView html={data.consignes} />
      </div>

      {/* Droit à la prise d'image */}
      <h2
        className="mt-5 font-bold uppercase"
        style={{ fontSize: 12.5, color: OS_COLORS.navy }}
      >
        Droit à la prise d&apos;image
      </h2>
      <p className="mt-1" style={{ fontSize: 12, lineHeight: 1.6 }}>
        En signant ce document, j&apos;autorise expressément One Security à
        prendre des photos ou des vidéos de ma personne durant l&apos;exercice
        de mes fonctions sur le site. Ces images serviront exclusivement au
        contrôle de la qualité du service, aux rapports de fin de mission
        destinés au client, et à la communication officielle de l&apos;entreprise.
      </p>

      {/* Engagement de l'agent */}
      <h2
        className="mt-5 font-bold uppercase"
        style={{ fontSize: 12.5, color: OS_COLORS.navy }}
      >
        Engagement de l&apos;agent
      </h2>
      <p className="mt-1" style={{ fontSize: 12, lineHeight: 1.6 }}>
        Je soussigné(e) reconnaît avoir pris connaissance des consignes et du
        montant de ma rémunération ({data.remuneration}). Je sais que tout
        manquement à ces règles entraînera une sanction financière immédiate.
      </p>

      {/* Sanction */}
      <h2
        className="mt-5 font-bold uppercase"
        style={{ fontSize: 12.5, color: OS_COLORS.navy }}
      >
        Sanction en cas de manquement
      </h2>
      <p className="mt-1" style={{ fontSize: 12, lineHeight: 1.6 }}>
        Tout manquement constaté à l&apos;une de ces consignes entraînera la
        rupture immédiate de la mission pour l&apos;agent fautif, sans aucune
        rémunération.
      </p>

      {/* Identité agent */}
      <div className="mt-6 space-y-2" style={{ fontSize: 12 }}>
        <p>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            Nom de l&apos;agent :{" "}
          </span>
          {data.nomAgent || DOTS}
        </p>
        <p>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            CNI :{" "}
          </span>
          {data.cni || DOTS}
        </p>
      </div>

      {/* Lieu et date */}
      <p
        className="mt-6 text-center font-bold"
        style={{ fontSize: 12, color: OS_COLORS.navy }}
      >
        Fait à Dakar, le {dateLabel}
      </p>

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-2 gap-10">
        {/* Prestataire */}
        <div className="text-center">
          <p className="font-bold" style={{ fontSize: 12, color: OS_COLORS.navy }}>
            Signature du Prestataire
          </p>
          <p className="italic" style={{ fontSize: 11, color: "#4b5563" }}>
            Prestataire
          </p>
          <p className="italic" style={{ fontSize: 11, color: "#4b5563" }}>
            «&nbsp;Lu et approuvé&nbsp;»
          </p>
          <div
            className="mt-10"
            style={{ borderBottom: `1px solid ${OS_COLORS.navy}` }}
          />
        </div>

        {/* Agence One Security */}
        <div className="text-center">
          <p className="font-bold" style={{ fontSize: 12, color: OS_COLORS.navy }}>
            AGENCE ONE SECURITY SUARL
          </p>
          <p className="italic" style={{ fontSize: 11, color: "#4b5563" }}>
            {ONE_SECURITY.pdg} – PDG
          </p>
          <p className="italic" style={{ fontSize: 11, color: "#4b5563" }}>
            «&nbsp;Lu et approuvé&nbsp;»
          </p>
          <div
            className="mt-10"
            style={{ borderBottom: `1px solid ${OS_COLORS.navy}` }}
          />
          <DocStamp label="" />
        </div>
      </div>
    </A4Page>
  );
}
