import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/apps/$appSlug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      replace: true,
      to: "/w/$workspaceSlug/apps/$appSlug/environments/$environmentSlug",
      params: { ...params, environmentSlug: "development" },
    });
  },
});
