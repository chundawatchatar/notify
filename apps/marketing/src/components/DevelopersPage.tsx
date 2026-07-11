import { Badge, Card, CardContent, Typography } from "@notify/ui";
import { Braces, Code2, KeyRound, PlugZap, ShieldCheck } from "lucide-react";
import { FeatureCard, PageHero, SectionIntro } from "./MarketingSections";
import { MarketingShell } from "./MarketingShell";

const developerFeatures = [
  {
    title: "Scoped API keys",
    description: "Issue per-app keys with the smallest useful permissions for each client surface.",
    icon: KeyRound,
    label: "Keys",
  },
  {
    title: "Typed payloads",
    description:
      "Keep event topics, recipients, and payload shape explicit before delivery starts.",
    icon: Braces,
    label: "Events",
  },
  {
    title: "Webhook-style ingress",
    description: "Send notification events from backend services without coupling to live clients.",
    icon: PlugZap,
    label: "POST",
  },
  {
    title: "Origin controls",
    description: "Restrict realtime client tokens to approved customer app origins.",
    icon: ShieldCheck,
    label: "Policy",
  },
];

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
  "  topic: 'invoice.payment_failed',",
  "  payload: { invoiceId: invoice.id },",
  "})",
];

function DevelopersPage() {
  return (
    <MarketingShell activePage="developers">
      <PageHero
        badge="Developers"
        description="Build notification apps against a small API surface: scoped keys, typed events, realtime client tokens, and delivery logs that can be debugged by the whole team."
        title="Developer tooling for notification delivery."
      />

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-6">
        <SectionIntro
          description="The developer experience is API-first because client apps should not own notification infrastructure."
          eyebrow="API surface"
          title="Everything starts with an event."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {developerFeatures.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/25" id="ingress-api">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro
            description="One publish call should capture the recipient, topic, payload, workspace policy, and delivery trace."
            eyebrow="Ingress API"
            title="A compact API for backend-triggered notifications."
          />

          <Card className="overflow-hidden bg-[#0f1115] text-white">
            <div className="flex items-center justify-between border-white/10 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-sm border border-white/10 bg-white/5">
                  <Code2 className="size-4 text-emerald-300" />
                </span>
                <div>
                  <Typography as="p" className="font-medium text-sm text-white">
                    publish.ts
                  </Typography>
                  <Typography as="p" className="text-white/45 text-xs">
                    typed notification event
                  </Typography>
                </div>
              </div>
              <Badge variant="success">SDK</Badge>
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-7">
              <code>
                {codeLines.map((line, index) => (
                  <span className="block" key={`${line}-${index}`}>
                    <span className="mr-5 select-none text-white/25">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={line.startsWith("await") ? "text-emerald-300" : "text-white/82"}
                    >
                      {line || " "}
                    </span>
                  </span>
                ))}
              </code>
            </pre>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:px-6 lg:grid-cols-3">
        {[
          ["Create a workspace", "Set up apps, origins, and scoped keys."],
          ["Publish backend events", "Use idempotent event ids and stable topics."],
          ["Inspect delivery state", "Debug queued, delivered, retried, and failed events."],
        ].map(([title, description], index) => (
          <Card key={title}>
            <CardContent className="p-5">
              <span className="grid size-8 place-items-center rounded-sm border bg-secondary font-mono text-xs">
                {index + 1}
              </span>
              <Typography as="h3" variant="heading6" className="mt-5">
                {title}
              </Typography>
              <Typography as="p" className="mt-2 text-muted-foreground">
                {description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </section>
    </MarketingShell>
  );
}

export { DevelopersPage };
