import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";
import { Progress } from "./progress";

type SidebarNavItemProps = React.ComponentProps<"a"> & {
  active?: boolean;
  asChild?: boolean;
  collapsed?: boolean;
};

function SidebarNavItem({
  active = false,
  asChild = false,
  className,
  collapsed = false,
  ...props
}: SidebarNavItemProps) {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp
      data-active={active}
      data-collapsed={collapsed}
      data-slot="sidebar-nav-item"
      className={cn(
        "group/sidebar-item flex h-10 items-center gap-3 overflow-hidden rounded-sm px-3 text-sm transition-[background-color,color,gap,padding] duration-300 ease-out data-[collapsed=true]:justify-center data-[collapsed=true]:gap-0 data-[collapsed=true]:px-0",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SidebarNavLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="sidebar-nav-label"
      className={cn(
        "min-w-0 truncate opacity-100 transition-[opacity,max-width,transform] duration-200 ease-out group-data-[collapsed=true]/sidebar-item:max-w-0 group-data-[collapsed=true]/sidebar-item:translate-x-1 group-data-[collapsed=true]/sidebar-item:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function StatCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "rounded-sm border border-border/70 bg-card p-5 text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

function StatusLine({
  className,
  label,
  value,
  ...props
}: React.ComponentProps<"div"> & { label: string; value: string }) {
  return (
    <div
      data-slot="status-line"
      className={cn("flex items-center justify-between gap-4", className)}
      {...props}
    >
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}

function UsageBar({
  className,
  detail,
  label,
  value,
  ...props
}: React.ComponentProps<"div"> & { detail: string; label: string; value: number }) {
  return (
    <div data-slot="usage-bar" className={cn("grid gap-2", className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-muted-foreground text-sm">{value}%</p>
      </div>
      <Progress value={value} />
      <p className="text-muted-foreground text-sm">{detail}</p>
    </div>
  );
}

export type { SidebarNavItemProps };
export { SidebarNavItem, SidebarNavLabel, StatCard, StatusLine, UsageBar };
