import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Typography,
} from "@notify/ui";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  KeyRound,
  LifeBuoy,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { MarketingShell, marketingUrls } from "./MarketingShell";

const plans = [
  {
    name: "Starter",
    description: "For teams validating notification apps and early client traffic.",
    price: "$29",
    cadence: "per month",
    events: "100k events",
    apps: "3 apps",
    cta: "Start free",
    href: marketingUrls.signup,
    highlighted: false,
    features: ["Realtime delivery logs", "Client API keys", "Basic retries", "Email support"],
  },
  {
    name: "Growth",
    description: "For production teams scaling client-facing notification workflows.",
    price: "$149",
    cadence: "per month",
    events: "1M events",
    apps: "20 apps",
    cta: "Choose Growth",
    href: marketingUrls.signup,
    highlighted: true,
    features: ["Ingress analytics", "Scoped API keys", "Usage alerts", "Priority support"],
  },
  {
    name: "Scale",
    description: "For high-volume workspaces with stricter operational controls.",
    price: "$499",
    cadence: "per month",
    events: "5M events",
    apps: "Unlimited apps",
    cta: "Talk to sales",
    href: marketingUrls.login,
    highlighted: false,
    features: ["SAML SSO", "Audit exports", "Advanced retention", "Dedicated success"],
  },
];

const capabilityGroups = [
  {
    title: "Delivery operations",
    icon: RadioTower,
    details: ["Realtime logs", "Retry visibility", "Ingress health"],
  },
  {
    title: "Subscription control",
    icon: BarChart3,
    details: ["Usage thresholds", "Plan limits", "Workspace billing"],
  },
  {
    title: "Client security",
    icon: ShieldCheck,
    details: ["Scoped keys", "Origin controls", "Audit trails"],
  },
];

const faqs = [
  {
    question: "Where should pricing live?",
    answer:
      "Public pricing belongs on the marketing site. The product app should later have billing screens for plan changes, invoices, usage, and payment methods.",
  },
  {
    question: "Can we change plans later?",
    answer: "Yes. Plans are designed to move with event volume and the number of client apps.",
  },
  {
    question: "What happens if we exceed the event limit?",
    answer:
      "You keep receiving events. Notify surfaces usage alerts so the team can upgrade calmly.",
  },
];

function PricingPage() {
  return (
    <MarketingShell activePage="pricing">
      <section className="border-b bg-secondary/25">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-6 lg:grid-cols-[1fr_420px] lg:items-center lg:py-20">
          <div>
            <Badge variant="secondary">
              <Sparkles />
              Subscription pricing
            </Badge>
            <Typography
              as="h1"
              className="mt-5 max-w-3xl font-semibold text-4xl leading-[1.08] tracking-normal md:text-6xl md:leading-[1.04]"
            >
              Pricing that follows your notification volume.
            </Typography>
            <Typography as="p" variant="lead" className="mt-5 max-w-2xl">
              Start with client notification apps, then scale into ingress analytics, delivery
              monitoring, and workspace usage controls without rebuilding your stack.
            </Typography>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11">
                <a href={marketingUrls.signup}>
                  Create workspace
                  <ArrowRight />
                </a>
              </Button>
              <Button asChild className="h-11" variant="outline">
                <a href={marketingUrls.login}>Sign in</a>
              </Button>
            </div>
          </div>

          <Card shadow="sm" className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-5">
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                Usage preview
              </CardTitle>
              <CardDescription>How a Growth workspace scales this month.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-5">
              {[
                ["Events delivered", "682k", "68%"],
                ["Notification apps", "9", "45%"],
                ["Active clients", "12.8k", "72%"],
              ].map(([label, value, width]) => (
                <div className="grid gap-2" key={label}>
                  <div className="flex items-center justify-between gap-4">
                    <Typography as="p" className="text-muted-foreground text-sm">
                      {label}
                    </Typography>
                    <Typography as="p" className="font-medium text-sm">
                      {value}
                    </Typography>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width }} />
                  </div>
                </div>
              ))}
              <div className="rounded-sm border bg-secondary/35 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-sm bg-background">
                    <KeyRound className="size-4 text-muted-foreground" />
                  </span>
                  <div>
                    <Typography as="p" className="font-medium text-sm">
                      Scoped client access included
                    </Typography>
                    <Typography as="p" className="mt-1 text-muted-foreground text-sm">
                      Every plan supports per-app API keys and origin controls.
                    </Typography>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-6">
        <div>
          <Typography as="h2" variant="heading3">
            Choose your workspace plan
          </Typography>
          <Typography as="p" className="mt-2 max-w-2xl text-muted-foreground">
            Plans are based on event volume, notification apps, and operational controls.
          </Typography>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/25">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:px-6 lg:grid-cols-3">
          {capabilityGroups.map((group) => {
            const Icon = group.icon;

            return (
              <Card key={group.title} className="bg-background">
                <CardHeader>
                  <span className="grid size-10 place-items-center rounded-sm border bg-secondary">
                    <Icon className="size-4" />
                  </span>
                  <CardTitle>{group.title}</CardTitle>
                  <CardDescription>
                    {group.details.map((detail) => (
                      <span className="mr-2 inline-flex items-center gap-1" key={detail}>
                        <ChevronRight className="size-3" />
                        {detail}
                      </span>
                    ))}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:px-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <Badge variant="outline">
            <LifeBuoy />
            Questions
          </Badge>
          <Typography as="h2" variant="heading3" className="mt-4">
            Subscription details
          </Typography>
          <Typography as="p" className="mt-3 text-muted-foreground">
            A short list for teams comparing Notify against building this billing and usage layer
            themselves.
          </Typography>
        </div>

        <div className="grid gap-3">
          {faqs.map((faq) => (
            <div className="rounded-sm border bg-card p-5" key={faq.question}>
              <Typography as="p" className="font-medium">
                {faq.question}
              </Typography>
              <Typography as="p" className="mt-2 text-muted-foreground text-sm leading-6">
                {faq.answer}
              </Typography>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

function PricingCard({
  plan,
}: Readonly<{
  plan: {
    apps: string;
    cadence: string;
    cta: string;
    description: string;
    events: string;
    features: string[];
    highlighted: boolean;
    href: string;
    name: string;
    price: string;
  };
}>) {
  return (
    <Card className={plan.highlighted ? "relative border-primary shadow-sm" : "relative shadow-sm"}>
      {plan.highlighted ? (
        <Badge className="absolute top-4 right-4" variant="info">
          Most popular
        </Badge>
      ) : null}
      <CardHeader>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="min-h-10">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid flex-1 gap-6">
        <div>
          <div className="flex items-end gap-2">
            <span className="font-semibold text-4xl">{plan.price}</span>
            <span className="pb-1 text-muted-foreground text-sm">{plan.cadence}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <PlanLimit label="Events" value={plan.events} />
            <PlanLimit label="Apps" value={plan.apps} />
          </div>
        </div>

        <ul className="grid gap-3">
          {plan.features.map((feature) => (
            <li className="flex items-start gap-2 text-sm" key={feature}>
              <Check className="mt-0.5 size-4 text-emerald-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          asChild
          className="mt-auto w-full"
          variant={plan.highlighted ? "default" : "outline"}
        >
          <a href={plan.href}>
            {plan.cta}
            <ArrowRight />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanLimit({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-sm border bg-secondary/35 p-3">
      <Typography as="p" className="text-muted-foreground text-xs">
        {label}
      </Typography>
      <Typography as="p" className="mt-1 font-medium text-sm">
        {value}
      </Typography>
    </div>
  );
}

export { PricingPage };
