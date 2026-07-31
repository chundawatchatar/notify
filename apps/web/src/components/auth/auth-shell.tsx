import { Button, NotifyLogoMark } from "@notify/ui";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Database, KeyRound, RadioTower, Server, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

function AuthShell({
  children,
  eyebrow,
  footerAction,
  footerHref,
  footerInvitation = false,
  footerLabel,
  subtitle,
  title,
}: Readonly<{
  children: ReactNode;
  eyebrow: string;
  footerAction: string;
  footerHref: "/auth/login" | "/auth/signup";
  footerInvitation?: boolean;
  footerLabel: string;
  subtitle: string;
  title: string;
}>) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
        <section className="relative hidden overflow-hidden border-r bg-secondary/35 px-12 py-8 lg:flex lg:flex-col xl:px-20 2xl:px-28">
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-28 h-[58%] w-full -scale-x-100 object-cover object-left opacity-45 mix-blend-multiply [mask-image:linear-gradient(90deg,transparent_0%,transparent_16%,black_42%,black_100%)]"
            src="/auth-notification-bg.png"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.35)_0%,transparent_22%,transparent_70%,hsl(var(--secondary)/0.35)_100%),linear-gradient(90deg,hsl(var(--secondary)/0.5)_0%,hsl(var(--background)/0.45)_36%,transparent_76%)]" />
          <BrandLink className="relative z-10" />

          <div className="relative z-10 flex flex-1 items-center pb-24 pt-14">
            <div className="-translate-y-6 transform-gpu">
              <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
              <h1 className="mt-4 max-w-lg font-semibold text-5xl leading-tight tracking-normal">
                Notification operations for every customer app.
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground leading-8">
                Create client-facing notification apps, issue scoped API keys, and watch delivery
                health from one focused workspace.
              </p>
              <AuthBackendGraphic />
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <BrandLink className="mb-10 lg:hidden" />
            <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
            <h2 className="mt-3 font-semibold text-3xl tracking-normal">{title}</h2>
            <p className="mt-3 text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-8 text-center text-muted-foreground text-sm">
              {footerLabel}{" "}
              {footerInvitation ? (
                <Link
                  className="font-medium text-foreground hover:underline"
                  search={{ invitation: true }}
                  to="/auth/login"
                >
                  {footerAction}
                </Link>
              ) : (
                <Link className="font-medium text-foreground hover:underline" to={footerHref}>
                  {footerAction}
                </Link>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandLink({ className }: Readonly<{ className?: string }>) {
  return (
    <Link className={`flex items-center gap-2 font-semibold text-base ${className ?? ""}`} to="/">
      <NotifyLogoMark />
      Notify
    </Link>
  );
}

function AuthBackendGraphic() {
  return (
    <div
      aria-hidden="true"
      className="mt-8 max-w-lg rounded-sm border bg-background/70 p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <GraphicNode icon={<Server className="size-4" />} label="Backend event" />
        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
        <GraphicNode icon={<KeyRound className="size-4" />} label="Scoped key" />
        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
        <GraphicNode icon={<RadioTower className="size-4" />} label="Fanout" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <GraphicNode icon={<ShieldCheck className="size-4" />} label="Policy checked" />
        <GraphicNode icon={<Database className="size-4" />} label="Delivery logged" />
      </div>
    </div>
  );
}

function GraphicNode({ icon, label }: Readonly<{ icon: ReactNode; label: string }>) {
  return (
    <div className="min-w-0 flex-1 rounded-sm border bg-secondary/35 p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-background text-muted-foreground">
          {icon}
        </span>
        <p className="truncate font-medium text-xs">{label}</p>
      </div>
    </div>
  );
}

export { AuthShell };
