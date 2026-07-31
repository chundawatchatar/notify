import {
  AppShellHeader,
  AppShellHeaderInner,
  AppShellSidebarFooter,
  Button,
  Input,
  NotifyLogoMark,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@notify/ui";
import { Menu, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { WorkspaceSidebarFooterControls } from "./account-menu";
import { WorkspaceName, WorkspaceNavigation } from "./navigation";
import type { WorkspaceNavId } from "./shared";
import type { ThemeMode } from "./theme";
import { WorkspaceThemeButton } from "./theme";

function WorkspacePageHeader({
  actions,
  badges,
  description,
  title,
}: Readonly<{
  actions?: ReactNode;
  badges?: ReactNode;
  description: string;
  title: string;
}>) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        <h1 className="mt-3 font-semibold text-3xl tracking-normal">{title}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function WorkspaceHeader({
  activeItem,
  onThemeChange,
  theme,
}: Readonly<{
  activeItem: WorkspaceNavId;
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}>) {
  return (
    <AppShellHeader>
      <AppShellHeaderInner>
        <WorkspaceMobileNavigation
          activeItem={activeItem}
          onThemeChange={onThemeChange}
          theme={theme}
        />
        <div className="relative flex-1 md:max-w-md">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search apps, recipients, and events"
            className="pl-9"
            placeholder="Search apps, recipients, events"
          />
        </div>
        <WorkspaceThemeButton
          className="hidden md:inline-flex"
          label="short"
          onThemeChange={onThemeChange}
          theme={theme}
        />
      </AppShellHeaderInner>
    </AppShellHeader>
  );
}

function WorkspaceMobileNavigation({
  activeItem,
  onThemeChange,
  theme,
}: Readonly<{
  activeItem: WorkspaceNavId;
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="shrink-0 lg:hidden"
          size="icon"
          variant="ghost"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-0 sm:max-w-xs" side="left">
        <SheetHeader className="h-16 flex-row items-center gap-3 border-b px-4 py-0 pr-14">
          <NotifyLogoMark />
          <div className="min-w-0 text-left">
            <SheetTitle>Notify</SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
            <WorkspaceName />
          </div>
        </SheetHeader>

        <WorkspaceNavigation activeItem={activeItem} expanded onNavigate={() => setOpen(false)} />

        <AppShellSidebarFooter>
          <WorkspaceThemeButton
            className="mb-2 flex w-full justify-between rounded-md shadow-none"
            label="full"
            onThemeChange={onThemeChange}
            theme={theme}
          />
          <WorkspaceSidebarFooterControls
            expanded
            menuSide="top"
            onNavigate={() => setOpen(false)}
          />
        </AppShellSidebarFooter>
      </SheetContent>
    </Sheet>
  );
}

export { WorkspaceHeader, WorkspacePageHeader };
