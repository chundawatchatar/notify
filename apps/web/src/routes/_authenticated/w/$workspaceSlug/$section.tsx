import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WorkspaceSectionPage } from "@/components/workspace-section-page";
import { isWorkspaceSection } from "@/lib/workspace-sections";

const workspaceSectionSearchSchema = z.object({
  app: z.string().trim().min(1).optional().catch(undefined),
  environment: z.string().trim().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/$section")({
  component: WorkspaceSectionRoute,
  params: {
    parse: ({ section }) => (isWorkspaceSection(section) ? { section } : false),
    stringify: ({ section }) => ({ section }),
  },
  validateSearch: workspaceSectionSearchSchema,
});

function WorkspaceSectionRoute() {
  const { section, workspaceSlug } = Route.useParams();
  const search = Route.useSearch();

  return <WorkspaceSectionPage search={search} section={section} workspaceSlug={workspaceSlug} />;
}
