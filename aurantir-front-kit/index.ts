/**
 * Aurantir Front Kit — barrel exports (composants + layout + utils).
 * ────────────────────────────────────────────────────────────
 * Import simplifié depuis le projet cible :
 *   import { Button, Card, StatCard, Badge, DashboardShell } from '@/aurantir-front-kit'
 *
 * Les ÉCRANS (screens/) ne sont pas ré-exportés ici : importez-les par chemin
 * direct, ex. `import TresoreriePage from '@/aurantir-front-kit/screens/dashboard/finance/tresorerie/page'`.
 */

// ── UI ──────────────────────────────────────────────────────
export { Button } from './components/ui/Button'
export { Card, StatCard } from './components/ui/Card'
export {
  Badge,
  StatutFactureBadge,
  TypeFactureBadge,
  StatutDevisBadge,
  StatutProjetBadge,
  RoleBadge,
  EntiteBadge,
} from './components/ui/Badge'
export { Input, TextArea, Select } from './components/ui/Input'
export { Pagination } from './components/ui/Pagination'
export { RevenusChart } from './components/ui/RevenusChart'
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './components/ui/DropdownMenu'

// ── Shared ──────────────────────────────────────────────────
export { ActionsMenu } from './components/shared/ActionsMenu'

// ── Layout / shell ──────────────────────────────────────────
export { DashboardShell } from './layout/DashboardShell'
export type { DashboardShellProps } from './layout/DashboardShell'
export { Sidebar } from './components/shared/Sidebar'
export { Topbar } from './components/shared/Topbar'

// ── Hooks ───────────────────────────────────────────────────
export { useTheme } from './hooks/useTheme'
export { useAppStore } from './lib/store/app.store'

// ── Utils ───────────────────────────────────────────────────
export {
  cn,
  formatNumber,
  formatMontant,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatShortTime,
  joursRestants,
  truncate,
  initiales,
  slugify,
  pourcentage,
  variationPct,
  groupBy,
  debounce,
  exportToCSV,
  ENTITE_COLORS,
} from './lib/utils'
