import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Activity, ArrowUpRight, KeyRound, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { WorkspacePageHeader, WorkspaceShell } from "./shell";

const summaryMetrics = [
  {
    label: "Accepted today",
    value: "48,214",
    detail: "Public ingest accepts one event per request",
    tone: "success",
  },
  {
    label: "Duplicate replays",
    value: "184",
    detail: "Returned from the 24 hour idempotency window",
    tone: "info",
  },
  {
    label: "Active clients",
    value: "12,880",
    detail: "WebSocket sessions",
    tone: "default",
  },
  {
    label: "Rejected requests",
    value: "37",
    detail: "Validation and auth failures only",
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
    status: "Accepted",
    latency: "71ms",
    time: "2 min ago",
  },
  {
    event: "billing.invoice_sent",
    app: "Acme Cloud",
    recipient: "user_1337",
    status: "Duplicate",
    latency: "19ms",
    time: "5 min ago",
  },
  {
    event: "test.notification_sent",
    app: "Acme Labs",
    recipient: "agent_442",
    status: "Test event",
    latency: "44ms",
    time: "8 min ago",
  },
  {
    event: "security.device_added",
    app: "Acme Support",
    recipient: "user_6200",
    status: "Accepted",
    latency: "82ms",
    time: "14 min ago",
  },
];

const activityItems = [
  "Production server API key rotated",
  "Ingress validation contract copied",
  "Duplicate replay returned for billing.invoice_sent",
  "Dashboard test event accepted",
];

function DashboardPage() {
  const auth = useAuth();
  const workspaceSlug = auth.principal?.workspace.slug;

  if (!workspaceSlug) {
    throw new Error("Dashboard requires an active workspace.");
  }

  return (
    <WorkspaceShell activeItem="dashboard">
      <WorkspacePageHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link params={{ section: "security", workspaceSlug }} to="/w/$workspaceSlug/$section">
                <KeyRound />
                API keys
              </Link>
            </Button>
            <Button asChild>
              <Link params={{ section: "apps", workspaceSlug }} to="/w/$workspaceSlug/$section">
                <Plus />
                New app
              </Link>
            </Button>
          </>
        }
        badges={
          <>
            <Badge variant="success">Production healthy</Badge>
            <Badge variant="secondary">{auth.principal?.workspace.name ?? "Workspace"}</Badge>
          </>
        }
        description="Manage notification apps, monitor ingress traffic, track delivery analytics, and keep subscription usage under control."
        title="Dashboard"
      />

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
              <Button asChild size="sm" variant="outline">
                <Link params={{ section: "apps", workspaceSlug }} to="/w/$workspaceSlug/$section">
                  View all
                </Link>
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
            <CardDescription>Production ingest contract and key controls.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-sm border bg-secondary/35 p-3">
              <p className="text-muted-foreground text-xs">Endpoint</p>
              <p className="mt-1 break-all font-mono text-sm">POST /api/v1/notifications</p>
            </div>
            <div className="grid gap-3">
              <StatusLine label="Auth" value="Environment-scoped server keys" />
              <StatusLine label="Idempotency" value="24 hour replay window" />
              <StatusLine label="Persistence" value="Accepted event plus outbox" />
              <StatusLine label="Fanout" value="Deferred in MVP" />
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link params={{ section: "ingress", workspaceSlug }} to="/w/$workspaceSlug/$section">
                <ArrowUpRight />
                Open API settings
              </Link>
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
              <Button asChild size="sm" variant="secondary">
                <Link
                  params={{ section: "subscription", workspaceSlug }}
                  to="/w/$workspaceSlug/$section"
                >
                  Billing
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingress activity</CardTitle>
            <CardDescription>
              Accepted event activity before delivery fanout exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="events">
              <TabsList>
                <TabsTrigger value="events">Accepted events</TabsTrigger>
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
    </WorkspaceShell>
  );
}

function eventBadgeVariant(status: string) {
  if (status === "Accepted") {
    return "success";
  }

  if (status === "Duplicate") {
    return "warning";
  }

  return "info";
}

export { DashboardPage };
