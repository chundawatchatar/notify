import { Button } from "@notify/ui";
import { createFileRoute } from "@tanstack/react-router";

const deliveryStats = [
  {
    label: "Socket sessions",
    value: "28.4k",
  },
  {
    label: "P95 fanout",
    value: "94ms",
  },
  {
    label: "Delivery rate",
    value: "99.7%",
  },
];

const platformPillars = [
  {
    title: "Realtime by default",
    description:
      "Route messages to connected clients through socket gateways without coupling your product backend to connection state.",
  },
  {
    title: "Operational visibility",
    description:
      "Track delivery attempts, throttling, channel health, and notification history from one dashboard.",
  },
  {
    title: "SaaS ready controls",
    description:
      "Model organizations, subscriptions, API keys, templates, and per-tenant delivery limits from the start.",
  },
];

const deliveryFeed = [
  {
    title: "Invoice paid",
    target: "Acme Cloud",
    state: "Delivered",
  },
  {
    title: "Trial expires soon",
    target: "Northwind",
    state: "Queued",
  },
  {
    title: "Security alert",
    target: "Orbit Labs",
    state: "Streaming",
  },
];

export const Route = createFileRoute("/")({
  component: MarketingHome,
});

function MarketingHome() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a className="font-semibold text-lg" href="/">
            Notify
          </a>
          <div className="hidden items-center gap-7 text-muted-foreground text-sm md:flex">
            <a className="transition-colors hover:text-foreground" href="#platform">
              Platform
            </a>
            <a className="transition-colors hover:text-foreground" href="#reliability">
              Reliability
            </a>
            <a className="transition-colors hover:text-foreground" href="#pricing">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <a href="https://app.notify.tld">Sign in</a>
            </Button>
            <Button asChild>
              <a href="https://app.notify.tld">Start building</a>
            </Button>
          </div>
        </nav>
      </header>

      <section className="border-b bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[minmax(0,0.94fr)_minmax(480px,1.06fr)] lg:py-20">
          <div>
            <p className="font-medium text-muted-foreground text-sm uppercase tracking-normal">
              Notification infrastructure for product teams
            </p>
            <h1 className="mt-5 max-w-3xl font-semibold text-5xl tracking-normal md:text-6xl">
              Notify
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-8">
              Ship in-app notifications, realtime delivery, and tenant-aware controls without
              rebuilding the same messaging layer for every SaaS product.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="https://app.notify.tld">Create workspace</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://docs.notify.tld">Read the docs</a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="font-medium">Live delivery plane</p>
                <p className="text-muted-foreground text-sm">Production cluster</p>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 text-sm">
                Healthy
              </div>
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {deliveryStats.map((stat) => (
                  <div className="rounded-md border bg-background p-4" key={stat.label}>
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <p className="mt-2 font-semibold text-2xl">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                <div className="rounded-md border bg-background p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-medium">Message fanout</p>
                    <p className="text-muted-foreground text-sm">3 regions</p>
                  </div>
                  <div className="grid min-h-56 gap-3 sm:grid-cols-[1fr_120px_1fr]">
                    <div className="grid content-center gap-3">
                      {["API ingest", "Tenant limits", "Delivery log"].map((label) => (
                        <div className="rounded-md border bg-card px-3 py-2 text-sm" key={label}>
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid content-center justify-items-center gap-2">
                      <div className="h-20 w-px bg-border" />
                      <div className="rounded-full border bg-primary px-4 py-2 font-medium text-primary-foreground text-sm">
                        Router
                      </div>
                      <div className="h-20 w-px bg-border" />
                    </div>
                    <div className="grid content-center gap-3">
                      {["Socket EU", "Socket US", "Socket APAC"].map((label) => (
                        <div className="rounded-md border bg-card px-3 py-2 text-sm" key={label}>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border bg-background p-4">
                  <p className="font-medium">Recent messages</p>
                  <div className="mt-4 grid gap-3">
                    {deliveryFeed.map((item) => (
                      <div className="border-b pb-3 last:border-b-0 last:pb-0" key={item.title}>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-muted-foreground text-sm">{item.target}</p>
                        <p className="mt-1 text-sm">{item.state}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:grid-cols-3" id="platform">
        {platformPillars.map((pillar) => (
          <article className="rounded-lg border bg-card p-5" key={pillar.title}>
            <h2 className="font-semibold text-xl tracking-normal">{pillar.title}</h2>
            <p className="mt-3 text-muted-foreground leading-7">{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className="border-y bg-secondary/55" id="reliability">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <h2 className="font-semibold text-3xl tracking-normal">
              Built for noisy production days
            </h2>
            <p className="mt-4 text-muted-foreground leading-7">
              Keep customer-facing notifications moving while protecting tenant limits, socket
              capacity, and backend services from traffic spikes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Rate limits", "Replay safety", "Delivery logs", "Socket auth"].map((item) => (
              <div className="rounded-md border bg-background px-4 py-3 font-medium" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14" id="pricing">
        <div className="flex flex-col gap-5 border-b pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold text-3xl tracking-normal">
              Start simple, scale deliberately
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-7">
              The platform is designed around organizations, usage limits, and subscription-aware
              delivery controls from day one.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href="https://app.notify.tld">Join early access</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
