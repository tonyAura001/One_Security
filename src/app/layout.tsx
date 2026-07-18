import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PilotePME × Aurantir — Gestion pour sociétés de sécurité privée",
  description:
    "PilotePME · SaaS de gestion tout-en-un pour les sociétés de sécurité privée à Dakar : supervision terrain, finance, paie, CRM, recrutement et point de vente.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d14" },
  ],
};

/**
 * Blocking script: stamps data-theme on <html> before first paint so the
 * correct theme surface is painted immediately (no FOUC). Défaut = CLAIR.
 * Le thème est persisté par le store Zustand du kit (clé `sama-digital-app`,
 * valeurs "clair"/"sombre").
 */
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('sama-digital-app')||'{}');var t=(s&&s.state&&s.state.theme)||'clair';if(t!=='clair'&&t!=='sombre')t='clair';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','clair');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      data-theme="clair"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
