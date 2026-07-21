"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/lib/store/session";
import { screenMeta, isScreenKey, type ScreenKey } from "@/lib/rbac";

const FR_DATE = "Vendredi 4 juillet 2026";

/** Écrans réutilisés du kit qui portent DÉJÀ leur propre `.page-header`. */
// Écrans qui portent DÉJÀ leur propre titre riche → pas de doublon avec le shell.
const OWN_HEADER: ScreenKey[] = [
  "bibliotheque",
  "notes",
  "recrutement",
  "taches",
  "pointage",
  "presences",
  "planning",
  "paie",
  "approbation",
  "satisfaction",
  "contrattravail",
];

/**
 * En-tête de contenu : titre d'écran + fil d'Ariane, dérivé du RBAC.
 * (La Topbar du kit ne porte pas le titre de page ; on le rend ici.)
 */
export function PageTitleBar() {
  const pathname = usePathname();
  const { role } = useSession();
  const seg = pathname.split("/")[1] ?? "";
  const screen: ScreenKey = isScreenKey(seg) ? seg : "home";
  const isDashboard = screen === "dashboard";
  const meta = screenMeta(role, screen);

  // Ces écrans (réutilisés du kit) affichent leur propre en-tête → pas de doublon.
  if (OWN_HEADER.includes(screen)) return null;

  return (
    <div className="mb-5">
      {isDashboard ? (
        <>
          <div className="flex items-center gap-2.5">
            <h1 className="text-text-primary text-xl font-semibold tracking-tight">
              {meta.title}
            </h1>
            <span className="bg-blue/10 text-2xs text-blue inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold">
              <span className="pp-live-dot" />
              Temps réel
            </span>
          </div>
          <p className="text-text-muted mt-0.5 text-sm">
            {FR_DATE} · Vue consolidée multi-sites
          </p>
        </>
      ) : (
        <>
          <p className="text-2xs text-text-muted font-semibold tracking-wider uppercase">
            {meta.crumb}
          </p>
          <h1 className="text-text-primary mt-0.5 text-xl font-semibold tracking-tight">
            {meta.title}
          </h1>
        </>
      )}
    </div>
  );
}
