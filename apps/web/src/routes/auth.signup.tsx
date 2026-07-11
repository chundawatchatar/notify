import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, AuthShell } from "@/components/auth-page";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start building"
      footerAction="Sign in"
      footerHref="/auth/login"
      footerLabel="Already have an account?"
      subtitle="Set up a workspace for notification apps, API keys, client connections, and usage analytics."
      title="Create your Notify workspace"
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
