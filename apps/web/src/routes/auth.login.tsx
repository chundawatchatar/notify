import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, AuthShell } from "@/components/auth-page";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      footerAction="Create an account"
      footerHref="/auth/signup"
      footerLabel="New to Notify?"
      subtitle="Monitor notification apps, delivery logs, subscriptions, and realtime client access."
      title="Sign in to Notify"
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
