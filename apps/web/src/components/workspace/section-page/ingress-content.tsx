import type {
  ApiNotificationApp,
  ApiNotificationAppEnvironment,
  ApiNotificationIngressEvent,
  ApiNotificationRequest,
} from "@notify/api-client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notify/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { Check, Copy, RefreshCw, Webhook } from "lucide-react";
import { useState } from "react";
import {
  createNotificationIngressTestEvent,
  getNotificationIngress,
  listNotificationApps,
  listNotificationIngressEvents,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { formatDate, requestErrorMessage } from "@/lib/form-utils";
import { workspaceQueryKey } from "@/lib/workspace-queries";
import type { WorkspaceSecuritySearch } from "../workspace-security-page";
import { ChecklistCard } from "./cards";
import { ingressRules } from "./data";

const testEvent: ApiNotificationRequest = {
  event: "test.notification_sent",
  recipient: { id: "dashboard-test" },
  payload: { source: "notify-dashboard" },
};

function IngressContent({
  search,
  workspaceSlug,
}: Readonly<{ search?: WorkspaceSecuritySearch; workspaceSlug: string }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const appsQueryKey = workspaceQueryKey(workspaceSlug, "apps");
  const appsQuery = useQuery({
    queryKey: appsQueryKey,
    queryFn: () => auth.authenticatedRequest(listNotificationApps),
  });
  const selectedApp = selectApp(appsQuery.data?.apps ?? [], search?.app);
  const selectedEnvironment = selectedApp
    ? selectEnvironment(selectedApp, search?.environment)
    : undefined;
  const scope =
    selectedApp && selectedEnvironment
      ? { appId: selectedApp.id, environmentId: selectedEnvironment.id }
      : undefined;
  const selectedSearch =
    selectedApp && selectedEnvironment
      ? { app: selectedApp.slug, environment: selectedEnvironment.slug }
      : undefined;
  const detailsQueryKey = scope
    ? workspaceQueryKey(workspaceSlug, "ingress", "details", scope.appId, scope.environmentId)
    : workspaceQueryKey(workspaceSlug, "ingress", "details");
  const eventsQueryKey = scope
    ? workspaceQueryKey(workspaceSlug, "ingress", "events", scope.appId, scope.environmentId)
    : workspaceQueryKey(workspaceSlug, "ingress", "events");
  const detailsQuery = useQuery({
    enabled: Boolean(scope),
    queryKey: detailsQueryKey,
    queryFn: () =>
      auth.authenticatedRequest((token) =>
        getNotificationIngress(token, scope?.appId ?? "", scope?.environmentId ?? ""),
      ),
  });
  const eventsQuery = useQuery({
    enabled: Boolean(scope),
    queryKey: eventsQueryKey,
    queryFn: () =>
      auth.authenticatedRequest((token) =>
        listNotificationIngressEvents(token, scope?.appId ?? "", scope?.environmentId ?? ""),
      ),
  });
  const testEventMutation = useMutation({
    mutationFn: () => {
      if (!scope) {
        throw new Error("Select an environment before sending a test event.");
      }

      return auth.authenticatedRequest((token) =>
        createNotificationIngressTestEvent(token, scope.appId, scope.environmentId, testEvent),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ exact: true, queryKey: eventsQueryKey });
    },
  });

  if (appsQuery.isPending) {
    return <p className="text-muted-foreground text-sm">Loading notification apps...</p>;
  }

  if (appsQuery.isError) {
    return <RequestError error={appsQuery.error} onRetry={() => void appsQuery.refetch()} />;
  }

  if (appsQuery.data.apps.length === 0 || !selectedApp || !selectedEnvironment) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="font-medium text-sm">No notification environment is available.</p>
          <p className="text-muted-foreground text-sm">
            Create a notification app before inspecting its ingress endpoint.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (search?.app !== selectedSearch?.app || search?.environment !== selectedSearch?.environment) {
    return (
      <Navigate
        params={{ section: "ingress", workspaceSlug }}
        replace
        search={(current) => ({ ...current, ...selectedSearch })}
        to="/w/$workspaceSlug/$section"
      />
    );
  }

  const endpoint = detailsQuery.data?.data.endpoint ?? "POST /api/v1/notifications";

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedApp.name} / {selectedEnvironment.name}
            </CardTitle>
            <CardDescription>Environment-scoped notification intake contract.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-sm border bg-secondary/35 p-4">
              <p className="text-muted-foreground text-xs">Endpoint</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="break-all font-mono text-sm">{endpoint}</p>
                <Button
                  aria-label="Copy endpoint"
                  onClick={() => void copyEndpoint(endpoint)}
                  size="icon"
                  variant="ghost"
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
            </div>
            <ContractLine label="Auth" value="Environment-scoped server API key" />
            <ContractLine label="Idempotency" value="24 hour replay window" />
            <ContractLine label="Payload" value="Event, recipient, payload, and safe metadata" />
          </CardContent>
        </Card>
        <ChecklistCard
          description="Request controls applied before an event is accepted."
          icon={Webhook}
          items={ingressRules}
          title="Ingress rules"
        />
        <Card>
          <CardHeader>
            <CardTitle>Test event</CardTitle>
            <CardDescription>
              Sends a synthetic event through the authenticated dashboard boundary. No server API
              key is exposed to the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {testEventMutation.isSuccess ? (
              <Alert role="status" severity="success">
                <AlertTitle>Test event accepted</AlertTitle>
                Event {testEventMutation.data.data.event_id} was accepted for this environment.
              </Alert>
            ) : null}
            {testEventMutation.isError ? (
              <Alert severity="error">
                <AlertTitle>Test event failed</AlertTitle>
                {requestErrorMessage(testEventMutation.error)}
              </Alert>
            ) : null}
            <Button
              disabled={testEventMutation.isPending}
              onClick={() => {
                testEventMutation.reset();
                void testEventMutation.mutateAsync();
              }}
            >
              <Webhook />
              {testEventMutation.isPending ? "Sending test event..." : "Send test event"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <RecentEvents
        error={eventsQuery.error}
        events={eventsQuery.data?.events ?? []}
        isError={eventsQuery.isError}
        isLoading={eventsQuery.isPending}
        onRetry={() => void eventsQuery.refetch()}
        environment={selectedEnvironment}
      />
    </div>
  );

  async function copyEndpoint(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }
}

