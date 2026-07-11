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
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  StatCard,
  StatusLine,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  UsageBar,
} from "@notify/ui";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Moon,
  Pin,
  Plus,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const summaryMetrics = [
  {
    label: "Delivered today",
    value: "48,214",
    detail: "+12.4% from yesterday",
    tone: "success",
  },
  {
    label: "Ingress rate",
    value: "318/min",
    detail: "p95 validation 42ms",
    tone: "info",
  },
  {
    label: "Active clients",
    value: "12,880",
    detail: "WebSocket sessions",
    tone: "default",
  },
  {
    label: "Failed events",
    value: "37",
    detail: "0.08% failure rate",
    tone: "warning",
  },
];

const notificationApps = [
  {
    name: "Acme Cloud",
    environment: "Production",
    clientKey: "pk_live_8fd2",
    origin: "app.acme.com",
    status: "Live",
    events: "31.8k",
  },
  {
    name: "Acme Support",
    environment: "Production",
    clientKey: "pk_live_4c10",
    origin: "support.acme.com",
    status: "Live",
    events: "9.4k",
  },
  {
    name: "Acme Labs",
    environment: "Sandbox",
    clientKey: "pk_test_91aa",
    origin: "labs.acme.com",
    status: "Testing",
    events: "1.2k",
  },
];

const recentEvents = [
  {
    event: "invoice.payment_failed",
    app: "Acme Cloud",
    recipient: "user_9012",
    status: "Delivered",
    latency: "71ms",
    time: "2 min ago",
  },
  {
    event: "security.device_added",
    app: "Acme Cloud",
    recipient: "user_1337",
    status: "Streaming",
    latency: "39ms",
    time: "5 min ago",
  },
  {
    event: "ticket.assigned",
    app: "Acme Support",
    recipient: "agent_442",
    status: "Queued",
    latency: "118ms",
    time: "8 min ago",
  },
  {
    event: "trial.expiring",
    app: "Acme Labs",
    recipient: "user_6200",
    status: "Retrying",
    latency: "204ms",
    time: "14 min ago",
  },
];

const activityItems = [
  "Production API key rotated",
  "Sandbox app origin updated",
  "Billing usage threshold reached",
  "Realtime client token issued",
];

