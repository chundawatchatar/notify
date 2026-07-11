import { Button } from "@notify/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AuthShell } from "@/components/auth-page";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Coming soon"
      footerAction="Request a new reset link"
      footerHref="/auth/forgot-password"
      footerLabel="Need a reset email?"
      subtitle="This route is reserved for the token-based password reset flow."
      title="Reset password"
    >
      <div className="grid gap-4">
        <p className="rounded-md border bg-secondary/35 px-4 py-3 text-muted-foreground text-sm">
          Password reset confirmation will be connected when the API endpoint and token validation
          flow are ready.
        </p>
        <Button asChild className="w-full" variant="outline">
          <Link to="/auth/login">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
