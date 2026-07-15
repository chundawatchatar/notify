import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/")({
  component: AuthIndexPage,
});

function AuthIndexPage() {
  return <Navigate replace to="/auth/login" />;
}
