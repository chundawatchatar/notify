import { createFileRoute } from "@tanstack/react-router";
import { AuthShell, SignupForm } from "@/components/auth-page";

export const Route = createFileRoute("/auth/signup")({
  beforeLoad: ({ context }) => {
    context.signupVerification.clear();
  },
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start building"
      footerAction="Sign in"
      footerHref="/auth/login"
      footerLabel="Already have an account?"
      subtitle="Verify your work email before choosing a password and creating your workspace."
      title="Create your Notify workspace"
    >
      <SignupForm />
    </AuthShell>
  );
}
