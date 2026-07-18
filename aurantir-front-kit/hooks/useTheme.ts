'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'

/**
 * Hook de thème clair/sombre.
 * ────────────────────────────────────────────────────────────
 * Le thème est persisté dans le store Zustand (localStorage). Ce hook
 * synchronise l'attribut <html data-theme="..."> et expose un toggle.
 *
 * Le thème par défaut est défini dans lib/store/app.store.ts (`theme: 'sombre'`).
 * Pour un défaut CLAIR dans le projet cible, voir MANIFEST.md.
 */
export function useTheme() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => setTheme(theme === 'sombre' ? 'clair' : 'sombre')

  return { theme, setTheme, toggle, isDark: theme === 'sombre' }
}
