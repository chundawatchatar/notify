import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AuthenticatedRoute,
  AuthenticatedRouteError,
  AuthenticatedRoutePending,
  productRedirectPath,
} from "@/components/auth-route";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const auth = await context.auth.ensureSession();

    if (auth.status === "authenticated") {
      return;
    }

    if (auth.status === "anonymous") {
      throw redirect({
        replace: true,
        search: {
          expired: auth.reason === "expired" ? true : undefined,
          redirect: productRedirectPath(location.pathname),
        },
        to: "/auth/login",
      });
    }

    throw new Error(auth.error ?? "Unable to restore your Notify session.");
  },
  component: AuthenticatedRoute,
  errorComponent: AuthenticatedRouteError,
  pendingComponent: AuthenticatedRoutePending,
  pendingMs: 0,
  ssr: false,
});
