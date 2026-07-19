import { A4Page, DocHeader, DocStamp } from "@/components/documents/doc-chrome";
import { RichTextView } from "@/components/documents/rich-text-editor";
import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";
import { type CommuniqueData } from "@/lib/documents/types";

export function CommuniqueTemplate({
  data,
  dateLabel,
}: {
  data: CommuniqueData;
  dateLabel: string;
}) {
  return (
    <A4Page>
      <DocHeader />

      {/* Date */}
      <div
        className="text-right font-bold"
        style={{ fontSize: 11, color: OS_COLORS.navy }}
      >
        Dakar, le {dateLabel}
      </div>

      {/* Titre */}
      <h1
        className="my-6 text-center font-bold uppercase"
        style={{ fontSize: 20, letterSpacing: 1.5, color: OS_COLORS.navy }}
      >
        Communiqué officiel
      </h1>

      {/* Objet */}
      <p className="mb-4" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
        <span className="font-bold" style={{ color: OS_COLORS.navy }}>
          Objet :{" "}
        </span>
        {data.objet}
      </p>

      {/* Corps */}
      <RichTextView html={data.corps} />

      {/* Coordonnées */}
      <div className="mt-6" style={{ fontSize: 12, lineHeight: 1.7 }}>
        <p className="mb-1">
          Nous restons joignables sans interruption via :
        </p>
        <p>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            Téléphone &amp; WhatsApp :{" "}
          </span>
          {ONE_SECURITY.telWhatsapp}
        </p>
        <p>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            E-mail :{" "}
          </span>
          {ONE_SECURITY.email}
        </p>
        <p>
          <span className="font-bold" style={{ color: OS_COLORS.navy }}>
            Site web :{" "}
          </span>
          {ONE_SECURITY.web}
        </p>
      </div>

      {/* Signature */}
      <p
        className="mt-8 text-right font-bold"
        style={{ fontSize: 12, color: OS_COLORS.navy }}
      >
        {ONE_SECURITY.directionOps}
      </p>

      <DocStamp label={ONE_SECURITY.directionOps} />
    </A4Page>
  );
}
