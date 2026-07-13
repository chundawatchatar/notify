const workspaceSectionIds = [
  "apps",
  "ingress",
  "analytics",
  "subscription",
  "security",
  "settings",
] as const;

type WorkspaceSectionId = (typeof workspaceSectionIds)[number];
type WorkspaceSectionPath = `/${WorkspaceSectionId}`;

const workspaceSectionPaths = new Set<string>(workspaceSectionIds.map((section) => `/${section}`));
const workspaceSections = new Set<string>(workspaceSectionIds);

function isWorkspaceSection(section: string): section is WorkspaceSectionId {
  return workspaceSections.has(section);
}

function isWorkspaceSectionPath(path: string): path is WorkspaceSectionPath {
  return workspaceSectionPaths.has(path);
}

function workspaceSectionFromPath(path: WorkspaceSectionPath): WorkspaceSectionId {
  return path.slice(1) as WorkspaceSectionId;
}

export type { WorkspaceSectionId, WorkspaceSectionPath };
export {
  isWorkspaceSection,
  isWorkspaceSectionPath,
  workspaceSectionFromPath,
  workspaceSectionIds,
};
