import { Button } from "@notify/ui";
import { Navigate, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { ProductRoute } from "./auth-page";

const productRoutes = new Set<ProductRoute>([
  "/",
  "/analytics",
  "/apps",
  "/dashboard",
  "/ingress",
  "/security",
  "/settings",
  "/subscription",
]);

function productRedirectPath(pathname: string): ProductRoute {
  return productRoutes.has(pathname as ProductRoute) ? (pathname as ProductRoute) : "/dashboard";
}

function GuestRoute() {
  const auth = useAuth();

  if (auth.status === "initializing") {
    return <SessionStatus message="Checking for an existing Notify session." />;
  }

  if (auth.status === "authenticated") {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}

function AuthenticatedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "initializing") {
    return <SessionStatus message="Restoring your Notify session." />;
  }

  if (auth.status === "anonymous") {
    return (
      <Navigate
        replace
        search={{
          expired: auth.reason === "expired" ? true : undefined,
          redirect: productRedirectPath(location.pathname),
        }}
        to="/auth/login"
      />
    );
  }

  if (auth.status === "unsupported") {
    return (
      <SessionStatus
        message={auth.error ?? "This browser cannot safely manage an authenticated session."}
      />
    );
  }

  if (auth.status === "error") {
    return (
      <SessionStatus
        action={
          <Button onClick={() => void auth.retrySession()} type="button" variant="outline">
            Retry session
          </Button>
        }
        message={auth.error ?? "Unable to restore your Notify session."}
      />
    );
  }

  return <Outlet />;
}

function AuthenticatedRouteError() {
  const auth = useAuth();
  const router = useRouter();

  if (auth.status === "unsupported") {
    return (
      <SessionStatus
        message={auth.error ?? "This browser cannot safely manage an authenticated session."}
      />
    );
  }

  return (
    <SessionStatus
      action={
        <Button
          onClick={() => {
            void auth.retrySession().then((state) => {
              if (state.status === "authenticated") {
                return router.invalidate();
              }
            });
          }}
          type="button"
          variant="outline"
        >
          Retry session
        </Button>
      }
      message={auth.error ?? "Unable to restore your Notify session."}
    />
  );
}

function AuthenticatedRoutePending() {
  return <SessionStatus message="Restoring your Notify session." />;
}

function SessionStatus({
  action,
  message,
}: Readonly<{ action?: React.ReactNode; message: string }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="grid max-w-md gap-4 rounded-sm border bg-card p-6 text-center shadow-sm">
        <p className="text-muted-foreground">{message}</p>
        {action}
      </div>
    </main>
  );
}

export {
  AuthenticatedRoute,
  AuthenticatedRouteError,
  AuthenticatedRoutePending,
  GuestRoute,
  productRedirectPath,
};
