import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug")({
  beforeLoad: ({ context, params }) => {
    const auth = context.auth.getSnapshot();
    const workspaceSlug = auth.principal?.workspace.slug;

    if (auth.status === "authenticated" && workspaceSlug === params.workspaceSlug) {
      return;
    }

    if (workspaceSlug) {
      throw redirect({
        replace: true,
        to: "/w/$workspaceSlug/dashboard",
        params: { workspaceSlug },
      });
    }

    throw new Error("Unable to resolve the active Notify workspace.");
  },
  component: Outlet,
  ssr: false,
});
