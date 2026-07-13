import type * as React from "react";

import { cn } from "../lib/utils";

function AppShell({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="app-shell"
      className={cn("h-dvh overflow-hidden bg-secondary/20 text-foreground", className)}
      {...props}
    />
  );
}

type CollapsibleShellProps = React.ComponentProps<"div"> & {
  collapsed?: boolean;
};

function AppShellLayout({ className, collapsed = false, ...props }: CollapsibleShellProps) {
  return (
    <div
      data-collapsed={collapsed}
      data-slot="app-shell-layout"
      className={cn(
        "grid h-full min-h-0 transition-[grid-template-columns] duration-300 ease-out lg:grid-cols-[248px_1fr] data-[collapsed=true]:lg:grid-cols-[80px_1fr]",
        className,
      )}
      {...props}
    />
  );
}

function AppShellSidebar({
  className,
  collapsed = false,
  expanded = !collapsed,
  ...props
}: React.ComponentProps<"aside"> & { collapsed?: boolean; expanded?: boolean }) {
  return (
    <aside
      data-collapsed={collapsed}
      data-expanded={expanded}
      data-slot="app-shell-sidebar"
      className={cn(
        "relative z-30 hidden h-full min-h-0 w-20 overflow-hidden border-r bg-background transition-[width,box-shadow] duration-300 ease-out data-[expanded=true]:w-[248px] lg:flex lg:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function AppShellBrand({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell-brand"
      className={cn("flex h-16 items-center gap-2 border-b px-5", className)}
      {...props}
    />
  );
}

function AppShellNav({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="app-shell-nav"
      className={cn(
        "grid min-h-0 flex-1 content-start gap-1 overflow-y-auto px-3 py-4 transition-[padding] duration-300 ease-out",
        className,
      )}
      {...props}
    />
  );
}

function AppShellSidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="app-shell-sidebar-footer" className={cn("mt-auto p-3", className)} {...props} />
  );
}

function AppShellMain({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell-main"
      className={cn("min-h-0 min-w-0 overflow-y-auto", className)}
      {...props}
    />
  );
}

function AppShellHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="app-shell-header"
      className={cn("sticky top-0 z-20 bg-background/95 backdrop-blur", className)}
      {...props}
    />
  );
}

function AppShellHeaderInner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell-header-inner"
      className={cn("flex h-16 items-center justify-between gap-4 px-5 md:px-6", className)}
      {...props}
    />
  );
}

function AppShellContent({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="app-shell-content"
      className={cn("mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-6", className)}
      {...props}
    />
  );
}

export {
  AppShell,
  AppShellBrand,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderInner,
  AppShellLayout,
  AppShellMain,
  AppShellNav,
  AppShellSidebar,
  AppShellSidebarFooter,
};
