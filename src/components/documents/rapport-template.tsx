import { A4Page, DocHeader, DocStamp } from "@/components/documents/doc-chrome";
import { RichTextView } from "@/components/documents/rich-text-editor";
import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";
import { type RapportData } from "@/lib/documents/types";

export function RapportTemplate({
  data,
  dateLabel,
}: {
  data: RapportData;
  dateLabel: string;
}) {
  return (
    <A4Page>
      <DocHeader />

      {/* Émetteur + date */}
      <p
        className="text-right font-bold"
        style={{ fontSize: 11.5, lineHeight: 1.5, color: OS_COLORS.navy }}
      >
        ONE SECURITY Direction des Opérations — Dakar, le {dateLabel}
      </p>

      {/* Destinataire */}
      <p className="mt-4" style={{ fontSize: 12.5 }}>
        À l&apos;attention de {data.destinataire}
      </p>

      {/* Objet */}
      <p className="mt-4" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
        <span className="font-bold" style={{ color: OS_COLORS.navy }}>
          OBJET :{" "}
        </span>
        {data.objet}
      </p>

      {/* Corps */}
      <div className="mt-4">
        <RichTextView html={data.corps} />
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
