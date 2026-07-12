import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  return <WorkspaceSectionPage section="settings" />;
}
