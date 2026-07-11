import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, AuthShell } from "@/components/auth-page";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      footerAction="Sign in"
      footerHref="/auth/login"
      footerLabel="Remembered your password?"
      subtitle="Enter your work email and we will send reset instructions if the account exists."
      title="Reset your password"
    >
      <AuthForm mode="forgot-password" />
    </AuthShell>
  );
}
