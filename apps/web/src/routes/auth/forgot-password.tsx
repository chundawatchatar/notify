import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthShell, PasswordResetFlow } from "@/components/auth-page";
import { PageLoader } from "@/components/page-loader";
import type { PasswordResetClient } from "@/lib/password-reset";

const passwordResetSearchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/auth/forgot-password")({
  beforeLoad: ({ context, search }) => loadPasswordResetState(context.passwordReset, search.token),
  component: ForgotPasswordPage,
  pendingComponent: ForgotPasswordPending,
  pendingMs: 0,
  ssr: false,
  validateSearch: passwordResetSearchSchema,
});

function ForgotPasswordPage() {
  const { passwordReset, passwordResetState } = Route.useRouteContext();

  return (
    <AuthShell
      eyebrow="Account recovery"
      footerAction="Create an account"
      footerHref="/auth/signup"
      footerLabel="New to Notify?"
      subtitle="Request a secure email link, then choose a new password for your account."
      title="Reset your password"
    >
      <PasswordResetFlow onComplete={passwordReset.clear} reset={passwordResetState} />
    </AuthShell>
  );
}

function ForgotPasswordPending() {
  return <PageLoader label="Confirming your Notify password reset link." />;
}

function loadPasswordResetState(passwordReset: PasswordResetClient, token?: string) {
  if (!token) {
    return { passwordResetState: passwordReset.getState() };
  }

  return passwordReset.exchange(token).then(() => {
    throw redirect({ replace: true, search: {}, to: "/auth/forgot-password" });
  });
}

export { loadPasswordResetState };
