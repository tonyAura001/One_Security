"use client";

import type { ReactNode } from "react";

import { OS_COLORS } from "@/lib/one-security";
import { useCompanyIdentity } from "@/lib/documents/use-identity";
import type { CompanyIdentity } from "@/lib/supabase/data/parametres";

/**
 * Chrome partagé des documents A4 (en-tête, pied, cachet, page).
 * L'identité (nom, adresse, RCCM…), le LOGO, les COULEURS de marque et la
 * SIGNATURE du dirigeant proviennent de `useCompanyIdentity` : défauts du code
 * surchargés par les réglages éditables dans Paramètres (table Parametre).
 * Sans logo uploadé, la marque « ONE » est recréée en CSS/texte.
 */

/** Marque « ONE » réutilisée dans le logo et le cachet (accent = couleur marque). */
function OneMark({ size = 22, accent }: { size?: number; accent: string }) {
  return (
    <span
      className="font-black leading-none tracking-tight"
      style={{ fontSize: size, color: "#ffffff" }}
    >
      O<span style={{ color: accent }}>N</span>E
    </span>
  );
}

/** Bloc logo : image uploadée, sinon carré marine arrondi + barre or fine. */
function LogoBlock({ os }: { os: CompanyIdentity }) {
  if (os.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={os.logo}
        alt={os.name}
        style={{ maxWidth: 150, maxHeight: 72, objectFit: "contain" }}
      />
    );
  }
  return (
    <div className="flex flex-col items-start">
      <div
        className="flex flex-col items-center justify-center rounded-xl shadow-sm"
        style={{
          width: 64,
          height: 64,
          background: os.couleurPrincipale,
          border: `1px solid ${OS_COLORS.navyDark}`,
        }}
      >
        <OneMark size={22} accent={os.couleurAccent} />
        <span
          className="mt-0.5 font-semibold uppercase leading-none"
          style={{ fontSize: 5.5, letterSpacing: 0.5, color: OS_COLORS.grey }}
        >
          One Security
        </span>
      </div>
      <div
        className="mt-1 rounded-full"
        style={{ width: 64, height: 3, background: os.couleurAccent }}
      />
    </div>
  );
}

/** Page A4 blanche, marges d'impression. */
export function A4Page({ children }: { children: ReactNode }) {
  return (
    <div
      data-doc-page
      className="mx-auto flex flex-col bg-white text-[#222]"
      style={{ width: "210mm", minHeight: "297mm", padding: "16mm 15mm" }}
    >
      {children}
    </div>
  );
}

/** En-tête / papier à en-tête. */
export function DocHeader() {
  const os = useCompanyIdentity();
  return (
    <header className="mb-6 flex items-start justify-between">
      <LogoBlock os={os} />
      <div className="text-right">
        <div
          className="font-bold leading-tight"
          style={{ fontSize: 18, color: os.couleurPrincipale }}
        >
          {os.name}
        </div>
        <div className="mt-1" style={{ fontSize: 9, color: "#6b7280" }}>
          {os.activites}
        </div>
        <div
          className="mt-0.5 italic"
          style={{ fontSize: 9, color: os.couleurAccent }}
        >
          {os.slogan}
        </div>
      </div>
    </header>
  );
}

/** Pied de page : bandeau marine avec mentions légales. */
export function DocFooter() {
  const os = useCompanyIdentity();
  return (
    <footer
      className="mt-6 rounded-lg px-4 py-2 text-center text-white/80"
      style={{ background: os.couleurPrincipale, fontSize: 8.5, lineHeight: 1.5 }}
    >
      <div>
        {os.name} au capital de {os.capital} | RCCM : {os.rccm} | Ninéa : {os.ninea}
      </div>
      <div>
        {os.adresse} | Tél : {os.tel} | Email : {os.email} | {os.web}
      </div>
      {os.mentionsLegales ? (
        <div className="mt-0.5 opacity-90">{os.mentionsLegales}</div>
      ) : null}
    </footer>
  );
}

/** Zone signature + cachet rond façon tampon caoutchouc. */
export function DocStamp({ label }: { label?: string }) {
  const os = useCompanyIdentity();
  return (
    <div className="mt-8 flex flex-col items-end">
      <div
        className="pb-0.5 font-bold"
        style={{
          fontSize: 12,
          color: os.couleurPrincipale,
          borderBottom: `2px solid ${os.couleurAccent}`,
        }}
      >
        {label ?? os.comptabilite}
      </div>
      <div
        className="mt-3 flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: 110,
          height: 110,
          border: `2px solid ${os.couleurPrincipale}`,
          color: os.couleurPrincipale,
          opacity: 0.85,
          transform: "rotate(-8deg)",
        }}
      >
        <span
          className="font-bold uppercase"
          style={{ fontSize: 8, letterSpacing: 1 }}
        >
          One Security
        </span>
        <div className="my-0.5">
          <OneMarkNavy navy={os.couleurPrincipale} accent={os.couleurAccent} />
        </div>
        <span style={{ fontSize: 6.5, lineHeight: 1.3 }}>
          RC : {os.rccm}
        </span>
        <span className="mt-0.5 uppercase" style={{ fontSize: 6 }}>
          Suarl · Dakar
        </span>
      </div>
    </div>
  );
}

/**
 * Bloc signature apposé sur un document (nom + fonction + date + tracé).
 * À défaut de signature propre au document, on retombe sur la signature du
 * dirigeant enregistrée dans Paramètres (apposée automatiquement partout).
 */
export function DocSignatureBlock({
  signature,
}: {
  signature?: { signataire: string; fonction: string; date: string; image: string };
}) {
  const os = useCompanyIdentity();
  const own = signature && (signature.signataire || signature.image || signature.date);
  const sig = own
    ? signature
    : os.signature.image || os.signature.signataire
      ? {
          signataire: os.signature.signataire,
          fonction: os.signature.fonction,
          date: "",
          image: os.signature.image,
        }
      : undefined;
  if (!sig) return null;
  const d = sig.date
    ? new Date(sig.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";
  return (
    <div className="mt-6 flex flex-col items-end">
      <div style={{ fontSize: 10.5, color: os.couleurPrincipale }} className="font-semibold">
        {d ? `Fait à Dakar, le ${d}` : ""}
      </div>
      {sig.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sig.image}
          alt="Signature"
          style={{ width: 170, height: 58, objectFit: "contain" }}
        />
      ) : (
        <div style={{ height: 40 }} />
      )}
      <div
        className="pt-1 font-bold"
        style={{
          fontSize: 11.5,
          color: os.couleurPrincipale,
          borderTop: `2px solid ${os.couleurAccent}`,
          minWidth: 170,
          textAlign: "center",
        }}
      >
        {sig.signataire || "—"}
      </div>
      {sig.fonction && (
        <div className="text-center" style={{ fontSize: 9.5, color: os.couleurPrincipale, opacity: 0.75 }}>
          {sig.fonction}
        </div>
      )}
    </div>
  );
}

/** Variante marine de la marque « ONE » pour le cachet. */
function OneMarkNavy({ navy, accent }: { navy: string; accent: string }) {
  return (
    <span
      className="font-black leading-none tracking-tight"
      style={{ fontSize: 16, color: navy }}
    >
      O<span style={{ color: accent }}>N</span>E
    </span>
  );
}
