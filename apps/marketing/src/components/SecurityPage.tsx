import { Card, CardContent, Typography } from "@notify/ui";
import {
  FileClock,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { FeatureCard, PageHero, SectionIntro } from "./MarketingSections";
import { MarketingShell } from "./MarketingShell";

const controls = [
  {
    title: "Scoped keys",
    description: "Separate publish permissions from client token creation and workspace settings.",
    icon: KeyRound,
    label: "API",
  },
  {
    title: "Origin policy",
    description: "Limit realtime client access to approved customer app origins.",
    icon: LockKeyhole,
    label: "Client",
  },
  {
    title: "Workspace roles",
    description: "Prepare for profile, settings, and logout flows with role-aware access.",
    icon: UserCheck,
    label: "Team",
  },
  {
    title: "Audit trail",
    description: "Track key rotation, app changes, subscription changes, and event retention.",
    icon: FileClock,
    label: "Audit",
  },
];

function SecurityPage() {
  return (
    <MarketingShell activePage="security">
      <PageHero
        badge="Security"
        description="Notification infrastructure sits in a sensitive path between backend services and customer-facing clients. Notify keeps auth, policy, origins, and auditability visible."
        title="Security controls for notification operations."
      />

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-6">
        <SectionIntro
          description="These controls match the platform requirements for API access, client apps, team settings, and future enterprise workspaces."
          eyebrow="Controls"
          title="Policy before fanout, visibility after delivery."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {controls.map((control) => (
            <FeatureCard key={control.title} {...control} />
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/25">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro
            description="Every event should be validated against workspace policy before it reaches active clients."
            eyebrow="Runtime policy"
            title="Guard the path from backend event to client notification."
          />

          <Card className="bg-background">
            <CardContent className="grid gap-3 p-5">
              {[
                ["Authenticate key", "publish permission verified"],
                ["Validate origin", "client app origin allowed"],
                ["Check subscription", "workspace usage under limit"],
                ["Write audit context", "event and policy result recorded"],
              ].map(([title, description]) => (
                <div className="flex items-start gap-3 rounded-sm border p-3" key={title}>
                  <span className="grid size-9 place-items-center rounded-sm bg-secondary">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div>
                    <Typography as="p" className="font-medium text-sm">
                      {title}
                    </Typography>
                    <Typography as="p" className="text-muted-foreground text-sm">
                      {description}
                    </Typography>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:px-6 lg:grid-cols-[0.7fr_1.3fr]">
        <SectionIntro
          description="Enterprise controls can expand naturally without changing the public API shape."
          eyebrow="Enterprise path"
          title="Ready for SSO, retention, and stronger audit exports."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["SAML SSO", "Centralize team access when workspaces become larger."],
            [
              "Retention policy",
              "Keep delivery history aligned with customer and plan requirements.",
            ],
            ["Audit exports", "Export key and configuration changes for compliance workflows."],
            ["Dedicated support", "Give high-volume workspaces a clear escalation path."],
          ].map(([title, description]) => (
            <Card key={title}>
              <CardContent className="p-5">
                <Fingerprint className="size-5 text-muted-foreground" />
                <Typography as="h3" variant="heading6" className="mt-4">
                  {title}
                </Typography>
                <Typography as="p" className="mt-2 text-muted-foreground">
                  {description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

export { SecurityPage };
