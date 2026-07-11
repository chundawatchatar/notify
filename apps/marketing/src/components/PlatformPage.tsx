import { Badge, Card, CardContent, Typography } from "@notify/ui";
import { BarChart3, Database, Gauge, KeyRound, RadioTower, ShieldCheck } from "lucide-react";
import { FeatureCard, MetricStrip, PageHero, SectionIntro } from "./MarketingSections";
import { MarketingShell } from "./MarketingShell";

const platformFeatures = [
  {
    title: "Event ingress",
    description: "Accept signed notification events with scoped API keys and replay-safe ids.",
    icon: KeyRound,
    label: "API",
  },
  {
    title: "Realtime fanout",
    description:
      "Route events to active browser sessions without application servers tracking sockets.",
    icon: RadioTower,
    label: "Live",
  },
  {
    title: "Delivery history",
    description:
      "Store delivered, queued, failed, retried, and throttled states with workspace context.",
    icon: Database,
    label: "Logs",
  },
  {
    title: "Usage limits",
    description:
      "Keep notification traffic aligned with plan limits, thresholds, and subscriptions.",
    icon: BarChart3,
    label: "Billing",
  },
  {
    title: "Policy controls",
    description: "Use origin checks, scoped keys, and tenant policies before fanout starts.",
    icon: ShieldCheck,
    label: "Secure",
  },
  {
    title: "Operational health",
    description: "Watch fanout latency, ingress pressure, and retry behavior from one workspace.",
    icon: Gauge,
    label: "Health",
  },
];

const architectureSteps = [
  "Backend sends a signed notification event",
  "Notify validates workspace policy and subscription limits",
  "Fanout resolves active realtime sessions",
  "Delivery state is stored for analytics, support, and audits",
];

function PlatformPage() {
  return (
    <MarketingShell activePage="platform">
      <PageHero
        badge="Platform"
        description="Notify gives product teams one infrastructure layer for notification apps, event ingress, realtime delivery, delivery logs, and subscription-aware usage controls."
        title="The notification control plane for every customer app."
      >
        <MetricStrip
          items={[
            ["p95 fanout", "94ms"],
            ["delivery", "99.7%"],
            ["events", "1M/mo"],
          ]}
        />
      </PageHero>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-6">
        <SectionIntro
          description="Each capability maps to a platform requirement we already know we need for the product and API surface."
          eyebrow="Capabilities"
          title="Built for notification apps, not generic messages."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformFeatures.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/25" id="architecture">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionIntro
            description="A notification event should pass through auth, policy, routing, delivery, and history without each client app rebuilding that logic."
            eyebrow="Architecture"
            title="A request path designed around tenant controls."
          />

          <Card className="bg-background p-2">
            {architectureSteps.map((step, index) => (
              <div className="flex items-start gap-4 border-b p-4 last:border-b-0" key={step}>
                <span className="grid size-8 shrink-0 place-items-center rounded-sm border bg-secondary font-mono text-xs">
                  {index + 1}
                </span>
                <div>
                  <Typography as="p" className="font-medium">
                    {step}
                  </Typography>
                  <Typography as="p" className="mt-1 text-muted-foreground text-sm">
                    Guarded by API auth, workspace policy, delivery idempotency, and runtime health.
                  </Typography>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section
        className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:px-6 lg:grid-cols-[0.7fr_1.3fr]"
        id="delivery-logs"
      >
        <SectionIntro
          description="Support teams need to answer what happened to a notification without searching app logs, queues, and websocket servers."
          eyebrow="Delivery logs"
          title="Every notification gets a readable state trail."
        />
        <Card>
          <CardContent className="grid gap-3 p-5">
            {[
              ["invoice.payment_failed", "queued", "108ms"],
              ["security.device_added", "delivered", "42ms"],
              ["trial.expiring", "retrying", "212ms"],
            ].map(([event, status, latency]) => (
              <div
                className="grid gap-3 rounded-sm border p-3 md:grid-cols-[1fr_120px_80px]"
                key={event}
              >
                <Typography as="p" className="font-mono text-sm">
                  {event}
                </Typography>
                <Badge variant={status === "retrying" ? "warning" : "info"}>{status}</Badge>
                <Typography as="p" className="font-mono text-sm">
                  {latency}
                </Typography>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}

export { PlatformPage };
