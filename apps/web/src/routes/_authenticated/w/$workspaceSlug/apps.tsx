import { createFileRoute } from "@tanstack/react-router";
import { NotificationAppsPage } from "@/components/apps/notification-apps-page";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/apps")({
  component: NotificationAppsRoute,
});

function NotificationAppsRoute() {
  const { workspaceSlug } = Route.useParams();

  return <NotificationAppsPage workspaceSlug={workspaceSlug} />;
}
