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
import { ArrowUpRight, BellRing, Copy, Plus, SlidersHorizontal } from "lucide-react";
import type { WorkspaceSectionId } from "@/lib/workspace-sections";
import type { WorkspaceSecuritySearch } from "../workspace-security-page";
import { WorkspaceSecurityPage } from "../workspace-security-page";
import { AnalyticsContent } from "./analytics-content";
import { ChecklistCard } from "./cards";
import { appRows, appSetup, notificationPreferences, workspaceSettings } from "./data";
import { IngressContent } from "./ingress-content";

function SectionActions({ section }: Readonly<{ section: WorkspaceSectionId }>) {
  if (section === "apps") {
    return (
      <>
        <Button variant="outline">
          <Copy />
          Client docs
        </Button>
        <Button>
          <Plus />
          New app
        </Button>
      </>
    );
  }

  if (section === "security" || section === "ingress" || section === "analytics") {
    return null;
  }

  return (
    <Button variant="outline">
      <ArrowUpRight />
      Open details
    </Button>
  );
}

function SectionContent({
  search,
  section,
  workspaceSlug,
}: Readonly<{
  search?: WorkspaceSecuritySearch;
  section: WorkspaceSectionId;
  workspaceSlug: string;
}>) {
  if (section === "apps") {
    return <AppsContent />;
  }

  if (section === "ingress") {
    return <IngressContent search={search} workspaceSlug={workspaceSlug} />;
  }

  if (section === "analytics") {
    return <AnalyticsContent workspaceSlug={workspaceSlug} />;
  }

  if (section === "subscription") {
    return <SubscriptionContent />;
  }

  if (section === "security") {
    return <WorkspaceSecurityPage search={search ?? {}} workspaceSlug={workspaceSlug} />;
  }

  return <SettingsContent />;
}

function AppsContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
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
                <TableHead>Origin</TableHead>
                <TableHead>Client key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appRows.map((app) => (
                <TableRow key={app.clientKey}>
                  <TableCell>
                    <div className="font-medium">{app.name}</div>
                    <div className="text-muted-foreground text-xs">{app.environment}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{app.origin}</TableCell>
                  <TableCell className="font-mono text-xs">{app.clientKey}</TableCell>
                  <TableCell>
                    <Badge variant={app.tone}>{app.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{app.events}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <ChecklistCard
          description="Minimum setup for a production-ready app."
          icon={BellRing}
          items={appSetup}
          title="App setup"
        />
        <Card>
          <CardHeader>
            <CardTitle>App capacity</CardTitle>
            <CardDescription>Workspace limits for client surfaces.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <UsageBar label="Apps" value={45} detail="9 of 20 notification apps" />
            <UsageBar label="Client origins" value={60} detail="12 of 20 trusted origins" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubscriptionContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Scale plan</CardTitle>
              <CardDescription>Renews Aug 1, 2026.</CardDescription>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <StatusLine label="Monthly events" value="1M" />
          <StatusLine label="Notification apps" value="20" />
          <StatusLine label="Team seats" value="20" />
          <StatusLine label="Support tier" value="Priority" />
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

function SettingsContent() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <ChecklistCard
        description="Core workspace defaults applied across every app."
        icon={SlidersHorizontal}
        items={workspaceSettings}
        title="Workspace settings"
      />
      <ChecklistCard
        description="Operational alerts for delivery and usage thresholds."
        icon={BellRing}
        items={notificationPreferences}
        title="Notification preferences"
      />
    </div>
  );
}

export { SectionActions, SectionContent };
