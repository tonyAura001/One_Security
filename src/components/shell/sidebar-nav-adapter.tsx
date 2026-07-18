import type { NavItem } from "@/aurantir-front-kit/components/shared/Sidebar";
import type { MenuItem } from "@/lib/rbac";
import { ICONS } from "@/lib/icons";

const STROKE = 1.5;

/** Href du groupe (rail replié) = 1re feuille descendante. */
function firstLeafHref(item: MenuItem): string {
  if (item.key) return `/${item.key}`;
  for (const child of item.children ?? []) {
    const h = firstLeafHref(child);
    if (h !== "#") return h;
  }
  return "#";
}

function toNavItem(item: MenuItem, top: boolean): NavItem {
  const Icon = ICONS[item.icon];
  return {
    href: item.key ? `/${item.key}` : firstLeafHref(item),
    label: item.label,
    icon: <Icon size={top ? 16 : 14} strokeWidth={STROKE} />,
    children: item.children?.map((child) => toNavItem(child, false)),
  };
}

/**
 * Adaptateur : convertit le menu RBAC PilotePME (arbre, avec groupes) en
 * `NavItem[]` du kit Aurantir — les groupes (sans `key`) deviennent des
 * accordéons dépliables (rendu du kit inchangé) ; en rail replié, le groupe
 * pointe vers sa 1re feuille. Icônes lucide trait fin (16px / 14px enfants).
 */
export function buildSidebarNav(menu: MenuItem[]): NavItem[] {
  return menu.map((item) => toNavItem(item, true));
}
