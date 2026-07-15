import { createLazyFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthShell, VerifyEmailFlow } from "@/components/auth-page";

export const Route = createLazyFileRoute("/auth/verify-email")({
  component: VerifyEmailPage,
  pendingComponent: VerifyEmailPending,
});

function VerifyEmailPage() {
  const { signupVerification, signupVerificationState } = Route.useRouteContext();

  return (
    <VerifyEmailShell>
      <VerifyEmailFlow
        onComplete={signupVerification.clear}
        verification={signupVerificationState}
      />
    </VerifyEmailShell>
  );
}

function VerifyEmailPending() {
  return (
    <VerifyEmailShell>
      <p className="rounded-md border bg-secondary/35 px-4 py-3 text-muted-foreground text-sm">
        Verifying your email and preparing your workspace setup.
      </p>
    </VerifyEmailShell>
  );
}

function VerifyEmailShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthShell
      eyebrow="Email verified"
      footerAction="Sign in"
      footerHref="/auth/login"
      footerLabel="Already finished signup?"
      subtitle="Finish your account and create the workspace that owns billing, usage, and notification apps."
      title="Complete your Notify account"
    >
      {children}
    </AuthShell>
  );
}
