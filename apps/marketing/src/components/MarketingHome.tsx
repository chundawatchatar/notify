import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Typography } from "@notify/ui";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Braces,
  Database,
  Gauge,
  KeyRound,
  RadioTower,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { MarketingShell, marketingUrls } from "./MarketingShell";

const codeLines = [
  "import { Notify } from '@notify/client'",
  "",
  "const notify = new Notify({",
  "  apiKey: process.env.NOTIFY_API_KEY,",
  "  workspace: 'acme-cloud',",
  "})",
  "",
  "await notify.events.publish({",
  "  recipient: user.id,",
  "  topic: 'deploy.completed',",
  "  payload: { service: 'billing-api' },",
  "})",
];

const platformItems: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  label: string;
}> = [
  {
    title: "API-first ingest",
    description:
      "Accept backend events through scoped keys, stable REST contracts, and replay-safe ids.",
    icon: KeyRound,
    label: "POST /v1/events",
  },
  {
    title: "Realtime routing",
    description:
      "Resolve active sockets without forcing application servers to understand connection placement.",
    icon: RadioTower,
    label: "live gateway",
  },
  {
    title: "Queryable history",
    description:
      "Track queued, delivered, throttled, failed, and retried states with tenant context.",
    icon: Database,
    label: "delivery log",
  },
];

const architectureSteps = [
  "Subscriber backend sends a signed event",
  "Notify validates org limits and event shape",
  "Fanout workers route to active realtime sessions",
  "Delivery state is written for support and audits",
];

const deliveryRows = [
  { event: "deploy.completed", org: "acme-cloud", status: "delivered", latency: "68ms" },
  { event: "invoice.failed", org: "northwind", status: "queued", latency: "104ms" },
  { event: "security.alert", org: "orbit-labs", status: "streaming", latency: "39ms" },
];

