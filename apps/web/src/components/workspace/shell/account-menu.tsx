import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notify/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { ApiRequestError, listWorkspaces } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { accountWorkspacesQueryKey, isWorkspaceQuery } from "@/lib/workspace-queries";
import { useWorkspaceSlug } from "./navigation";

function WorkspaceSidebarFooterControls({
  expanded,
  menuSide = "right",
  onNavigate,
}: Readonly<{ expanded: boolean; menuSide?: "right" | "top"; onNavigate?: () => void }>) {
  const auth = useAuth();
  const navigate = useNavigate();
  const email = auth.principal?.user.email ?? "Account";
  const workspaceName = auth.principal?.workspace.name ?? "Workspace";
  const workspaceSlug = useWorkspaceSlug();
  const initials = accountInitials(email);
  const queryClient = useQueryClient();
  const accountId = auth.principal?.user.id;
  const workspaceListQueryKey = accountId ? accountWorkspacesQueryKey(accountId) : undefined;
  const workspacesQuery = useQuery({
    enabled: Boolean(accountId),
    queryFn: () => auth.authenticatedRequest(listWorkspaces),
    queryKey: workspaceListQueryKey ?? ["account", "anonymous", "workspaces"],
    refetchOnMount: "always",
  });
  const logoutMutation = useMutation({
    mutationFn: auth.signOut,
    onSuccess: async () => {
      onNavigate?.();
      await navigate({ replace: true, to: "/auth/login" });
    },
  });
  const switchWorkspaceMutation = useMutation({
    mutationFn: auth.switchWorkspace,
    onError: async (error) => {
      if (
        workspaceListQueryKey &&
        error instanceof ApiRequestError &&
        (error.status === 403 || error.status === 404)
      ) {
        await queryClient.invalidateQueries({ queryKey: workspaceListQueryKey });
      }
    },
    onSuccess: async (_state, targetWorkspaceSlug) => {
      queryClient.removeQueries({
        predicate: (query) => isWorkspaceQuery(query.queryKey, workspaceSlug),
      });
      onNavigate?.();
      await navigate({
        params: { workspaceSlug: targetWorkspaceSlug },
        replace: true,
        to: "/w/$workspaceSlug/dashboard",
      });
    },
  });
  const workspaces = workspacesQuery.data?.workspaces ?? [];
  const showWorkspaceSwitcher = workspaces.length > 1;

  return (
    <div className={expanded ? "grid min-w-0 gap-2" : "grid min-w-0 justify-items-center gap-2"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open user menu"
            className={
              expanded
                ? "h-12 w-full min-w-0 justify-start gap-3 overflow-hidden rounded-sm border bg-secondary/40 px-2 hover:bg-secondary"
                : "size-10 px-0"
            }
            variant={expanded ? "outline" : "ghost"}
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {expanded ? (
              <span className="min-w-0 flex-1 overflow-hidden text-left">
                <span className="block truncate font-medium text-sm leading-none" title={email}>
                  {email}
                </span>
                <span className="mt-1 block truncate text-muted-foreground text-xs leading-none">
                  {workspaceName}
                </span>
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" side={menuSide}>
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{workspaceName}</p>
                <p className="mt-1 text-muted-foreground text-xs capitalize">
                  {auth.principal?.role}
                </p>
                <p className="truncate text-muted-foreground text-xs" title={email}>
                  {email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspacesQuery.isError ? (
            <>
              <p className="px-2 py-1 text-destructive text-xs" role="alert">
                {workspacesQuery.error.message}
              </p>
              <DropdownMenuItem onSelect={() => void workspacesQuery.refetch()}>
                Retry workspace list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : showWorkspaceSwitcher ? (
            <>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Switch workspace
              </DropdownMenuLabel>
              {workspaces.map((workspace) => {
                const activeWorkspace = workspace.slug === workspaceSlug;

                return (
                  <DropdownMenuItem
                    disabled={activeWorkspace || switchWorkspaceMutation.isPending}
                    key={workspace.id}
                    onSelect={() => switchWorkspaceMutation.mutate(workspace.slug)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{workspace.name}</span>
                      <span className="block truncate text-muted-foreground text-xs capitalize">
                        {activeWorkspace ? "Current workspace" : workspace.role}
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link
              onClick={onNavigate}
              params={{ section: "settings", workspaceSlug }}
              to="/w/$workspaceSlug/$section"
            >
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          {switchWorkspaceMutation.isError ? (
            <p className="px-2 py-1 text-destructive text-xs" role="alert">
              {switchWorkspaceMutation.error.message}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        aria-label={expanded ? undefined : "Sign out"}
        className={
          expanded
            ? "w-full justify-start text-muted-foreground hover:text-destructive"
            : "size-10 px-0 text-muted-foreground hover:text-destructive"
        }
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        type="button"
        variant="ghost"
      >
        <LogOut />
        {expanded ? (logoutMutation.isPending ? "Signing out" : "Sign out") : null}
      </Button>
      {expanded && logoutMutation.isError ? (
        <p className="px-2 text-destructive text-xs" role="alert">
          {logoutMutation.error.message}
        </p>
      ) : null}
    </div>
  );
}

function accountInitials(email: string) {
  const localPart = email.split("@")[0] ?? "N";
  const letters = localPart.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);
  return (letters || "N").toUpperCase();
}

export { WorkspaceSidebarFooterControls };
