import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";
import { Progress } from "./progress";

type SidebarNavItemProps = React.ComponentProps<"a"> & {
  active?: boolean;
  asChild?: boolean;
  collapsed?: boolean;
};

function SidebarNavIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="sidebar-nav-icon"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-md bg-muted/80 text-muted-foreground transition-[background-color,color,box-shadow,transform] duration-300 group-hover/sidebar-item:translate-x-0.5 group-hover/sidebar-item:bg-background group-hover/sidebar-item:text-primary group-hover/sidebar-item:shadow-xs group-data-[active=true]/sidebar-item:translate-x-0.5 group-data-[active=true]/sidebar-item:bg-background group-data-[active=true]/sidebar-item:text-primary group-data-[active=true]/sidebar-item:shadow-xs [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-300 group-hover/sidebar-item:[&_svg]:scale-110 group-data-[active=true]/sidebar-item:[&_svg]:scale-110",
        className,
      )}
      {...props}
    />
  );
}

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
        "group/sidebar-item relative flex h-11 items-center gap-2.5 overflow-hidden rounded-md px-2 font-medium text-sm outline-none transition-[background-color,color,gap,padding,box-shadow] duration-200 ease-out before:absolute before:top-3 before:bottom-3 before:left-0 before:w-0.5 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 data-[active=true]:before:opacity-100 data-[collapsed=true]:justify-center data-[collapsed=true]:gap-0 data-[collapsed=true]:px-0",
        active
          ? "bg-secondary text-foreground shadow-xs"
          : "text-foreground/75 hover:bg-secondary hover:text-foreground hover:shadow-xs",
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
export { SidebarNavIcon, SidebarNavItem, SidebarNavLabel, StatCard, StatusLine, UsageBar };
