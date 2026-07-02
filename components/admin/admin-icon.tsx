import {
  LayoutDashboard,
  FileHeart,
  Users,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  Stethoscope,
  Building2,
  ClipboardCheck,
  KanbanSquare,
  Building,
  Wallet,
  Undo2,
  Bell,
  Sparkles,
  Globe2,
  UserCog,
  History,
  Activity,
  Circle,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileHeart,
  Users,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  Stethoscope,
  Building2,
  ClipboardCheck,
  KanbanSquare,
  Building,
  Wallet,
  Undo2,
  Bell,
  Sparkles,
  Globe2,
  UserCog,
  History,
  Activity,
}

export function AdminIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Circle
  return <Icon className={className} />
}
