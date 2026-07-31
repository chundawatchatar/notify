import {
  AppShell,
  AppShellBrand,
  AppShellContent,
  AppShellLayout,
  AppShellMain,
  AppShellSidebar,
  AppShellSidebarFooter,
  Button,
  cn,
  NotifyLogoMark,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notify/ui";
import { Pin, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { WorkspaceSidebarFooterControls } from "./account-menu";
import { WorkspaceHeader } from "./header";
import { WorkspaceNavigation } from "./navigation";
import type { WorkspaceNavId } from "./shared";
import { useWorkspaceTheme } from "./theme";

function WorkspaceShell({
  activeItem,
  children,
}: Readonly<{ activeItem: WorkspaceNavId; children: ReactNode }>) {
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarFocused, setSidebarFocused] = useState(false);
  const { setThemeMode, theme } = useWorkspaceTheme();
  const auth = useAuth();
  const sidebarExpanded = sidebarPinned || sidebarHovered || sidebarFocused;
  const workspaceName = auth.principal?.workspace.name ?? "Workspace";

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell>
        <AppShellLayout collapsed={!sidebarPinned}>
          <WorkspaceSidebar
            activeItem={activeItem}
            expanded={sidebarExpanded}
            onFocusedChange={setSidebarFocused}
            onHoveredChange={setSidebarHovered}
            onPinnedChange={setSidebarPinned}
            pinned={sidebarPinned}
            workspaceName={workspaceName}
          />

          <AppShellMain>
            <WorkspaceHeader activeItem={activeItem} onThemeChange={setThemeMode} theme={theme} />
            <AppShellContent>{children}</AppShellContent>
          </AppShellMain>
        </AppShellLayout>
      </AppShell>
    </TooltipProvider>
  );
}

function WorkspaceSidebar({
  activeItem,
  expanded,
  onFocusedChange,
  onHoveredChange,
  onPinnedChange,
  pinned,
  workspaceName,
}: Readonly<{
  activeItem: WorkspaceNavId;
  expanded: boolean;
  onFocusedChange: (focused: boolean) => void;
  onHoveredChange: (hovered: boolean) => void;
  onPinnedChange: (pinned: boolean) => void;
  pinned: boolean;
  workspaceName: string;
}>) {
  return (
    <AppShellSidebar
      className={!pinned && expanded ? "shadow-xl shadow-foreground/10" : undefined}
      collapsed={!pinned}
      expanded={expanded}
      onBlur={(event) => {
        if (!pinned && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onFocusedChange(false);
        }
      }}
      onFocus={() => {
        if (!pinned) {
          onFocusedChange(true);
        }
      }}
      onMouseEnter={() => {
        if (!pinned) {
          onHoveredChange(true);
        }
      }}
      onMouseLeave={() => {
        if (!pinned) {
          onHoveredChange(false);
        }
      }}
    >
      <AppShellBrand className="relative px-6">
        <NotifyLogoMark />
        <div
          className={cn(
            "-translate-y-1/2 absolute top-1/2 right-14 left-[68px] min-w-0 overflow-hidden transition-opacity duration-200 ease-out",
            expanded ? "opacity-100" : "opacity-0",
          )}
        >
          <p className="font-semibold">Notify</p>
          <p className="truncate text-muted-foreground text-xs whitespace-nowrap">
            {workspaceName}
          </p>
        </div>
        <div className="-translate-y-1/2 absolute top-1/2 right-4 grid size-8 place-items-center">
          {pinned ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Collapse sidebar"
                  className="size-8 shrink-0"
                  onClick={() => onPinnedChange(false)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Collapse sidebar
              </TooltipContent>
            </Tooltip>
          ) : expanded ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Pin sidebar open"
                  className="size-8 shrink-0"
                  onClick={() => {
                    onPinnedChange(true);
                    onHoveredChange(false);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Pin className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Pin sidebar open
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </AppShellBrand>

      <WorkspaceNavigation activeItem={activeItem} expanded={expanded} />

      <AppShellSidebarFooter>
        <WorkspaceSidebarFooterControls expanded={expanded} />
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );
}

export { WorkspaceShell };
