import localFont from 'next/font/local'

/**
 * Config des polices — à importer depuis votre `app/layout.tsx`.
 * ────────────────────────────────────────────────────────────
 * Le design system utilise DEUX sources :
 *   1. `Inter` (Google Fonts) → chargée via @import dans globals.css et
 *      référencée par la classe `font-sans` (police d'interface principale).
 *   2. `Geist` (fichiers .woff locaux, ci-dessous) → exposée en variable CSS
 *      `--font-inter`, conservée à l'identique du projet d'origine.
 *
 * Usage dans app/layout.tsx :
 *   import { appFont } from '@/aurantir-front-kit/design-system/fonts'
 *   <body className={`${appFont.variable} font-sans antialiased`}>
 */
export const appFont = localFont({
  src: [
    { path: './fonts/GeistVF.woff', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
})

export const appMonoFont = localFont({
  src: [
    { path: './fonts/GeistMonoVF.woff', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
})
