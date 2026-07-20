import { createFileRoute, redirect } from "@tanstack/react-router";
import { isWorkspaceSection } from "@/lib/workspace-sections";

export const Route = createFileRoute("/_authenticated/$section")({
  beforeLoad: ({ context, params }) => {
    const workspaceSlug = context.auth.getSnapshot().principal?.workspace.slug;

    if (!workspaceSlug) {
      throw new Error("Unable to resolve the active Notify workspace.");
    }

    throw redirect({
      replace: true,
      to: "/w/$workspaceSlug/$section",
      params: { section: params.section, workspaceSlug },
    });
  },
  params: {
    parse: ({ section }) => (isWorkspaceSection(section) ? { section } : false),
    stringify: ({ section }) => ({ section }),
  },
});
