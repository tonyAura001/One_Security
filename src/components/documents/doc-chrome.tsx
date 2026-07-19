import type { ReactNode } from "react";

import { ONE_SECURITY, OS_COLORS } from "@/lib/one-security";

/**
 * Chrome partagé des documents A4 (en-tête, pied, cachet, page).
 * Composants purement présentationnels — aucun hook, donc pas de "use client".
 * Le logo est recréé en CSS/texte (aucun fichier image disponible).
 */

/** Marque « ONE » réutilisée dans le logo et le cachet. */
function OneMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="font-black leading-none tracking-tight"
      style={{ fontSize: size, color: "#ffffff" }}
    >
      O<span style={{ color: OS_COLORS.goldLight }}>N</span>E
    </span>
  );
}

/** Bloc logo : carré marine arrondi + barre or fine. */
function LogoBlock() {
  return (
    <div className="flex flex-col items-start">
      <div
        className="flex flex-col items-center justify-center rounded-xl shadow-sm"
        style={{
          width: 64,
          height: 64,
          background: OS_COLORS.navy,
          border: `1px solid ${OS_COLORS.navyDark}`,
        }}
      >
        <OneMark size={22} />
        <span
          className="mt-0.5 font-semibold uppercase leading-none"
          style={{ fontSize: 5.5, letterSpacing: 0.5, color: OS_COLORS.grey }}
        >
          One Security
        </span>
      </div>
      <div
        className="mt-1 rounded-full"
        style={{ width: 64, height: 3, background: OS_COLORS.gold }}
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
  return (
    <header className="mb-6 flex items-start justify-between">
      <LogoBlock />
      <div className="text-right">
        <div
          className="font-bold leading-tight"
          style={{ fontSize: 18, color: OS_COLORS.navy }}
        >
          {ONE_SECURITY.name}
        </div>
        <div className="mt-1" style={{ fontSize: 9, color: "#6b7280" }}>
          {ONE_SECURITY.activites}
        </div>
        <div
          className="mt-0.5 italic"
          style={{ fontSize: 9, color: OS_COLORS.gold }}
        >
          {ONE_SECURITY.slogan}
        </div>
      </div>
    </header>
  );
}

/** Pied de page : bandeau marine avec mentions légales. */
export function DocFooter() {
  return (
    <footer
      className="mt-6 rounded-lg px-4 py-2 text-center text-white/80"
      style={{ background: OS_COLORS.navy, fontSize: 8.5, lineHeight: 1.5 }}
    >
      <div>
        {ONE_SECURITY.name} au capital de {ONE_SECURITY.capital} | RCCM :{" "}
        {ONE_SECURITY.rccm} | Ninéa : {ONE_SECURITY.ninea}
      </div>
      <div>
        {ONE_SECURITY.adresse} | Tél : {ONE_SECURITY.tel} | Email :{" "}
        {ONE_SECURITY.email} | {ONE_SECURITY.web}
      </div>
    </footer>
  );
}

/** Zone signature + cachet rond façon tampon caoutchouc. */
export function DocStamp({ label }: { label?: string }) {
  return (
    <div className="mt-8 flex flex-col items-end">
      <div
        className="pb-0.5 font-bold"
        style={{
          fontSize: 12,
          color: OS_COLORS.navy,
          borderBottom: `2px solid ${OS_COLORS.gold}`,
        }}
      >
        {label ?? ONE_SECURITY.comptabilite}
      </div>
      <div
        className="mt-3 flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: 110,
          height: 110,
          border: `2px solid ${OS_COLORS.navy}`,
          color: OS_COLORS.navy,
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
          <OneMarkNavy />
        </div>
        <span style={{ fontSize: 6.5, lineHeight: 1.3 }}>
          RC : {ONE_SECURITY.rccm}
        </span>
        <span className="mt-0.5 uppercase" style={{ fontSize: 6 }}>
          Suarl · Dakar
        </span>
      </div>
    </div>
  );
}

/** Variante marine de la marque « ONE » pour le cachet. */
function OneMarkNavy() {
  return (
    <span
      className="font-black leading-none tracking-tight"
      style={{ fontSize: 16, color: OS_COLORS.navy }}
    >
      O<span style={{ color: OS_COLORS.gold }}>N</span>E
    </span>
  );
}
