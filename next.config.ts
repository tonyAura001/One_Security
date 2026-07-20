import type { NextConfig } from "next";

/**
 * En-têtes de sécurité (défense en profondeur) appliqués à toutes les routes.
 * Pas de CSP stricte ici : l'app s'appuie sur des styles/scripts inline (Next +
 * Tailwind) qu'une CSP mal calibrée casserait ; l'autorisation reste imposée
 * côté Supabase (RLS) et par la vérification de session (proxy).
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
