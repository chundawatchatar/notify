import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      replace: true,
      to: "/w/$workspaceSlug/dashboard",
      params: { workspaceSlug: params.workspaceSlug },
    });
  },
});
