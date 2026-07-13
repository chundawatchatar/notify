import { Badge, Card, CardDescription, CardHeader, CardTitle, Typography } from "@notify/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function PageHero({
  badge,
  children,
  description,
  title,
}: Readonly<{ badge: string; children?: ReactNode; description: string; title: string }>) {
  return (
    <section className="border-b bg-secondary/25">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-6 lg:py-20">
        <Badge variant="secondary">{badge}</Badge>
        <Typography
          as="h1"
          className="mt-5 max-w-4xl font-semibold text-4xl leading-[1.08] tracking-normal md:text-6xl md:leading-[1.04]"
        >
          {title}
        </Typography>
        <Typography as="p" variant="lead" className="mt-5 max-w-3xl">
          {description}
        </Typography>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: Readonly<{ description: string; eyebrow: string; title: string }>) {
  return (
    <div className="max-w-3xl">
      <Typography as="p" className="font-mono text-primary text-xs uppercase">
        {eyebrow}
      </Typography>
      <Typography as="h2" variant="heading2" className="mt-3">
        {title}
      </Typography>
      <Typography as="p" className="mt-4 text-muted-foreground">
        {description}
      </Typography>
    </div>
  );
}

function FeatureCard({
  description,
  icon: Icon,
  label,
  title,
}: Readonly<{ description: string; icon: LucideIcon; label?: string; title: string }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 place-items-center rounded-sm border border-accent-foreground/15 bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
          {label ? <Badge variant="secondary">{label}</Badge> : null}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function MetricStrip({ items }: Readonly<{ items: Array<[label: string, value: string]> }>) {
  return (
    <div className="grid max-w-3xl border-y sm:grid-cols-3">
      {items.map(([label, value]) => (
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
  );
}

export { FeatureCard, MetricStrip, PageHero, SectionIntro };