function MarketingHome() {
  return (
    <MarketingShell activePage="home">
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="self-center">
            <Badge>
              <Terminal className="size-3.5" />
              Notification API for developers
            </Badge>
            <Typography
              as="h1"
              className="mt-6 max-w-4xl text-5xl leading-[1.05] md:text-7xl md:leading-[1.02]"
            >
              Realtime notifications with an API developers can trust.
            </Typography>
            <Typography as="p" variant="lead" className="mt-6 max-w-2xl">
              A static-first marketing app that still uses the same Notify UI package, typography,
              tokens, and Tailwind setup as the product surface.
            </Typography>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 px-6" size="lg">
                <a href={marketingUrls.signup}>
                  Start building
                  <ArrowRight />
                </a>
              </Button>
              <Button asChild className="h-12 px-6" size="lg" variant="outline">
                <a href="https://docs.notify.tld">Read docs</a>
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl border-y sm:grid-cols-3">
              {[
                ["p95 fanout", "94ms"],
                ["delivery", "99.7%"],
                ["sessions", "28.4k"],
              ].map(([label, value]) => (
                <div
                  className="border-b py-4 sm:border-r sm:border-b-0 sm:px-5 last:sm:border-r-0"
                  key={label}
                >
                  <Typography as="p" className="font-mono text-muted-foreground text-xs uppercase">
                    {label}
                  </Typography>
                  <Typography as="p" className="mt-2 font-semibold text-2xl">
                    {value}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          <DeveloperPanel />
        </div>
      </section>

      <section className="border-b" id="platform">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-6">
          <SectionHeader
            eyebrow="Platform"
            title="One notification layer across API events, live sessions, and delivery logs."
            description="The public site can stay content-focused while still proving that shared UI tokens and React components work cleanly in Astro."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {platformItems.map((item) => {
              const Icon = item.icon;

              return (
                <Card className="p-5" key={item.title}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-9 place-items-center rounded-sm border bg-secondary/55">
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="secondary">{item.label}</Badge>
                  </div>
                  <Typography as="h3" variant="heading6" className="mt-6">
                    {item.title}
                  </Typography>
                  <Typography as="p" className="mt-3 text-muted-foreground">
                    {item.description}
                  </Typography>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/25" id="architecture">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader
            eyebrow="Architecture"
            title="Built around tenant controls before fanout starts."
            description="Org subscription limits, scoped keys, socket token expiry, throttles, and delivery state sit in the request path instead of being bolted on later."
          />

          <Card className="bg-background p-2">
            {architectureSteps.map((step, index) => (
              <div className="flex items-start gap-4 border-b p-4 last:border-b-0" key={step}>
                <span className="grid size-7 shrink-0 place-items-center rounded-sm border bg-secondary font-mono text-xs">
                  {index + 1}
                </span>
                <div>
                  <Typography as="p" className="font-medium">
                    {step}
                  </Typography>
                  <Typography as="p" variant="muted" className="mt-1">
                    Guarded by API auth, org policy, delivery idempotency, and runtime health.
                  </Typography>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section className="border-b" id="logs">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <SectionHeader
              eyebrow="Observability"
              title="Debuggable delivery state for product and support teams."
              description="Every notification gets an explicit state transition trail, latency timing, and organization context."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Gauge, label: "Latency" },
                { icon: ShieldCheck, label: "Policy" },
                { icon: Zap, label: "Fanout" },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card className="flex-row items-center gap-3 px-4 py-3" key={item.label}>
                    <Icon className="size-4" />
                    <Typography as="p" className="font-medium">
                      {item.label}
                    </Typography>
                  </Card>
                );
              })}
            </div>
          </div>

          <DeliveryLog />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-6">
        <Card className="bg-foreground p-6 text-background md:p-8">
          <CardHeader className="px-0">
            <Typography as="p" className="font-mono text-background/60 text-xs uppercase">
              Static-first option
            </Typography>
            <CardTitle className="mt-2 text-3xl leading-tight">
              Astro can own the public site cleanly.
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 px-0 md:grid-cols-[1fr_auto] md:items-end">
            <Typography as="p" className="max-w-2xl text-background/70">
              This app keeps marketing content separate from the product app while still sharing
              React UI components, design tokens, Tailwind, and package versions.
            </Typography>
            <Button asChild className="bg-background text-foreground hover:bg-background/90">
              <a href={marketingUrls.signup}>
                Create workspace
                <ArrowRight />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}

function SectionHeader({
  description,
  eyebrow,
  title,
}: Readonly<{ description: string; eyebrow: string; title: string }>) {
  return (
    <div className="max-w-3xl">
      <Typography as="p" className="font-mono text-muted-foreground text-xs uppercase">
        {eyebrow}
      </Typography>
      <Typography as="h2" variant="heading2" className="mt-3 border-b-0 pb-0">
        {title}
      </Typography>
      <Typography as="p" className="mt-4 text-muted-foreground">
        {description}
      </Typography>
    </div>
  );
}

function DeveloperPanel() {
  return (
    <Card className="overflow-hidden bg-[#0f1115] text-white">
      <div className="flex items-center justify-between border-white/10 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-sm border border-white/10 bg-white/5">
            <Braces className="size-4 text-emerald-300" />
          </div>
          <div>
            <Typography as="p" className="font-medium text-sm text-white">
              publish.ts
            </Typography>
            <Typography as="p" className="text-white/45 text-xs">
              typed notification event
            </Typography>
          </div>
        </div>
        <Badge variant="success">SSR</Badge>
      </div>

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
    </Card>
  );
}

function DeliveryLog() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Typography as="p" className="font-medium">
          Delivery log
        </Typography>
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
            {deliveryRows.map((row) => (
              <tr className="border-b last:border-b-0" key={`${row.org}-${row.event}`}>
                <td className="px-4 py-3 font-mono">{row.event}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.org}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.status === "delivered" ? "success" : "info"}>
                    {row.status}
                  </Badge>
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

export { MarketingHome };
