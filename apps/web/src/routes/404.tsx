import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/shared/not-found-page";

export const Route = createFileRoute("/404")({
  component: NotFoundPage,
});
