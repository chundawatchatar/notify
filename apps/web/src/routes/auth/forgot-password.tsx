import { createFileRoute } from "@tanstack/react-router";
import { AuthShell, RecoveryUnavailable } from "@/components/auth-page";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Coming soon"
      footerAction="Create an account"
      footerHref="/auth/signup"
      footerLabel="New to Notify?"
      subtitle="Password recovery will be connected after its secure backend flow is available."
      title="Password recovery"
    >
      <RecoveryUnavailable />
    </AuthShell>
  );
}
