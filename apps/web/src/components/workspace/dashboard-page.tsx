import type { ApiNotificationIngressEvent } from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notify/ui";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import { listNotificationApps, listNotificationIngressEvents } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { formatDate, requestErrorMessage } from "@/lib/form-utils";
import { workspaceQueryKey } from "@/lib/workspace-queries";
import { WorkspacePageHeader, WorkspaceShell } from "./shell";

type EnvironmentScope = {
  appId: string;
  appName: string;
  environmentId: string;
  environmentName: string;
};

type WorkspaceDeliveryEvent = ApiNotificationIngressEvent & EnvironmentScope;

function DashboardPage() {
  const auth = useAuth();
  const workspaceSlug = auth.principal?.workspace.slug;
  const workspaceQuerySlug = workspaceSlug ?? "";

  const appsQuery = useQuery({
    enabled: Boolean(workspaceSlug),
    queryKey: workspaceQueryKey(workspaceQuerySlug, "apps"),
    queryFn: () => auth.authenticatedRequest(listNotificationApps),
  });
  const environmentScopes: EnvironmentScope[] = (appsQuery.data?.apps ?? []).flatMap((app) =>
    app.environments.map((environment) => ({
      appId: app.id,
      appName: app.name,
      environmentId: environment.id,
      environmentName: environment.name,
    })),
  );
  const eventQueries = useQueries({
    queries: environmentScopes.map((scope) => ({
      queryKey: workspaceQueryKey(
        workspaceQuerySlug,
        "ingress",
        "events",
        scope.appId,
        scope.environmentId,
      ),
      queryFn: () =>
        auth.authenticatedRequest((token) =>
          listNotificationIngressEvents(token, scope.appId, scope.environmentId),
        ),
    })),
  });
  const eventError = eventQueries.find((query) => query.isError)?.error;
  const isLoading = appsQuery.isPending || eventQueries.some((query) => query.isPending);
  const events = eventQueries
    .flatMap((query, index) => {
      const scope = environmentScopes[index];

      return scope ? (query.data?.events ?? []).map((event) => ({ ...event, ...scope })) : [];
    })
    .sort((left, right) => right.accepted_at.localeCompare(left.accepted_at))
    .slice(0, 12);
  const environmentCount = environmentScopes.length;
  const readyEnvironmentCount =
    appsQuery.data?.apps.reduce(
      (total, app) =>
        total + app.environments.filter((environment) => environment.readiness.ready).length,
      0,
    ) ?? 0;

  if (!workspaceSlug) {
    throw new Error("Dashboard requires an active workspace.");
  }

  return (
    <WorkspaceShell activeItem="dashboard">
      <WorkspacePageHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link params={{ section: "ingress", workspaceSlug }} to="/w/$workspaceSlug/$section">
                <ArrowUpRight />
                Open ingress
              </Link>
            </Button>
            <Button asChild>
              <Link params={{ section: "apps", workspaceSlug }} to="/w/$workspaceSlug/$section">
                <Plus />
                New app
              </Link>
            </Button>
          </>
        }
        badges={
          <>
            <Badge variant="info">Best-effort realtime</Badge>
            <Badge variant="secondary">{auth.principal?.workspace.name ?? "Workspace"}</Badge>
          </>
        }
        description="Inspect notification app readiness and the realtime publish handoff state of recent accepted events."
        title="Dashboard"
      />

      {isLoading ? (
        <DashboardMessage
          description="Loading notification apps and recent delivery handoffs."
          title="Loading dashboard data..."
        />
      ) : appsQuery.isError || eventError ? (
        <Alert severity="error">
          <AlertTitle>Dashboard data could not be loaded</AlertTitle>
          <p>{requestErrorMessage(appsQuery.error ?? eventError)}</p>
          <Button
            className="mt-3"
            onClick={() => {
              void appsQuery.refetch();
              for (const query of eventQueries) {
                void query.refetch();
              }
            }}
            size="sm"
            variant="outline"
          >
            <RefreshCw />
            Try again
          </Button>
        </Alert>
      ) : appsQuery.data.apps.length === 0 ? (
        <Card>
          <CardContent className="grid gap-3 py-8">
            <p className="font-medium text-sm">No notification apps yet.</p>
            <p className="text-muted-foreground text-sm">
              Create an app to configure an environment and start accepting notification events.
            </p>
            <Button asChild className="w-fit" size="sm">
              <Link params={{ section: "apps", workspaceSlug }} to="/w/$workspaceSlug/$section">
                <Plus />
                Create notification app
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetric
              detail="In the active workspace"
              label="Notification apps"
              value={appsQuery.data.apps.length}
            />
            <DashboardMetric
              detail="Development and production scopes"
              label="Environments"
              value={environmentCount}
            />
            <DashboardMetric
              detail="Client key and trusted origin configured"
              label="Ready environments"
              value={readyEnvironmentCount}
            />
            <DashboardMetric
              detail="Latest safe summaries loaded"
              label="Recent events"
              value={events.length}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent delivery handoffs</CardTitle>
              <CardDescription>
                Published means handed to Phoenix PubSub. It does not confirm that a client received
                or rendered the notification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No accepted events yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-sm border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>App / environment</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Publish state</TableHead>
                        <TableHead>Accepted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <DeliveryEventRow event={event} key={event.event_id} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </WorkspaceShell>
  );
}

function DashboardMetric({
  detail,
  label,
  value,
}: Readonly<{ detail: string; label: string; value: number }>) {
  return (
    <StatCard>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 font-semibold text-2xl">{value}</p>
      <p className="mt-3 text-muted-foreground text-sm">{detail}</p>
    </StatCard>
  );
}

function DashboardMessage({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <Card>
      <CardContent className="grid gap-2 py-8">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function DeliveryEventRow({ event }: Readonly<{ event: WorkspaceDeliveryEvent }>) {
  return (
    <TableRow>
      <TableCell>
        <p className="font-mono text-sm">{event.event}</p>
        <p className="text-muted-foreground font-mono text-xs">{event.event_id}</p>
      </TableCell>
      <TableCell>
        <p className="font-medium text-sm">{event.appName}</p>
        <p className="text-muted-foreground text-xs">{event.environmentName}</p>
      </TableCell>
      <TableCell className="font-mono text-xs">{event.recipient_id}</TableCell>
      <TableCell>
        <Badge variant={event.source === "dashboard_test" ? "info" : "secondary"}>
          {event.source === "dashboard_test" ? "Dashboard test" : "Public API"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={deliveryBadgeVariant(event.delivery_status)}>
          {deliveryStatusLabel(event.delivery_status)}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {formatDate(event.accepted_at, { dateStyle: "medium", timeStyle: "short" })}
      </TableCell>
    </TableRow>
  );
}

function deliveryStatusLabel(status: ApiNotificationIngressEvent["delivery_status"]) {
  if (status === "published") {
    return "PubSub handoff complete";
  }

  if (status === "processing") {
    return "Publishing";
  }

  return "Awaiting publish";
}

function deliveryBadgeVariant(status: ApiNotificationIngressEvent["delivery_status"]) {
  if (status === "published") {
    return "success";
  }

  if (status === "processing") {
    return "info";
  }

  return "warning";
}

export { DashboardPage };
