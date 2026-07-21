import { Button, NotifyLogoMark } from "@notify/ui";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home, LockKeyhole, RouteOff } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

function NotFoundPage() {
  const auth = useAuth();
  const workspaceSlug = auth.principal?.workspace.slug;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen place-items-center px-5 py-10">
        <section className="grid w-full max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            {auth.status === "authenticated" && workspaceSlug ? (
              <Link
                className="mb-12 flex w-fit items-center gap-2 font-semibold"
                params={{ workspaceSlug }}
                to="/w/$workspaceSlug/dashboard"
              >
                <NotifyLogoMark className="size-9" />
                Notify
              </Link>
            ) : (
              <Link className="mb-12 flex w-fit items-center gap-2 font-semibold" to="/auth/login">
                <NotifyLogoMark className="size-9" />
                Notify
              </Link>
            )}

            <p className="font-mono text-muted-foreground text-xs uppercase">Page unavailable</p>
            <h1 className="mt-4 max-w-xl font-semibold text-4xl tracking-normal md:text-5xl">
              Nothing needs fixing. This page just is not available.
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground text-lg leading-8">
              The link may point to a workspace area that has moved, expired, or has not been opened
              for your account yet.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11">
                {auth.status === "authenticated" && workspaceSlug ? (
                  <Link params={{ workspaceSlug }} to="/w/$workspaceSlug/dashboard">
                    <Home />
                    Go to dashboard
                  </Link>
                ) : (
                  <Link to="/auth/login">
                    <Home />
                    Sign in to continue
                  </Link>
                )}
              </Button>
              <Button asChild className="h-11" variant="outline">
                <Link to="/auth/login">
                  <ArrowLeft />
                  Return to sign in
                </Link>
              </Button>
            </div>
          </div>

          <div aria-hidden="true" className="relative min-h-[380px]">
            <div className="absolute inset-x-8 top-16 rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b pb-4">
                <span className="size-2 rounded-full bg-muted-foreground/30" />
                <span className="size-2 rounded-full bg-muted-foreground/30" />
                <span className="size-2 rounded-full bg-muted-foreground/30" />
                <div className="ml-3 h-2 flex-1 rounded-full bg-secondary" />
              </div>

              <div className="grid gap-4 pt-5">
                <UnavailableRow icon={<RouteOff className="size-4" />} label="Requested page" />
                <UnavailableRow
                  icon={<LockKeyhole className="size-4" />}
                  label="Workspace access"
                />
                <div className="rounded-sm border bg-secondary/35 p-4">
                  <div className="h-2 w-24 rounded-full bg-muted-foreground/20" />
                  <div className="mt-3 h-2 w-full rounded-full bg-muted-foreground/15" />
                  <div className="mt-2 h-2 w-3/4 rounded-full bg-muted-foreground/15" />
                </div>
              </div>
            </div>

            <div className="absolute right-0 bottom-10 left-0 mx-auto w-72 rounded-sm border bg-background p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <NotifyLogoMark className="mt-1" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">We kept your workspace safe.</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Choose a known place to continue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function UnavailableRow({ icon, label }: Readonly<{ icon: ReactNode; label: string }>) {
  return (
    <div className="flex items-center gap-3 rounded-sm border bg-background p-3">
      <span className="grid size-9 place-items-center rounded-sm bg-secondary text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="h-2 w-28 rounded-full bg-muted-foreground/20" />
        <div className="mt-2 h-2 w-40 rounded-full bg-muted-foreground/10" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { NotFoundPage };
