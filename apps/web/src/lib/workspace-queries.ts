import type { QueryKey } from "@tanstack/react-query";

function accountWorkspacesQueryKey(accountId: string) {
  return ["account", accountId, "workspaces"] as const;
}

function workspaceQueryKey(workspaceSlug: string, resource: string, ...parts: readonly unknown[]) {
  return ["workspace", workspaceSlug, resource, ...parts] as const;
}

function isWorkspaceQuery(queryKey: QueryKey, workspaceSlug: string) {
  return queryKey[0] === "workspace" && queryKey[1] === workspaceSlug;
}

export { accountWorkspacesQueryKey, isWorkspaceQuery, workspaceQueryKey };
