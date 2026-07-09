import { Badge, Button, Card } from "@notify/ui";
import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BellRing,
  Braces,
  CheckCircle2,
  Copy,
  Database,
  Gauge,
  KeyRound,
  RadioTower,
  ShieldCheck,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "SDK", href: "#sdk" },
  { label: "Runtime", href: "#runtime" },
  { label: "Limits", href: "#limits" },
  { label: "Observability", href: "#observability" },
];

const platformStats = [
  { label: "Fanout p95", value: "94ms" },
  { label: "Delivery success", value: "99.7%" },
  { label: "Open sessions", value: "28.4k" },
];

const codeLines = [
  "import { Notify } from '@notify/client'",
  "",
  "const notify = new Notify({",
  "  apiKey: process.env.NOTIFY_API_KEY,",
  "  org: 'acme-cloud',",
  "})",
  "",
  "await notify.events.publish({",
  "  recipient: user.id,",
  "  topic: 'invoice.paid',",
  "  payload: { amount: '$240.00' },",
  "})",
];

const terminalLines = [
  { prompt: "$", command: "pnpm add @notify/client" },
  { prompt: ">", command: "client generated for TypeScript" },
  { prompt: ">", command: "socket token endpoint configured" },
  { prompt: ">", command: "delivery logs streaming" },
];

const runtimeCards: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  meta: string;
}> = [
  {
    title: "API ingest",
    description: "Receive backend events through signed API keys and stable REST contracts.",
    icon: KeyRound,
    meta: "POST /v1/events",
  },
  {
    title: "Connection routing",
    description: "Resolve live sessions without forcing product backends to know socket placement.",
    icon: RadioTower,
    meta: "live.notify.tld",
  },
  {
    title: "Delivery log",
    description:
      "Persist delivery attempts, retries, throttles, and final state for every message.",
    icon: Database,
    meta: "queryable history",
  },
];

const limitItems = [
  "Org subscription caps",
  "Per-recipient throttles",
  "Socket token expiry",
  "API key scopes",
  "Replay-safe event IDs",
  "Regional fanout controls",
];

const logRows = [
  {
    event: "invoice.paid",
    org: "acme-cloud",
    status: "delivered",
    latency: "82ms",
    variant: "success" as const,
  },
  {
    event: "trial.expiring",
    org: "northwind",
    status: "queued",
    latency: "118ms",
    variant: "warning" as const,
  },
  {
    event: "security.alert",
    org: "orbit-labs",
    status: "streaming",
    latency: "42ms",
    variant: "info" as const,
  },
];

export const Route = createFileRoute("/")({
  component: MarketingHome,
});

