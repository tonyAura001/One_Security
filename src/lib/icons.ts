import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  StickyNote,
  Gavel,
  Hammer,
  Layers,
  LayoutGrid,
  LineChart,
  ListChecks,
  Lock,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  PenLine,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Named icon keys used across RBAC config → lucide components. */
export type IconName =
  | "grid"
  | "pin"
  | "receipt"
  | "users"
  | "calendar"
  | "cash"
  | "userplus"
  | "bag"
  | "list"
  | "chart"
  | "gear"
  | "bell"
  | "doc"
  | "alert"
  | "check"
  | "upload"
  | "shield"
  | "wrench"
  | "tools"
  | "box"
  | "lock"
  | "edit"
  | "report"
  | "building"
  | "database"
  | "book"
  | "note"
  | "message"
  | "sparkles"
  | "gavel"
  | "megaphone"
  | "analytics"
  | "layers";

export const ICONS: Record<IconName, LucideIcon> = {
  grid: LayoutGrid,
  pin: MapPin,
  receipt: ReceiptText,
  users: Users,
  calendar: Calendar,
  cash: Banknote,
  userplus: UserPlus,
  bag: ShoppingBag,
  list: ListChecks,
  chart: BarChart3,
  gear: Settings,
  bell: Bell,
  doc: FileText,
  alert: AlertTriangle,
  check: CheckCircle2,
  upload: Upload,
  shield: ShieldCheck,
  wrench: Wrench,
  tools: Hammer,
  box: Package,
  lock: Lock,
  edit: PenLine,
  report: ClipboardList,
  building: Building2,
  database: Database,
  book: BookOpen,
  note: StickyNote,
  message: MessageSquare,
  sparkles: Sparkles,
  gavel: Gavel,
  megaphone: Megaphone,
  analytics: LineChart,
  layers: Layers,
};
