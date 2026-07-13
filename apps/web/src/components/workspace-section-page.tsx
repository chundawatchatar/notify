import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusLine,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  UsageBar,
} from "@notify/ui";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BellRing,
  Clock3,
  Copy,
  KeyRound,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Webhook,
} from "lucide-react";
import type { WorkspaceSectionId } from "@/lib/workspace-sections";
import { WorkspacePageHeader, WorkspaceShell } from "./workspace-shell";

type LabelValueRow = readonly [label: string, value: string];
type BadgeTone = "default" | "info" | "success" | "warning";

const pageCopy: Record<WorkspaceSectionId, { badge: string; description: string; title: string }> =
  {
    apps: {
      badge: "Client surfaces",
      title: "Notification apps",
      description:
        "Create and operate the customer-facing apps that connect browser sessions, scoped keys, and delivery settings.",
    },
    ingress: {
      badge: "API intake",
      title: "Ingress endpoint",
      description:
        "Manage the signed event endpoint, validation rules, idempotency windows, and intake health.",
    },
    analytics: {
      badge: "Delivery insight",
      title: "Analytics",
      description:
        "Track delivery rates, fanout latency, retries, and client engagement across every notification app.",
    },
    subscription: {
      badge: "Plan control",
      title: "Subscription",
      description:
        "Review workspace limits, billing health, seats, and the usage signals that keep the account predictable.",
    },
    security: {
      badge: "Access policy",
      title: "Security and API keys",
      description:
        "Control API keys, trusted origins, session token rules, and audit posture for the notification platform.",
    },
    settings: {
      badge: "Workspace admin",
      title: "Settings",
      description:
        "Configure workspace identity, team defaults, environment behavior, and notification platform preferences.",
    },
  };

const appRows = [
  {
    clientKey: "pk_live_8fd2",
    environment: "Production",
    events: "31.8k",
    name: "Acme Cloud",
    origin: "app.acme.com",
    status: "Live",
    tone: "success",
  },
  {
    clientKey: "pk_live_4c10",
    environment: "Production",
    events: "9.4k",
    name: "Acme Support",
    origin: "support.acme.com",
    status: "Live",
    tone: "success",
  },
  {
    clientKey: "pk_test_91aa",
    environment: "Sandbox",
    events: "1.2k",
    name: "Acme Labs",
    origin: "labs.acme.com",
    status: "Testing",
    tone: "info",
  },
] satisfies Array<{
  clientKey: string;
  environment: string;
  events: string;
  name: string;
  origin: string;
  status: string;
  tone: BadgeTone;
}>;

const appSetup = [
  ["Client app created", "Complete"],
  ["Trusted origin configured", "Complete"],
  ["Server key issued", "Complete"],
  ["Realtime token endpoint", "Ready"],
] satisfies LabelValueRow[];

const ingressRules = [
  ["Signature validation", "Required"],
  ["Idempotency key", "24 hour window"],
  ["Payload schema", "Strict mode"],
  ["Rate limit", "318 requests/min"],
] satisfies LabelValueRow[];

const recentIngressEvents = [
  ["invoice.payment_failed", "Acme Cloud", "Delivered", "71ms"],
  ["ticket.assigned", "Acme Support", "Queued", "118ms"],
  ["trial.expiring", "Acme Labs", "Retrying", "204ms"],
] satisfies Array<readonly [topic: string, app: string, status: string, latency: string]>;

const analyticsCards = [
  { label: "Delivered", tone: "success", trend: "+12.4%", value: "48,214" },
  { label: "Queued", tone: "info", trend: "-3.1%", value: "824" },
  { label: "Retried", tone: "warning", trend: "+0.6%", value: "119" },
  { label: "Failed", tone: "warning", trend: "-0.8%", value: "37" },
] satisfies Array<{ label: string; tone: BadgeTone; trend: string; value: string }>;

const analyticsBreakdown = [
  ["Acme Cloud", "99.8%", "44ms", "31.8k"],
  ["Acme Support", "99.5%", "62ms", "9.4k"],
  ["Acme Labs", "98.1%", "91ms", "1.2k"],
] satisfies Array<readonly [app: string, success: string, latency: string, events: string]>;

