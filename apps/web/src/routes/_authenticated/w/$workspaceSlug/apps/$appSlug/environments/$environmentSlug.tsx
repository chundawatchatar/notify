import { createFileRoute } from "@tanstack/react-router";
import { NotificationAppDetailPage } from "@/components/apps/notification-app-detail-page";

export const Route = createFileRoute(
  "/_authenticated/w/$workspaceSlug/apps/$appSlug/environments/$environmentSlug",
)({
  component: NotificationAppEnvironmentRoute,
});

function NotificationAppEnvironmentRoute() {
  const { appSlug, environmentSlug, workspaceSlug } = Route.useParams();

  return (
    <NotificationAppDetailPage
      appSlug={appSlug}
      environmentSlug={environmentSlug}
      workspaceSlug={workspaceSlug}
    />
  );
}
