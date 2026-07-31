import { createFileRoute } from "@tanstack/react-router";
import { GuestRoute } from "@/components/auth/auth-route";

export const Route = createFileRoute("/auth")({
  component: GuestRoute,
});
