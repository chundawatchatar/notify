import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthShell, LoginForm } from "@/components/auth-page";

const productRouteSchema = z.enum([
  "/",
  "/analytics",
  "/apps",
  "/dashboard",
  "/ingress",
  "/security",
  "/settings",
  "/subscription",
]);

const loginSearchSchema = z.object({
  created: z
    .union([z.boolean(), z.literal("true")])
    .optional()
    .catch(undefined),
  expired: z
    .union([z.boolean(), z.literal("true")])
    .optional()
    .catch(undefined),
  redirect: productRouteSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
  validateSearch: loginSearchSchema,
});

function LoginPage() {
  const search = Route.useSearch();

  return (
    <AuthShell
      eyebrow="Welcome back"
      footerAction="Create an account"
      footerHref="/auth/signup"
      footerLabel="New to Notify?"
      subtitle="Use your verified email and password to open your workspace."
      title="Sign in to Notify"
    >
      <LoginForm
        accountCreated={search.created === true || search.created === "true"}
        redirectTo={search.redirect}
        sessionExpired={search.expired === true || search.expired === "true"}
      />
    </AuthShell>
  );
}
