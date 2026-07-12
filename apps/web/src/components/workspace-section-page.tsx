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
  KeyRound,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Webhook,
} from "lucide-react";
import type { WorkspaceNavId } from "./workspace-shell";
import { WorkspacePageHeader, WorkspaceShell } from "./workspace-shell";

type WorkspaceSectionId = Exclude<WorkspaceNavId, "dashboard">;
type LabelValueRow = readonly [label: string, value: string];

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
      title: "Ingress",
      description:
        "Manage notification endpoints, validation rules, idempotency windows, and event intake health.",
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
      title: "Security",
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

const apps = [
  ["Acme Cloud", "Production", "app.acme.com", "Live", "31.8k"],
  ["Acme Support", "Production", "support.acme.com", "Live", "9.4k"],
  ["Acme Labs", "Sandbox", "labs.acme.com", "Testing", "1.2k"],
];

const ingressRules = [
  ["Signed events", "Required"],
  ["Idempotency key", "24 hour window"],
  ["Payload schema", "Enabled"],
  ["Rate limits", "318 requests/minute"],
] satisfies LabelValueRow[];

const analyticsRows: Array<{
  label: string;
  tone: "info" | "success" | "warning";
  trend: string;
  value: string;
}> = [
  { label: "Delivered", value: "48,214", trend: "+12.4%", tone: "success" },
  { label: "Queued", value: "824", trend: "-3.1%", tone: "info" },
  { label: "Retried", value: "119", trend: "+0.6%", tone: "warning" },
  { label: "Failed", value: "37", trend: "-0.8%", tone: "warning" },
];

const securityItems = [
  ["Production API key", "Rotated 2 days ago"],
  ["Trusted origins", "3 active domains"],
  ["Socket token expiry", "15 minutes"],
  ["Audit log retention", "180 days"],
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
      <Button>
        <Plus />
        New app
      </Button>
    );
  }

  if (section === "security") {
    return (
      <Button variant="outline">
        <KeyRound />
        Rotate key
      </Button>
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
              <TableHead>Environment</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map(([name, environment, origin, status, events]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>{environment}</TableCell>
                <TableCell className="font-mono text-xs">{origin}</TableCell>
                <TableCell>
                  <Badge variant={status === "Live" ? "success" : "info"}>{status}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{events}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IngressContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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
      <ChecklistCard icon={Webhook} items={ingressRules} title="Ingress rules" />
    </div>
  );
}

function AnalyticsContent() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {analyticsRows.map(({ label, tone, trend, value }) => (
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
  );
}

function SubscriptionContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Scale plan</CardTitle>
          <CardDescription>Renews Aug 1, 2026.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <StatusLine label="Monthly events" value="1M" />
          <StatusLine label="Notification apps" value="20" />
          <StatusLine label="Team seats" value="20" />
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
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <ChecklistCard icon={ShieldCheck} items={securityItems} title="Security posture" />
      <Card>
        <CardHeader>
          <CardTitle>Key controls</CardTitle>
          <CardDescription>Production safeguards for client and server access.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <StatusLine label="Server keys" value="2 active" />
          <StatusLine label="Client keys" value="9 active" />
          <StatusLine label="Origin enforcement" value="Enabled" />
          <StatusLine label="Audit logging" value="Enabled" />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <ChecklistCard
        icon={SlidersHorizontal}
        items={workspaceSettings}
        title="Workspace settings"
      />
      <ChecklistCard
        icon={BellRing}
        items={notificationPreferences}
        title="Notification preferences"
      />
    </div>
  );
}

function ChecklistCard({
  icon: Icon,
  items,
  title,
}: Readonly<{
  icon: LucideIcon;
  items: LabelValueRow[];
  title: string;
}>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-sm border bg-secondary">
            <Icon className="size-4" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Operational settings for this workspace.</CardDescription>
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

export { WorkspaceSectionPage };