function RecentEvents({
  environment,
  error,
  events,
  isError,
  isLoading,
  onRetry,
}: Readonly<{
  environment: ApiNotificationAppEnvironment;
  error: unknown;
  events: readonly ApiNotificationIngressEvent[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent accepted events</CardTitle>
        <CardDescription>
          Safe event summaries for {environment.name}. Payloads stay out of the browser cache.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading accepted events...</p>
        ) : null}
        {isError ? <RequestError error={error} onRetry={onRetry} /> : null}
        {!isLoading && !isError && events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No accepted events yet.</p>
        ) : null}
        {!isLoading && !isError && events.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Publish state</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.event_id}>
                  <TableCell className="font-mono text-xs">{event.event}</TableCell>
                  <TableCell>{event.recipient_id}</TableCell>
                  <TableCell>
                    <Badge variant={event.source === "dashboard_test" ? "info" : "success"}>
                      {event.source === "dashboard_test" ? "Test event" : "Public API"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.delivery_status === "published" ? "success" : "info"}>
                      {event.delivery_status === "published"
                        ? "PubSub handoff complete"
                        : event.delivery_status === "processing"
                          ? "Publishing"
                          : "Awaiting publish"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatDate(event.accepted_at, { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ContractLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function RequestError({ error, onRetry }: Readonly<{ error: unknown; onRetry: () => void }>) {
  return (
    <Alert severity="error">
      <AlertTitle>Ingress data could not be loaded</AlertTitle>
      <div className="flex flex-wrap items-center gap-3">
        <span>{requestErrorMessage(error)}</span>
        <Button onClick={onRetry} size="sm" variant="outline">
          <RefreshCw />
          Try again
        </Button>
      </div>
    </Alert>
  );
}

function selectApp(apps: readonly ApiNotificationApp[], appSlug: string | undefined) {
  return apps.find((app) => app.slug === appSlug) ?? apps[0];
}

function selectEnvironment(app: ApiNotificationApp, environmentSlug: string | undefined) {
  return (
    app.environments.find((environment) => environment.slug === environmentSlug) ??
    app.environments.find((environment) => !environment.production) ??
    app.environments[0]
  );
}

export { IngressContent };
