"use client";

import { useActionState } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/aurantir-front-kit/components/ui/Button";
import { Input } from "@/aurantir-front-kit/components/ui/Input";
import { siteConfig } from "@/config/site";

/**
 * Formulaire de connexion. Le rendu s'appuie sur les composants du kit
 * Aurantir (Button/Input) pour rester sur le même design system que l'app ;
 * l'authentification passe par la Server Action `login` (Supabase, cookies
 * httpOnly). Aucun identifiant ne transite côté client.
 */
export function LoginForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState<
    LoginState | undefined,
    FormData
  >(login, undefined);

  return (
    <div className="border-surface-border bg-background-elevated w-full max-w-sm rounded-2xl border p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="bg-blue mb-3 flex size-12 items-center justify-center rounded-xl text-white">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-text-primary text-xl font-extrabold tracking-tight">
          {siteConfig.name}
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          Connectez-vous à votre espace de pilotage.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />

        {state?.error ? (
          <div
            role="alert"
            className="border-red/30 bg-red/10 text-red flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </div>
        ) : null}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="vous@entreprise.sn"
          error={state?.fieldErrors?.email}
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          autoComplete="current-password"
          error={state?.fieldErrors?.password}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          className="w-full"
        >
          Se connecter
        </Button>
      </form>
    </div>
  );
}
