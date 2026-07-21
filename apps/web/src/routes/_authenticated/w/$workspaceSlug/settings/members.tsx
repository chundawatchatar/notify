import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceMembersPage } from "@/components/workspace-members-page";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/settings/members")({
  component: WorkspaceMembersRoute,
});

function WorkspaceMembersRoute() {
  const { workspaceSlug } = Route.useParams();

  return <WorkspaceMembersPage workspaceSlug={workspaceSlug} />;
}
