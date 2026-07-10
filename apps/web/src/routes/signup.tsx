import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, AuthShell } from "@/components/auth-page";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start building"
      title="Create your Notify workspace"
      subtitle="Set up a workspace for notification apps, API keys, client connections, and usage analytics."
      footerLabel="Already have an account?"
      footerAction="Sign in"
      footerHref="/login"
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