function MarketingHome() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-6">
          <a className="flex items-center gap-2 font-semibold text-base" href="/">
            <span className="grid size-7 place-items-center rounded-sm border bg-foreground text-background">
              <BellRing className="size-4" />
            </span>
            Notify
          </a>
          <div className="hidden items-center gap-6 text-muted-foreground text-sm lg:flex">
            {navItems.map((item) => (
              <a className="hover:text-foreground" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden sm:inline-flex" variant="ghost">
              <a href="https://docs.notify.tld">Docs</a>
            </Button>
            <Button asChild>
              <a href="https://app.notify.tld">
                Get API key
                <ArrowRight />
              </a>
            </Button>
          </div>
        </nav>
      </header>

      <section className="border-b" id="sdk">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:py-20">
          <div className="self-center">
            <Badge>
              <Terminal className="size-3.5" />
              Notification API for developers
            </Badge>
            <h1 className="mt-6 max-w-3xl font-semibold text-5xl tracking-normal md:text-7xl">
              Ship realtime notifications with a clean developer surface.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-8">
              Notify gives product teams an API, socket runtime, delivery logs, and tenant limits
              for in-app notifications without owning connection infrastructure.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 px-6" size="lg">
                <a href="https://app.notify.tld">
                  Start with the API
                  <ArrowRight />
                </a>
              </Button>
              <Button asChild className="h-12 px-6" size="lg" variant="outline">
                <a href="https://docs.notify.tld">Read the docs</a>
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl border-y md:grid-cols-3">
              {platformStats.map((stat) => (
                <div
                  className="border-b px-0 py-4 md:border-r md:border-b-0 md:px-5 last:md:border-r-0"
                  key={stat.label}
                >
                  <p className="font-mono text-muted-foreground text-xs uppercase">{stat.label}</p>
                  <p className="mt-2 font-semibold text-2xl">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <DeveloperConsole />
        </div>
      </section>

      <section className="border-b" id="runtime">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-6">
          <SectionIntro
            eyebrow="Runtime"
            title="A thin layer between your product events and connected users."
            description="Keep backend code focused on product events while Notify handles session routing, live delivery, retries, and logs."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {runtimeCards.map((item) => {
              const Icon = item.icon;

              return (
                <Card className="p-5" key={item.title}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-9 place-items-center rounded-sm border bg-secondary/55">
                      <Icon className="size-4" />
                    </div>
                    <span className="font-mono text-muted-foreground text-xs">{item.meta}</span>
                  </div>
                  <h3 className="mt-6 font-semibold text-xl tracking-normal">{item.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-7">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/25" id="limits">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-6 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionIntro
            eyebrow="Limits"
            title="Subscription-aware controls before traffic gets noisy."
            description="Set the boundaries a SaaS notification system needs early: org limits, scoped API keys, socket auth, throttles, and replay protection."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {limitItems.map((item) => (
              <Card
                className="flex items-center gap-3 bg-background px-4 py-3 font-medium"
                key={item}
              >
                <CheckCircle2 className="size-4 text-emerald-600" />
                {item}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b" id="observability">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionIntro
              eyebrow="Observability"
              title="Logs developers can actually debug from."
              description="Every event moves through explicit states, with latency and tenant context attached so support and engineering can trace what happened."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Activity, label: "State timeline" },
                { icon: Gauge, label: "Latency metrics" },
                { icon: ShieldCheck, label: "Tenant context" },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card className="flex items-center gap-3 px-4 py-3 font-medium" key={item.label}>
                    <Icon className="size-4" />
                    {item.label}
                  </Card>
                );
              })}
            </div>
          </div>

          <EventTable />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-6">
        <Card className="grid gap-8 bg-foreground p-6 text-background md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="font-mono text-background/60 text-xs uppercase">Early access</p>
            <h2 className="mt-3 font-semibold text-3xl tracking-normal">
              Build notification infrastructure once.
            </h2>
            <p className="mt-4 max-w-2xl text-background/70 leading-7">
              Start with a developer-first API and grow into realtime fanout, tenant controls, and
              delivery observability when your product needs it.
            </p>
          </div>
          <Button asChild className="bg-background text-foreground hover:bg-background/90">
            <a href="https://app.notify.tld">
              Create workspace
              <ArrowRight />
            </a>
          </Button>
        </Card>
      </section>
    </main>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: Readonly<{ description: string; eyebrow: string; title: string }>) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-semibold text-3xl tracking-normal md:text-4xl">{title}</h2>
      <p className="mt-4 text-muted-foreground leading-7">{description}</p>
    </div>
  );
}

function DeveloperConsole() {
  return (
    <Card className="overflow-hidden bg-[#0f1115] text-white">
      <div className="flex items-center justify-between border-white/10 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-sm border border-white/10 bg-white/5">
            <Braces className="size-4 text-emerald-300" />
          </div>
          <div>
            <p className="font-medium text-sm">publish.ts</p>
            <p className="text-white/45 text-xs">typed notification event</p>
          </div>
        </div>
        <Button
          className="h-8 border-white/15 bg-white/5 text-white hover:bg-white/10"
          size="sm"
          variant="outline"
        >
          <Copy />
          Copy
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px]">
        <pre className="overflow-x-auto p-5 text-sm leading-7">
          <code>
            {codeLines.map((line, index) => (
              <span className="block" key={`${line}-${index}`}>
                <span className="mr-5 select-none text-white/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={line.startsWith("await") ? "text-emerald-300" : "text-white/82"}>
                  {line || " "}
                </span>
              </span>
            ))}
          </code>
        </pre>

        <div className="border-white/10 border-t p-5 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-300" />
            <p className="font-medium text-sm">Live setup</p>
          </div>
          <div className="mt-4 grid gap-3">
            {terminalLines.map((line) => (
              <div className="font-mono text-sm" key={line.command}>
                <span className="mr-2 text-emerald-300">{line.prompt}</span>
                <span className="text-white/65">{line.command}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 border border-white/10 bg-white/[0.03] p-3">
            <p className="font-mono text-white/45 text-xs uppercase">Status</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-white/70">socket gateway</span>
              <Badge variant="success">healthy</Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EventTable() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Workflow className="size-4" />
          <p className="font-medium">Delivery log</p>
        </div>
        <Badge variant="secondary">live</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b bg-secondary/45 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Org</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {logRows.map((row) => (
              <tr className="border-b last:border-b-0" key={`${row.org}-${row.event}`}>
                <td className="px-4 py-3 font-mono">{row.event}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.org}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.variant}>{row.status}</Badge>
                </td>
                <td className="px-4 py-3 font-mono">{row.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
