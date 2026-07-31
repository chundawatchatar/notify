import { Badge } from "@notify/ui";
import type { WorkspaceSectionId } from "@/lib/workspace-sections";
import { WorkspacePageHeader, WorkspaceShell } from "../shell";
import type { WorkspaceSecuritySearch } from "../workspace-security-page";
import { SectionActions, SectionContent } from "./content";
import { pageCopy } from "./data";

function WorkspaceSectionPage({
  search,
  section,
  workspaceSlug,
}: Readonly<{
  search?: WorkspaceSecuritySearch;
  section: WorkspaceSectionId;
  workspaceSlug: string;
}>) {
  const copy = pageCopy[section];

  return (
    <WorkspaceShell activeItem={section}>
      <WorkspacePageHeader
        actions={<SectionActions section={section} />}
        badges={<Badge variant="secondary">{copy.badge}</Badge>}
        description={copy.description}
        title={copy.title}
      />
      <SectionContent search={search} section={section} workspaceSlug={workspaceSlug} />
    </WorkspaceShell>
  );
}

export { WorkspaceSectionPage };
