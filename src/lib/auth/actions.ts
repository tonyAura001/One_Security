"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions d'authentification.
 *
 * Les identifiants sont traités exclusivement côté serveur (jamais exposés au
 * bundle client), et `signInWithPassword` écrit la session dans des cookies
 * httpOnly via le client serveur Supabase.
 *
 * Inscription : volontairement absente. Le modèle retenu est « sur invitation /
 * admin » — les comptes sont créés côté back-office (voir docs/AUTH.md). Aucun
 * self-signup public n'est exposé.
 */

const loginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
}

/** N'autorise que des chemins internes (anti open-redirect). */
function safeRedirect(raw: FormDataEntryValue | null): string {
  if (
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//")
  ) {
    return raw;
  }
  return "/dashboard";
}

export async function login(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { email: f.email?.[0], password: f.password?.[0] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Message générique volontaire : on ne révèle pas si l'email existe.
    return { error: "Email ou mot de passe incorrect." };
  }

  // `redirect` lève un signal de contrôle : hors de tout try/catch.
  redirect(safeRedirect(formData.get("redirect")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
