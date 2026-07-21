import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";
import { isWorkspaceSection } from "@/lib/workspace-sections";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/$section")({
  component: WorkspaceSectionRoute,
  params: {
    parse: ({ section, workspaceSlug }) =>
      isWorkspaceSection(section) ? { section, workspaceSlug } : false,
    stringify: ({ section, workspaceSlug }) => ({ section, workspaceSlug }),
  },
});

function WorkspaceSectionRoute() {
  const { section } = Route.useParams();
  return <WorkspaceSectionPage section={section} />;
}
