import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsRoute,
});

function AnalyticsRoute() {
  return <WorkspaceSectionPage section="analytics" />;
}
