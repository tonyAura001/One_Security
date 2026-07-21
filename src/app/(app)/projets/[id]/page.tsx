import { ProjectDetail } from "@/components/screens/projets/detail";

/**
 * Détail d'un déploiement. Route dynamique : l'id vient de la base (Supabase),
 * pas d'une génération statique. Le composant client charge le projet et gère
 * lui-même l'état « introuvable ».
 */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}
