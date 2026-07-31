import { AppShellNav, SidebarNavIcon, SidebarNavItem, SidebarNavLabel } from "@notify/ui";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { WorkspaceNavId } from "./shared";
import { workspaceNavItems } from "./shared";

function WorkspaceNavigation({
  activeItem,
  expanded,
  onNavigate,
}: Readonly<{
  activeItem: WorkspaceNavId;
  expanded: boolean;
  onNavigate?: () => void;
}>) {
  const workspaceSlug = useWorkspaceSlug();

  return (
    <AppShellNav className="py-3">
      {workspaceNavItems.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item.id;
        const routeProps =
          item.id === "dashboard"
            ? ({ params: { workspaceSlug }, to: "/w/$workspaceSlug/dashboard" } as const)
            : ({
                params: { section: item.id, workspaceSlug },
                to: "/w/$workspaceSlug/$section",
              } as const);

        return (
          <SidebarNavItem active={active} asChild collapsed={!expanded} key={item.id}>
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={expanded ? undefined : item.label}
              onClick={onNavigate}
              {...routeProps}
            >
              <SidebarNavIcon>
                <Icon />
              </SidebarNavIcon>
              <SidebarNavLabel>{item.label}</SidebarNavLabel>
            </Link>
          </SidebarNavItem>
        );
      })}
    </AppShellNav>
  );
}

function WorkspaceName() {
  const auth = useAuth();

  return (
    <p className="truncate text-muted-foreground text-xs">
      {auth.principal?.workspace.name ?? "Workspace"}
    </p>
  );
}

function useWorkspaceSlug() {
  const auth = useAuth();
  const workspaceSlug = auth.principal?.workspace.slug;

  if (!workspaceSlug) {
    throw new Error("Workspace navigation requires an active workspace.");
  }

  return workspaceSlug;
}

export { useWorkspaceSlug, WorkspaceName, WorkspaceNavigation };
