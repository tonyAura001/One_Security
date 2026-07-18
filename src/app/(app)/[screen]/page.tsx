import { notFound } from "next/navigation";
import { isScreenKey } from "@/lib/rbac";
import { ScreenRenderer } from "@/components/screens/registry";

/**
 * Route unique de l'app : chaque écran est rendu via le registry selon sa clé.
 * Le rendu est dynamique (le layout authentifié lit les cookies de session),
 * donc pas de génération statique ici ; on valide simplement la clé d'écran.
 */
export default async function ScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!isScreenKey(screen)) notFound();
  return <ScreenRenderer screenKey={screen} />;
}
