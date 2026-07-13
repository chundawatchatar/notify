import { createFileRoute } from "@tanstack/react-router";
import { AuthShell, RecoveryUnavailable } from "@/components/auth-page";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Coming soon"
      footerAction="Create an account"
      footerHref="/auth/signup"
      footerLabel="New to Notify?"
      subtitle="Password reset confirmation is reserved for the future recovery API."
      title="Reset password"
    >
      <RecoveryUnavailable />
    </AuthShell>
  );
}