const apiKeys = [
  ["Server live key", "sk_live_8fd2", "Rotated 2 days ago", "Active"],
  ["Server test key", "sk_test_91aa", "Rotated 21 days ago", "Active"],
  ["Legacy ingest key", "sk_live_2d10", "Expires in 6 days", "Rotate"],
] satisfies Array<readonly [name: string, key: string, rotated: string, status: string]>;

const trustedOrigins = [
  ["app.acme.com", "Production"],
  ["support.acme.com", "Production"],
  ["labs.acme.com", "Sandbox"],
] satisfies LabelValueRow[];

const securityPosture = [
  ["Socket token expiry", "15 minutes"],
  ["Origin enforcement", "Enabled"],
  ["Audit log retention", "180 days"],
  ["Key rotation reminder", "30 days"],
] satisfies LabelValueRow[];

const workspaceSettings = [
  ["Workspace name", "Acme workspace"],
  ["Default environment", "Production"],
  ["Notification timezone", "Asia/Kolkata"],
  ["Data residency", "US region"],
] satisfies LabelValueRow[];

const notificationPreferences = [
  ["Delivery alerts", "Enabled"],
  ["Usage alerts", "80% threshold"],
  ["Weekly report", "Monday morning"],
  ["Incident contacts", "3 recipients"],
] satisfies LabelValueRow[];

function WorkspaceSectionPage({ section }: Readonly<{ section: WorkspaceSectionId }>) {
  const copy = pageCopy[section];

  return (
    <WorkspaceShell activeItem={section}>
      <WorkspacePageHeader
        actions={<SectionActions section={section} />}
        badges={<Badge variant="secondary">{copy.badge}</Badge>}
        description={copy.description}
        title={copy.title}
      />
      <SectionContent section={section} />
    </WorkspaceShell>
  );
}

function SectionActions({ section }: Readonly<{ section: WorkspaceSectionId }>) {
  if (section === "apps") {
    return (
      <>
        <Button variant="outline">
          <Copy />
          Client docs
        </Button>
        <Button>
          <Plus />
          New app
        </Button>
      </>
    );
  }

  if (section === "ingress") {
    return (
      <>
        <Button variant="outline">
          <Copy />
          Copy endpoint
        </Button>
        <Button>
          <Webhook />
          Test event
        </Button>
      </>
    );
  }

  if (section === "security") {
    return (
      <>
        <Button variant="outline">
          <RotateCcw />
          Rotate key
        </Button>
        <Button>
          <KeyRound />
          New key
        </Button>
      </>
    );
  }

  return (
    <Button variant="outline">
      <ArrowUpRight />
      Open details
    </Button>
  );
}

function SectionContent({ section }: Readonly<{ section: WorkspaceSectionId }>) {
  if (section === "apps") {
    return <AppsContent />;
  }

  if (section === "ingress") {
    return <IngressContent />;
  }

  if (section === "analytics") {
    return <AnalyticsContent />;
  }

  if (section === "subscription") {
    return <SubscriptionContent />;
  }

  if (section === "security") {
    return <SecurityContent />;
  }

  return <SettingsContent />;
}

function AppsContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <CardHeader>
          <CardTitle>Connected apps</CardTitle>
          <CardDescription>Customer apps using Notify client credentials.</CardDescription>
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
              {appRows.map((app) => (
                <TableRow key={app.clientKey}>
                  <TableCell>
                    <div className="font-medium">{app.name}</div>
                    <div className="text-muted-foreground text-xs">{app.environment}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{app.origin}</TableCell>
                  <TableCell className="font-mono text-xs">{app.clientKey}</TableCell>
                  <TableCell>
                    <Badge variant={app.tone}>{app.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{app.events}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <ChecklistCard
          description="Minimum setup for a production-ready app."
          icon={BellRing}
          items={appSetup}
          title="App setup"
        />
        <Card>
          <CardHeader>
            <CardTitle>App capacity</CardTitle>
            <CardDescription>Workspace limits for client surfaces.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <UsageBar label="Apps" value={45} detail="9 of 20 notification apps" />
            <UsageBar label="Client origins" value={60} detail="12 of 20 trusted origins" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IngressContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Production endpoint</CardTitle>
            <CardDescription>Primary notification intake contract.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-sm border bg-secondary/35 p-4">
              <p className="text-muted-foreground text-xs">Endpoint</p>
              <p className="mt-1 break-all font-mono text-sm">POST /api/v1/notifications</p>
            </div>
            <StatusLine label="Validation" value="Passing" />
            <StatusLine label="Queue depth" value="824 events" />
            <StatusLine label="P95 intake" value="42ms" />
          </CardContent>
        </Card>
        <ChecklistCard
          description="Request controls applied before events enter the queue."
          icon={Webhook}
          items={ingressRules}
          title="Ingress rules"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent received events</CardTitle>
          <CardDescription>Last accepted topics across all notification apps.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentIngressEvents.map(([topic, app, status, latency]) => (
                <TableRow key={`${topic}-${app}`}>
                  <TableCell className="font-mono text-xs">{topic}</TableCell>
                  <TableCell>{app}</TableCell>
                  <TableCell>
                    <Badge variant={eventTone(status)}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{latency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsContent() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analyticsCards.map(({ label, tone, trend, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={tone}>{trend}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>App delivery breakdown</CardTitle>
            <CardDescription>Success and latency by notification app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>P95 latency</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsBreakdown.map(([app, success, latency, events]) => (
                  <TableRow key={app}>
                    <TableCell className="font-medium">{app}</TableCell>
                    <TableCell>{success}</TableCell>
                    <TableCell>{latency}</TableCell>
                    <TableCell className="text-right">{events}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery health</CardTitle>
            <CardDescription>Current operating window.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <UsageBar label="Delivery SLA" value={99} detail="99.7% delivered under SLA" />
            <UsageBar label="Retry budget" value={18} detail="119 retries this cycle" />
            <UsageBar label="Failure rate" value={8} detail="0.08% failed events" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubscriptionContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Scale plan</CardTitle>
              <CardDescription>Renews Aug 1, 2026.</CardDescription>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <StatusLine label="Monthly events" value="1M" />
          <StatusLine label="Notification apps" value="20" />
          <StatusLine label="Team seats" value="20" />
          <StatusLine label="Support tier" value="Priority" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Current billing cycle consumption.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <UsageBar label="Events" value={68} detail="682k of 1M monthly events" />
          <UsageBar label="Apps" value={45} detail="9 of 20 notification apps" />
          <UsageBar label="Seats" value={80} detail="16 of 20 team seats" />
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityContent() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Server credentials used for signed ingress requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Rotation</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map(([name, key, rotated, status]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="font-mono text-xs">{key}</TableCell>
                    <TableCell>{rotated}</TableCell>
                    <TableCell>
                      <Badge variant={status === "Rotate" ? "warning" : "success"}>{status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <ChecklistCard
          description="Runtime safeguards for app and API access."
          icon={ShieldCheck}
          items={securityPosture}
          title="Security posture"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChecklistCard
          description="Browser origins allowed to connect to client apps."
          icon={LockKeyhole}
          items={trustedOrigins}
          title="Trusted origins"
        />
        <Card>
          <CardHeader>
            <CardTitle>Audit activity</CardTitle>
            <CardDescription>Security-sensitive workspace changes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ActivityRow detail="Production key rotated" meta="2 days ago" />
            <ActivityRow detail="Trusted origin added" meta="5 days ago" />
            <ActivityRow detail="Socket token policy updated" meta="12 days ago" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <ChecklistCard
        description="Core workspace defaults applied across every app."
        icon={SlidersHorizontal}
        items={workspaceSettings}
        title="Workspace settings"
      />
      <ChecklistCard
        description="Operational alerts for delivery and usage thresholds."
        icon={BellRing}
        items={notificationPreferences}
        title="Notification preferences"
      />
    </div>
  );
}

function ActivityRow({ detail, meta }: Readonly<{ detail: string; meta: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-sm border p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-sm bg-secondary">
          <Clock3 className="size-4" />
        </span>
        <p className="font-medium text-sm">{detail}</p>
      </div>
      <p className="text-muted-foreground text-sm">{meta}</p>
    </div>
  );
}

function ChecklistCard({
  description,
  icon: Icon,
  items,
  title,
}: Readonly<{
  description: string;
  icon: LucideIcon;
  items: LabelValueRow[];
  title: string;
}>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-sm border bg-secondary">
            <Icon className="size-4" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map(([label, value]) => (
          <StatusLine key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

function eventTone(status: string): BadgeTone {
  if (status === "Delivered") {
    return "success";
  }

  if (status === "Retrying") {
    return "warning";
  }

  return "info";
}

export { WorkspaceSectionPage };
