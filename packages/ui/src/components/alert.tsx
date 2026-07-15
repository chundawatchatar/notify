import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheckIcon, CircleXIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

const alertVariants = cva(
  "grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-xs",
  {
    variants: {
      severity: {
        error:
          "border-destructive/25 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90",
        info: "border-sky-200 bg-sky-50 text-sky-900 *:data-[slot=alert-description]:text-sky-900/90 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200 dark:*:data-[slot=alert-description]:text-cyan-200/90",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 *:data-[slot=alert-description]:text-emerald-900/90 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:*:data-[slot=alert-description]:text-emerald-200/90",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-900/90 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:*:data-[slot=alert-description]:text-amber-200/90",
      },
    },
    defaultVariants: {
      severity: "info",
    },
  },
);

const severityIcons = {
  error: CircleXIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
} as const;

type AlertSeverity = keyof typeof severityIcons;
type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

function Alert({ children, className, role = "alert", severity, ...props }: AlertProps) {
  const resolvedSeverity: AlertSeverity = severity ?? "info";
  const Icon = severityIcons[resolvedSeverity];

  return (
    <div
      aria-atomic="true"
      aria-live={role === "status" ? "polite" : "assertive"}
      className={cn(alertVariants({ severity: resolvedSeverity }), className)}
      data-slot="alert"
      data-severity={resolvedSeverity}
      role={role}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" data-slot="alert-icon" />
      <div className="grid min-w-0 gap-0.5" data-slot="alert-message">
        {children}
      </div>
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("min-w-0 font-medium leading-5 tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("min-w-0 text-sm leading-5 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export type { AlertProps, AlertSeverity };
export { Alert, AlertDescription, AlertTitle, alertVariants };
