import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";

export const Route = createFileRoute("/security")({
  component: SecurityRoute,
});

function SecurityRoute() {
  return <WorkspaceSectionPage section="security" />;
}
