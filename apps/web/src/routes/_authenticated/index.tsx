import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: ({ context }) => {
    const workspaceSlug = context.auth.getSnapshot().principal?.workspace.slug;

    if (!workspaceSlug) {
      throw new Error("Unable to resolve the active Notify workspace.");
    }

    throw redirect({ replace: true, to: "/w/$workspaceSlug/dashboard", params: { workspaceSlug } });
  },
});
