import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";

export const Route = createFileRoute("/apps")({
  component: AppsRoute,
});

function AppsRoute() {
  return <WorkspaceSectionPage section="apps" />;
}
