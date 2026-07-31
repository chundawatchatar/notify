import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/workspace/dashboard-page";

export const Route = createFileRoute("/_authenticated/w/$workspaceSlug/dashboard")({
  component: DashboardPage,
});