function DashboardPage() {
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;

  return (
    <AppShell>
      <AppShellLayout collapsed={!sidebarPinned}>
        <DashboardSidebar
          expanded={sidebarExpanded}
          onHoveredChange={setSidebarHovered}
          onPinnedChange={setSidebarPinned}
          pinned={sidebarPinned}
        />

        <AppShellMain>
          <DashboardHeader />

          <AppShellContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Production healthy</Badge>
                  <Badge variant="secondary">Acme workspace</Badge>
                </div>
                <h1 className="mt-3 font-semibold text-3xl tracking-normal">Dashboard</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Manage notification apps, monitor ingress traffic, track delivery analytics, and
                  keep subscription usage under control.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <KeyRound />
                  API keys
                </Button>
                <Button>
                  <Plus />
                  New app
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryMetrics.map((metric) => (
                <StatCard key={metric.label}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground text-sm">{metric.label}</p>
                      <p className="mt-2 font-semibold text-2xl">{metric.value}</p>
                    </div>
                    <Badge variant={metric.tone as "default"}>{metric.tone}</Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground text-sm">{metric.detail}</p>
                </StatCard>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Card>
                <CardHeader className="gap-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Notification apps</CardTitle>
                      <CardDescription>
                        Client-facing apps connected to the ingress and realtime layer.
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline">
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>App</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Client key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notificationApps.map((app) => (
                        <TableRow key={app.clientKey}>
                          <TableCell>
                            <div className="font-medium">{app.name}</div>
                            <div className="text-muted-foreground text-xs">{app.environment}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{app.origin}</TableCell>
                          <TableCell className="font-mono text-xs">{app.clientKey}</TableCell>
                          <TableCell>
                            <Badge variant={app.status === "Live" ? "success" : "info"}>
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{app.events}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingress endpoint</CardTitle>
                  <CardDescription>Production ingest health and key controls.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="rounded-sm border bg-secondary/35 p-3">
                    <p className="text-muted-foreground text-xs">Endpoint</p>
                    <p className="mt-1 break-all font-mono text-sm">POST /api/v1/notifications</p>
                  </div>
                  <div className="grid gap-3">
                    <StatusLine label="Auth" value="Scoped keys active" />
                    <StatusLine label="Idempotency" value="Required" />
                    <StatusLine label="Realtime fanout" value="Healthy" />
                    <StatusLine label="Rate limit" value="72% available" />
                  </div>
                  <Button className="w-full" variant="outline">
                    <ArrowUpRight />
                    Open API settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription usage</CardTitle>
                  <CardDescription>Current plan limits for the workspace.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <UsageBar label="Events" value={68} detail="682k of 1M monthly events" />
                  <UsageBar label="Apps" value={45} detail="9 of 20 notification apps" />
                  <UsageBar label="Seats" value={80} detail="16 of 20 team seats" />
                  <div className="flex items-center justify-between gap-3 rounded-sm border p-3">
                    <div>
                      <p className="font-medium text-sm">Scale plan</p>
                      <p className="text-muted-foreground text-sm">Renews Aug 1, 2026</p>
                    </div>
                    <Button size="sm" variant="secondary">
                      Billing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery analytics</CardTitle>
                  <CardDescription>Realtime delivery trends across all apps.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="events">
                    <TabsList>
                      <TabsTrigger value="events">Events</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="events" className="mt-4">
                      <div className="overflow-hidden rounded-sm border">
                        {recentEvents.map((item) => (
                          <div
                            className="grid gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[1.2fr_0.8fr_0.8fr_100px_84px]"
                            key={`${item.event}-${item.time}`}
                          >
                            <div>
                              <p className="font-mono text-sm">{item.event}</p>
                              <p className="text-muted-foreground text-xs">{item.app}</p>
                            </div>
                            <p className="text-muted-foreground text-sm">{item.recipient}</p>
                            <Badge variant={eventBadgeVariant(item.status)}>{item.status}</Badge>
                            <p className="font-mono text-sm">{item.latency}</p>
                            <p className="text-muted-foreground text-sm">{item.time}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4">
                      <div className="grid gap-3">
                        {activityItems.map((item) => (
                          <div className="flex items-center gap-3 rounded-sm border p-3" key={item}>
                            <span className="grid size-8 place-items-center rounded-sm bg-secondary">
                              <Activity className="size-4" />
                            </span>
                            <p className="font-medium text-sm">{item}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </AppShellContent>
        </AppShellMain>
      </AppShellLayout>
    </AppShell>
  );
}

function DashboardSidebar({
  expanded,
  onHoveredChange,
  onPinnedChange,
  pinned,
}: Readonly<{
  expanded: boolean;
  onHoveredChange: (hovered: boolean) => void;
  onPinnedChange: (pinned: boolean) => void;
  pinned: boolean;
}>) {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Notification apps", icon: BellRing },
    { label: "Ingress", icon: RadioTower },
    { label: "Analytics", icon: BarChart3 },
    { label: "Subscription", icon: CreditCard },
    { label: "Security", icon: ShieldCheck },
    { label: "Settings", icon: Settings },
  ];

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
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <SidebarNavItem active={item.active} asChild collapsed={!expanded} key={item.label}>
              <Link aria-label={expanded ? undefined : item.label} to="/dashboard">
                <Icon className="size-4" />
                <SidebarNavLabel>{item.label}</SidebarNavLabel>
              </Link>
            </SidebarNavItem>
          );
        })}
      </AppShellNav>

      <AppShellSidebarFooter>
        <Button
          aria-label={expanded ? undefined : "Sign out"}
          className={expanded ? "w-full justify-start" : "w-full px-0"}
          variant="ghost"
        >
          <LogOut />
          {expanded ? "Sign out" : null}
        </Button>
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );
}

function DashboardHeader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("notify-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("notify-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <AppShellHeader>
      <AppShellHeaderInner>
        <div className="relative flex-1 md:max-w-md">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search apps, recipients, events" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggleTheme}
            size="icon"
            type="button"
            variant="outline"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Open user menu" className="h-10 gap-3 px-2 pr-3" variant="ghost">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary text-primary-foreground">CS</AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block font-medium text-sm leading-none">Chatar Singh</span>
                  <span className="mt-1 block text-muted-foreground text-xs leading-none">
                    Acme workspace
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      CS
                    </AvatarFallback>
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
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </AppShellHeaderInner>
    </AppShellHeader>
  );
}

function eventBadgeVariant(status: string) {
  if (status === "Delivered") {
    return "success";
  }

  if (status === "Retrying") {
    return "warning";
  }

  return "info";
}

export { DashboardPage };
