import {
  AppShell,
  AppShellBrand,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderInner,
  AppShellLayout,
  AppShellMain,
  AppShellNav,
  AppShellSidebar,
  AppShellSidebarFooter,
  Avatar,
  AvatarFallback,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  NotifyMarkIcon,
  SidebarNavItem,
  SidebarNavLabel,
  Switch,
} from "@notify/ui";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Pin,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";

type WorkspaceNavId =
  | "dashboard"
  | "apps"
  | "ingress"
  | "analytics"
  | "subscription"
  | "security"
  | "settings";

type WorkspaceRoute =
  | "/dashboard"
  | "/apps"
  | "/ingress"
  | "/analytics"
  | "/subscription"
  | "/security"
  | "/settings";

type WorkspaceNavItem = {
  href: WorkspaceRoute;
  icon: LucideIcon;
  id: WorkspaceNavId;
  label: string;
};

const workspaceNavItems: WorkspaceNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "apps", label: "Notification apps", href: "/apps", icon: BellRing },
  { id: "ingress", label: "Ingress", href: "/ingress", icon: RadioTower },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { id: "subscription", label: "Subscription", href: "/subscription", icon: CreditCard },
  { id: "security", label: "Security", href: "/security", icon: ShieldCheck },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

function WorkspaceShell({
  activeItem,
  children,
}: Readonly<{ activeItem: WorkspaceNavId; children: ReactNode }>) {
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;

  return (
    <AppShell>
      <AppShellLayout collapsed={!sidebarPinned}>
        <WorkspaceSidebar
          activeItem={activeItem}
          expanded={sidebarExpanded}
          onHoveredChange={setSidebarHovered}
          onPinnedChange={setSidebarPinned}
          pinned={sidebarPinned}
        />

        <AppShellMain>
          <WorkspaceHeader />
          <AppShellContent>{children}</AppShellContent>
        </AppShellMain>
      </AppShellLayout>
    </AppShell>
  );
}

function WorkspacePageHeader({
  actions,
  badges,
  description,
  title,
}: Readonly<{
  actions?: ReactNode;
  badges?: ReactNode;
  description: string;
  title: string;
}>) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        <h1 className="mt-3 font-semibold text-3xl tracking-normal">{title}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function WorkspaceSidebar({
  activeItem,
  expanded,
  onHoveredChange,
  onPinnedChange,
  pinned,
}: Readonly<{
  activeItem: WorkspaceNavId;
  expanded: boolean;
  onHoveredChange: (hovered: boolean) => void;
  onPinnedChange: (pinned: boolean) => void;
  pinned: boolean;
}>) {
  return (
    <AppShellSidebar
      className={!pinned && expanded ? "shadow-xl shadow-foreground/10" : undefined}
      collapsed={!pinned}
      expanded={expanded}
      onMouseEnter={() => {
        if (!pinned) {
          onHoveredChange(true);
        }
      }}
      onMouseLeave={() => {
        if (!pinned) {
          onHoveredChange(false);
        }
      }}
    >
      <AppShellBrand className="relative px-6">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm border bg-foreground text-background">
          <NotifyMarkIcon className="size-4" />
        </span>
        <div
          className={
            expanded
              ? "-translate-y-1/2 absolute top-1/2 right-14 left-[68px] min-w-0 overflow-hidden opacity-100 transition-opacity duration-200 ease-out"
              : "-translate-y-1/2 absolute top-1/2 right-14 left-[68px] min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 ease-out"
          }
        >
          <p className="font-semibold">Notify</p>
          <p className="text-muted-foreground text-xs whitespace-nowrap">Acme workspace</p>
        </div>
        <div className="-translate-y-1/2 absolute top-1/2 right-4 grid size-8 place-items-center">
          {pinned ? (
            <Button
              aria-label="Collapse sidebar"
              className="size-8 shrink-0"
              onClick={() => onPinnedChange(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          ) : expanded ? (
            <Button
              aria-label="Pin sidebar open"
              className="size-8 shrink-0"
              onClick={() => {
                onPinnedChange(true);
                onHoveredChange(false);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Pin className="size-4" />
            </Button>
          ) : null}
        </div>
      </AppShellBrand>

      <AppShellNav>
        {workspaceNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <SidebarNavItem
              active={activeItem === item.id}
              asChild
              collapsed={!expanded}
              key={item.id}
            >
              <Link aria-label={expanded ? undefined : item.label} to={item.href}>
                <Icon className="size-4" />
                <SidebarNavLabel>{item.label}</SidebarNavLabel>
              </Link>
            </SidebarNavItem>
          );
        })}
      </AppShellNav>

      <AppShellSidebarFooter>
        <WorkspaceSidebarFooterControls expanded={expanded} />
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );
}

function WorkspaceThemeButton({
  className,
  label,
}: Readonly<{ className?: string; label?: "full" | "short" }>) {
  const switchId = useId();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("notify-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function setThemeMode(nextTheme: "dark" | "light") {
    setTheme(nextTheme);
    window.localStorage.setItem("notify-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  const nextThemeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  const isDark = theme === "dark";
  const visibleLabel = isDark ? "Dark mode" : "Light mode";
  const shortLabel = isDark ? "Dark" : "Light";

  return (
    <div
      className={cn(
        "h-9 items-center gap-2 rounded-full border border-border/70 bg-background px-3 shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/30 hover:bg-secondary/60 hover:shadow-md",
        className,
      )}
    >
      <Switch
        aria-label={nextThemeLabel}
        checked={isDark}
        id={switchId}
        onCheckedChange={(checked) => setThemeMode(checked ? "dark" : "light")}
      />
      <label className="cursor-pointer font-medium text-sm" htmlFor={switchId}>
        {label === "full" ? visibleLabel : shortLabel}
      </label>
    </div>
  );
}

function WorkspaceSidebarFooterControls({ expanded }: Readonly<{ expanded: boolean }>) {
  return (
    <div className={expanded ? "grid gap-2" : "grid justify-items-center gap-2"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open user menu"
            className={
              expanded
                ? "h-12 w-full justify-start gap-3 rounded-sm border bg-secondary/40 px-2 hover:bg-secondary"
                : "size-10 px-0"
            }
            variant={expanded ? "outline" : "ghost"}
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground">CS</AvatarFallback>
            </Avatar>
            {expanded ? (
              <span className="min-w-0 text-left">
                <span className="block truncate font-medium text-sm leading-none">
                  Chatar Singh
                </span>
                <span className="mt-1 block truncate text-muted-foreground text-xs leading-none">
                  Acme workspace
                </span>
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" side="right">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">CS</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">Chatar Singh</p>
                <p className="truncate text-muted-foreground text-xs">chatar@acme.com</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserRound />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        aria-label={expanded ? undefined : "Sign out"}
        className={
          expanded
            ? "w-full justify-start text-muted-foreground hover:text-destructive"
            : "size-10 px-0 text-muted-foreground hover:text-destructive"
        }
        variant="ghost"
      >
        <LogOut />
        {expanded ? "Sign out" : null}
      </Button>
    </div>
  );
}

function WorkspaceHeader() {
  return (
    <AppShellHeader>
      <AppShellHeaderInner>
        <div className="relative flex-1 md:max-w-md">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search apps, recipients, events" />
        </div>
        <WorkspaceThemeButton className="hidden md:inline-flex" label="short" />
      </AppShellHeaderInner>
    </AppShellHeader>
  );
}

export type { WorkspaceNavId };
export { WorkspacePageHeader, WorkspaceShell, workspaceNavItems };
