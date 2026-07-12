import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";

export const Route = createFileRoute("/subscription")({
  component: SubscriptionRoute,
});

function SubscriptionRoute() {
  return <WorkspaceSectionPage section="subscription" />;
}
