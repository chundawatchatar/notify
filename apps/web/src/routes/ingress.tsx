import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";

export const Route = createFileRoute("/ingress")({
  component: IngressRoute,
});

function IngressRoute() {
  return <WorkspaceSectionPage section="ingress" />;
}
