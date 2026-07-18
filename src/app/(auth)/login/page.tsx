import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

/** N'autorise que des chemins internes pour la cible de redirection. */
function safeRedirect(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-4">
      <LoginForm redirectTo={safeRedirect(redirect)} />
    </div>
  );
}
