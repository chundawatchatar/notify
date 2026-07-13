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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SidebarNavIcon,
  SidebarNavItem,
  SidebarNavLabel,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notify/ui";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
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

type ThemeMode = "light" | "dark";

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
  const { setThemeMode, theme } = useWorkspaceTheme();
  const sidebarExpanded = sidebarPinned || sidebarHovered;

  return (
    <TooltipProvider delayDuration={300}>
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
            <WorkspaceHeader activeItem={activeItem} onThemeChange={setThemeMode} theme={theme} />
            <AppShellContent>{children}</AppShellContent>
          </AppShellMain>
        </AppShellLayout>
      </AppShell>
    </TooltipProvider>
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
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Collapse sidebar
              </TooltipContent>
            </Tooltip>
          ) : expanded ? (
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Pin sidebar open
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </AppShellBrand>

      <WorkspaceNavigation activeItem={activeItem} expanded={expanded} />

      <AppShellSidebarFooter>
        <WorkspaceSidebarFooterControls expanded={expanded} />
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );
}

function WorkspaceNavigation({
  activeItem,
  expanded,
  onNavigate,
}: Readonly<{
  activeItem: WorkspaceNavId;
  expanded: boolean;
  onNavigate?: () => void;
}>) {
  return (
    <AppShellNav className="py-3">
      {workspaceNavItems.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item.id;

        return (
          <SidebarNavItem active={active} asChild collapsed={!expanded} key={item.id}>
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={expanded ? undefined : item.label}
              onClick={onNavigate}
              to={item.href}
            >
              <SidebarNavIcon>
                <Icon />
              </SidebarNavIcon>
              <SidebarNavLabel>{item.label}</SidebarNavLabel>
            </Link>
          </SidebarNavItem>
        );
      })}
    </AppShellNav>
  );
}

function WorkspaceMobileNavigation({
  activeItem,
  onThemeChange,
  theme,
}: Readonly<{
  activeItem: WorkspaceNavId;
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="shrink-0 lg:hidden"
          size="icon"
          variant="ghost"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-0 sm:max-w-xs" side="left">
        <SheetHeader className="h-16 flex-row items-center gap-3 border-b px-4 py-0 pr-14">
          <span className="grid size-8 shrink-0 place-items-center rounded-sm border bg-foreground text-background">
            <NotifyMarkIcon className="size-4" />
          </span>
          <div className="min-w-0 text-left">
            <SheetTitle>Notify</SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
            <p className="truncate text-muted-foreground text-xs">Acme workspace</p>
          </div>
        </SheetHeader>

        <WorkspaceNavigation activeItem={activeItem} expanded onNavigate={() => setOpen(false)} />

        <AppShellSidebarFooter>
          <WorkspaceThemeButton
            className="mb-2 flex w-full justify-between rounded-md shadow-none"
            label="full"
            onThemeChange={onThemeChange}
            theme={theme}
          />
          <WorkspaceSidebarFooterControls
            expanded
            menuSide="top"
            onNavigate={() => setOpen(false)}
          />
        </AppShellSidebarFooter>
      </SheetContent>
    </Sheet>
  );
}

function useWorkspaceTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("notify-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function setThemeMode(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    window.localStorage.setItem("notify-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return { setThemeMode, theme };
}

function WorkspaceThemeButton({
  className,
  label,
  onThemeChange,
  theme,
}: Readonly<{
  className?: string;
  label?: "full" | "short";
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}>) {
  const switchId = useId();

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
        onCheckedChange={(checked) => onThemeChange(checked ? "dark" : "light")}
      />
      <label className="cursor-pointer font-medium text-sm" htmlFor={switchId}>
        {label === "full" ? visibleLabel : shortLabel}
      </label>
    </div>
  );
}

function WorkspaceSidebarFooterControls({
  expanded,
  menuSide = "right",
  onNavigate,
}: Readonly<{ expanded: boolean; menuSide?: "right" | "top"; onNavigate?: () => void }>) {
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
        <DropdownMenuContent align="start" className="w-56" side={menuSide}>
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
            <Link onClick={onNavigate} to="/settings">
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

function WorkspaceHeader({
  activeItem,
  onThemeChange,
  theme,
}: Readonly<{
  activeItem: WorkspaceNavId;
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}>) {
  return (
    <AppShellHeader>
      <AppShellHeaderInner>
        <WorkspaceMobileNavigation
          activeItem={activeItem}
          onThemeChange={onThemeChange}
          theme={theme}
        />
        <div className="relative flex-1 md:max-w-md">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search apps, recipients, events" />
        </div>
        <WorkspaceThemeButton
          className="hidden md:inline-flex"
          label="short"
          onThemeChange={onThemeChange}
          theme={theme}
        />
      </AppShellHeaderInner>
    </AppShellHeader>
  );
}

export type { WorkspaceNavId };
export { WorkspacePageHeader, WorkspaceShell, workspaceNavItems };
