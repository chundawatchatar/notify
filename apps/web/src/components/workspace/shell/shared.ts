import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  CreditCard,
  LayoutDashboard,
  RadioTower,
  Settings,
  ShieldCheck,
} from "lucide-react";

type WorkspaceNavId =
  | "dashboard"
  | "apps"
  | "ingress"
  | "analytics"
  | "subscription"
  | "security"
  | "settings";

type WorkspaceNavItem = {
  icon: LucideIcon;
  id: WorkspaceNavId;
  label: string;
};

const workspaceNavItems: WorkspaceNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "apps", label: "Notification apps", icon: BellRing },
  { id: "ingress", label: "Ingress", icon: RadioTower },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

export type { WorkspaceNavId, WorkspaceNavItem };
export { workspaceNavItems };
