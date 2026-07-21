import { Alert, Button } from "@notify/ui";
import { Navigate, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { productRedirectPath } from "@/lib/workspace-paths";
import { PageLoader } from "./page-loader";

function GuestRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "initializing") {
    return <PageLoader label="Checking for an existing Notify session." />;
  }

  if (
    auth.status === "authenticated" &&
    auth.principal &&
    location.pathname !== "/auth/invitations/accept"
  ) {
    return (
      <Navigate
        replace
        params={{ workspaceSlug: auth.principal.workspace.slug }}
        to="/w/$workspaceSlug/dashboard"
      />
    );
  }

  if (auth.status === "authenticated") {
    return <SessionStatus message="Unable to resolve the active Notify workspace." />;
  }

  return <Outlet />;
}

function AuthenticatedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "initializing") {
    return <PageLoader label="Restoring your Notify session." />;
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
  return <PageLoader label="Restoring your Notify session." />;
}

function SessionStatus({
  action,
  message,
}: Readonly<{ action?: React.ReactNode; message: string }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="grid w-full max-w-md gap-4">
        <Alert severity="error">{message}</Alert>
        {action ? <div className="flex justify-center">{action}</div> : null}
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
