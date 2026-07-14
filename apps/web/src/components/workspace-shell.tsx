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
  NotifyLogoMark,
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
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
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
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

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

type ThemeMode = "light" | "dark";

const workspaceNavItems: WorkspaceNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "apps", label: "Notification apps", icon: BellRing },
  { id: "ingress", label: "Ingress", icon: RadioTower },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

function WorkspaceShell({
  activeItem,
  children,
}: Readonly<{ activeItem: WorkspaceNavId; children: ReactNode }>) {
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const { setThemeMode, theme } = useWorkspaceTheme();
  const auth = useAuth();
  const sidebarExpanded = sidebarPinned || sidebarHovered;
  const workspaceName = auth.principal?.workspace.name ?? "Workspace";

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
            workspaceName={workspaceName}
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
  workspaceName,
}: Readonly<{
  activeItem: WorkspaceNavId;
  expanded: boolean;
  onHoveredChange: (hovered: boolean) => void;
  onPinnedChange: (pinned: boolean) => void;
  pinned: boolean;
  workspaceName: string;
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
        <NotifyLogoMark />
        <div
          className={
            expanded
              ? "-translate-y-1/2 absolute top-1/2 right-14 left-[68px] min-w-0 overflow-hidden opacity-100 transition-opacity duration-200 ease-out"
              : "-translate-y-1/2 absolute top-1/2 right-14 left-[68px] min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 ease-out"
          }
        >
          <p className="font-semibold">Notify</p>
          <p className="truncate text-muted-foreground text-xs whitespace-nowrap">
            {workspaceName}
          </p>
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
        const routeProps =
          item.id === "dashboard"
            ? ({ to: "/dashboard" } as const)
            : ({ params: { section: item.id }, to: "/$section" } as const);

        return (
          <SidebarNavItem active={active} asChild collapsed={!expanded} key={item.id}>
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={expanded ? undefined : item.label}
              onClick={onNavigate}
              {...routeProps}
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
          <NotifyLogoMark />
          <div className="min-w-0 text-left">
            <SheetTitle>Notify</SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
            <WorkspaceName />
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
  const [theme, setTheme] = useState<ThemeMode>(initialWorkspaceTheme);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function setThemeMode(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    window.localStorage.setItem("notify-theme", nextTheme);
  }

  return { setThemeMode, theme };
}

function initialWorkspaceTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("notify-theme");

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  const auth = useAuth();
  const navigate = useNavigate();
  const email = auth.principal?.user.email ?? "Account";
  const workspaceName = auth.principal?.workspace.name ?? "Workspace";
  const initials = accountInitials(email);
  const logoutMutation = useMutation({
    mutationFn: auth.signOut,
    onSuccess: async () => {
      onNavigate?.();
      await navigate({ to: "/auth/login", replace: true });
    },
  });

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
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {expanded ? (
              <span className="min-w-0 text-left">
                <span className="block truncate font-medium text-sm leading-none">{email}</span>
                <span className="mt-1 block truncate text-muted-foreground text-xs leading-none">
                  {workspaceName}
                </span>
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" side={menuSide}>
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{workspaceName}</p>
                <p className="truncate text-muted-foreground text-xs">{email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link onClick={onNavigate} params={{ section: "settings" }} to="/$section">
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
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        type="button"
        variant="ghost"
      >
        <LogOut />
        {expanded ? (logoutMutation.isPending ? "Signing out" : "Sign out") : null}
      </Button>
      {expanded && logoutMutation.isError ? (
        <p className="px-2 text-destructive text-xs" role="alert">
          {logoutMutation.error.message}
        </p>
      ) : null}
    </div>
  );
}

function WorkspaceName() {
  const auth = useAuth();

  return (
    <p className="truncate text-muted-foreground text-xs">
      {auth.principal?.workspace.name ?? "Workspace"}
    </p>
  );
}

function accountInitials(email: string) {
  const localPart = email.split("@")[0] ?? "N";
  const letters = localPart.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);
  return (letters || "N").toUpperCase();
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
