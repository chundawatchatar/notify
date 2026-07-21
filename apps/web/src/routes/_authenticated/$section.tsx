import { createFileRoute, redirect } from "@tanstack/react-router";
import { isWorkspaceSection } from "@/lib/workspace-sections";

export const Route = createFileRoute("/_authenticated/$section")({
  beforeLoad: ({ context, params }) => {
    const workspaceSlug = context.auth.getSnapshot().principal?.workspace.slug;
    const { section } = params;

    if (!workspaceSlug) {
      throw new Error("Unable to resolve the active Notify workspace.");
    }

    if (!isWorkspaceSection(section)) {
      throw new Error("Unsupported workspace section.");
    }

    throw redirect({
      replace: true,
      to: "/w/$workspaceSlug/$section",
      params: { section, workspaceSlug },
    });
  },
  params: {
    parse: ({ section }) => (isWorkspaceSection(section) ? { section } : false),
    stringify: ({ section }) => ({ section }),
  },
});
