import { notFound } from "next/navigation";
import { allProjectIds, getProject } from "@/lib/api/projects";
import { ProjectDetail } from "@/components/screens/projets/detail";

/** Prérendu d'une route par déploiement. */
export function generateStaticParams() {
  return allProjectIds().map((id) => ({ id }));
}

export const dynamicParams = false;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getProject(id)) notFound();
  return <ProjectDetail id={id} />;
}
