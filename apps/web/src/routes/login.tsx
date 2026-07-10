import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, AuthShell } from "@/components/auth-page";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Notify"
      subtitle="Monitor notification apps, delivery logs, subscriptions, and realtime client access."
      footerLabel="New to Notify?"
      footerAction="Create an account"
      footerHref="/signup"
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
