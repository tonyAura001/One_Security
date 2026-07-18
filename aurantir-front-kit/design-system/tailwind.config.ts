import type { Config } from "tailwindcss";

/**
 * Design system Aurantir — bloc `theme.extend` autonome.
 * ────────────────────────────────────────────────────────────
 * À FUSIONNER dans le tailwind.config.ts du projet cible (ou l'utiliser tel
 * quel). Les couleurs référencent les variables CSS définies dans
 * `design-system/globals.css` (format RGB décomposé → opacité Tailwind).
 *
 * `content` inclut le dossier du kit pour que les classes utilisées par les
 * composants/écrans copiés soient bien générées. Ajustez selon votre repo.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./aurantir-front-kit/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "rgb(var(--rgb-bg-primary) / <alpha-value>)",
          secondary: "rgb(var(--rgb-bg-secondary) / <alpha-value>)",
          elevated: "rgb(var(--rgb-bg-elevated) / <alpha-value>)",
          overlay: "rgb(var(--rgb-bg-overlay) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--rgb-surface) / <alpha-value>)",
          hover: "rgb(var(--rgb-surface-hover) / <alpha-value>)",
          active: "rgb(var(--rgb-surface-active) / <alpha-value>)",
          border: "rgb(var(--rgb-surface-border) / <alpha-value>)",
          "border-hover": "rgb(var(--rgb-surface-border-hover) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--rgb-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--rgb-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--rgb-text-muted) / <alpha-value>)",
          disabled: "rgb(var(--rgb-text-disabled) / <alpha-value>)",
          inverse: "rgb(var(--rgb-text-inverse) / <alpha-value>)",
        },
        // Couleurs de marque d'origine — À ADAPTER pour votre SaaS sécurité.
        sama: {
          green: "#AEB8AE",
          black: "#111111",
          white: "#F5F4F1",
          gray: "#7D847D",
        },
        aurantir: {
          dark: "#0B0F19",
          blue: "#2D6BFF",
          gray: "#A0A7B4",
          "gray-dark": "#1C2230",
          "gray-darker": "#2A3345",
        },
        blue: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          light: "#60A5FA",
          dark: "#1D4ED8",
          glow: "rgba(59, 130, 246, 0.15)",
        },
        green: {
          DEFAULT: "#10B981",
          hover: "#059669",
          light: "#34D399",
          dark: "#047857",
          glow: "rgba(16, 185, 129, 0.15)",
        },
        violet: {
          DEFAULT: "#8B5CF6",
          hover: "#7C3AED",
          light: "#A78BFA",
          glow: "rgba(139, 92, 246, 0.15)",
        },
        amber: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          light: "#FCD34D",
        },
        red: {
          DEFAULT: "#EF4444",
          hover: "#DC2626",
          light: "#FCA5A5",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        // Ajouté au kit : `text-2xs` est utilisé par le shell (Sidebar/Topbar)
        // et certains badges. Absent du config d'origine (no-op) → fixé ici.
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "sidebar": "16rem",
        "sidebar-collapsed": "4.5rem",
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      transitionTimingFunction: {
        // Ajouté au kit : `ease-smooth` est utilisé par le shell (transitions
        // sidebar/topbar). Absent du config d'origine (no-op) → fixé ici.
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(59, 130, 246, 0.05)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.15)",
        "glow-violet": "0 0 20px rgba(139, 92, 246, 0.15)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.5)",
        "elevated": "0 8px 32px rgba(0,0,0,0.6)",
        "dropdown": "0 16px 48px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-blue": "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-up": "fadeUp 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
