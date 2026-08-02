import type { WorkspaceSectionId } from "@/lib/workspace-sections";

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
        "Manage the server-authenticated event endpoint, validation contract, idempotency window, and accepted-event visibility.",
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
  ["Server API key", "Environment scoped"],
  ["Idempotency key", "24 hour replay window"],
  ["Payload schema", "Strict top-level contract"],
  ["Fanout", "Deferred from MVP"],
] satisfies LabelValueRow[];

const recentIngressEvents = [
  ["invoice.payment_failed", "Acme Cloud / Production", "Accepted", "2 min ago"],
  ["billing.invoice_sent", "Acme Cloud / Production", "Duplicate", "6 min ago"],
  ["test.notification_sent", "Acme Labs / Development", "Test event", "14 min ago"],
] satisfies Array<
  readonly [event: string, environment: string, outcome: string, acceptedAt: string]
>;

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

export type { BadgeTone, LabelValueRow };
export {
  analyticsBreakdown,
  analyticsCards,
  appRows,
  appSetup,
  ingressRules,
  notificationPreferences,
  pageCopy,
  recentIngressEvents,
  workspaceSettings,
};
