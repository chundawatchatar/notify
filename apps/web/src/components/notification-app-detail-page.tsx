import type { ApiNotificationApp, ApiNotificationAppEnvironment } from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@notify/ui";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { getNotificationApp } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { workspaceQueryKey } from "@/lib/workspace-queries";
import { EnvironmentConfigurationControls } from "./environment-configuration-controls";
import { WorkspacePageHeader, WorkspaceShell } from "./workspace-shell";

function NotificationAppDetailPage({
  appSlug,
  environmentSlug,
  workspaceSlug,
}: Readonly<{
  appSlug: string;
  environmentSlug: string;
  workspaceSlug: string;
}>) {
  const auth = useAuth();
  const appQuery = useQuery({
    queryKey: workspaceQueryKey(workspaceSlug, "apps", appSlug),
    queryFn: () =>
      auth.authenticatedRequest((accessToken) => getNotificationApp(accessToken, appSlug)),
  });

  return (
    <WorkspaceShell activeItem="apps">
      {appQuery.isPending ? <p className="text-muted-foreground text-sm">Loading app...</p> : null}
      {appQuery.isError ? (
        <RequestError error={appQuery.error} onRetry={() => void appQuery.refetch()} />
      ) : null}
      {appQuery.data ? (
        <AppEnvironmentDetail
          app={appQuery.data}
          environmentSlug={environmentSlug}
          workspaceSlug={workspaceSlug}
        />
      ) : null}
    </WorkspaceShell>
  );
}

function AppEnvironmentDetail({
  app,
  environmentSlug,
  workspaceSlug,
}: Readonly<{
  app: ApiNotificationApp;
  environmentSlug: string;
  workspaceSlug: string;
}>) {
  const environment = app.environments.find((candidate) => candidate.slug === environmentSlug);

  if (!environment) {
    return (
      <Alert severity="error">
        <AlertTitle>Environment unavailable</AlertTitle>
        This environment does not belong to {app.name}.
      </Alert>
    );
  }

  return (
    <div className="grid gap-8">
      <WorkspacePageHeader
        badges={
          <div className="flex flex-wrap gap-2">
            <Badge variant={environment.production ? "success" : "secondary"}>
              {environment.name}
            </Badge>
            <Badge variant={environment.readiness.ready ? "success" : "outline"}>
              {environment.readiness.ready ? "Ready" : "Setup incomplete"}
            </Badge>
          </div>
        }
        description="Select an environment to keep its configuration context explicit and shareable."
        title={app.name}
      />
      <EnvironmentSelector app={app} environment={environment} workspaceSlug={workspaceSlug} />
      <SetupChecklist environment={environment} />
      <EnvironmentConfigurationControls
        appSlug={app.slug}
        environmentSlug={environment.slug}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}

function SetupChecklist({ environment }: Readonly<{ environment: ApiNotificationAppEnvironment }>) {
  const requirements = [
    {
      href: "#client-keys",
      label: "Active client key",
      missing: environment.readiness.missing_requirements.includes("client_key"),
    },
    {
      href: "#trusted-origins",
      label: "Trusted origin",
      missing: environment.readiness.missing_requirements.includes("trusted_origin"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup checklist</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {requirements.map((requirement) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm border p-3"
            key={requirement.label}
          >
            <div className="flex items-center gap-2 text-sm">
              {requirement.missing ? (
                <Circle className="size-4 text-muted-foreground" />
              ) : (
                <CheckCircle2 className="size-4 text-foreground" />
              )}
              <span>{requirement.label}</span>
              <Badge variant={requirement.missing ? "outline" : "success"}>
                {requirement.missing ? "Missing" : "Configured"}
              </Badge>
            </div>
            {requirement.missing ? (
              <Button asChild size="sm" variant="outline">
                <a href={requirement.href}>Configure</a>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EnvironmentSelector({
  app,
  environment,
  workspaceSlug,
}: Readonly<{
  app: ApiNotificationApp;
  environment: ApiNotificationAppEnvironment;
  workspaceSlug: string;
}>) {
  return (
    <nav aria-label="Environment selector" className="flex flex-wrap gap-2">
      {app.environments.map((candidate) => (
        <Button
          asChild
          key={candidate.id}
          size="sm"
          variant={candidate.slug === environment.slug ? "default" : "outline"}
        >
          <Link
            params={{ appSlug: app.slug, environmentSlug: candidate.slug, workspaceSlug }}
            to="/w/$workspaceSlug/apps/$appSlug/environments/$environmentSlug"
          >
            {candidate.name}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

function RequestError({ error, onRetry }: Readonly<{ error: unknown; onRetry: () => void }>) {
  const message = error instanceof Error ? error.message : "Unable to load this app. Try again.";
  return (
    <Alert severity="error">
      <AlertTitle>App could not be loaded</AlertTitle>
      <div className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        <Button onClick={onRetry} size="sm" variant="outline">
          <RefreshCw />
          Try again
        </Button>
      </div>
    </Alert>
  );
}

export { NotificationAppDetailPage };
