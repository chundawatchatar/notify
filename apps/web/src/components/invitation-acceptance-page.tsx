import { Alert, AlertTitle, Button, Checkbox, Label, PasswordInput } from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthShell, FieldError, firstFieldError, MutationMessage } from "@/components/auth-page";
import { useAuth } from "@/lib/auth";
import type { InvitationAcceptanceState } from "@/lib/invitation-acceptance";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

function InvitationAcceptancePage({
  onComplete,
  onRetry,
  state,
}: Readonly<{
  onComplete: () => void;
  onRetry: () => Promise<InvitationAcceptanceState>;
  state?: InvitationAcceptanceState;
}>) {
  const [currentState, setCurrentState] = useState(state);
  const retryMutation = useMutation({ mutationFn: onRetry, onSuccess: setCurrentState });

  if (currentState?.status === "retryable-error") {
    return (
      <AuthShell
        eyebrow="Invitation"
        footerAction="Sign in"
        footerHref="/auth/login"
        footerInvitation
        footerLabel="Already have an account?"
        subtitle="Notify could not check this invitation yet."
        title="Try the invitation again"
      >
        <div className="grid gap-4">
          <Alert severity="error">
            <AlertTitle>Invitation check failed</AlertTitle>
            {currentState.error}
          </Alert>
          <Button
            disabled={retryMutation.isPending}
            onClick={() => retryMutation.mutate()}
            type="button"
            variant="outline"
          >
            {retryMutation.isPending ? "Checking invitation" : "Try again"}
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (currentState?.status !== "ready") {
    return (
      <AuthShell
        eyebrow="Invitation"
        footerAction="Sign in"
        footerHref="/auth/login"
        footerLabel="Already have an account?"
        subtitle="Invitation links are valid only once."
        title="Unable to open invitation"
      >
        <Alert severity="error">
          <AlertTitle>Invitation unavailable</AlertTitle>
          {currentState?.error ?? "Reopen the invitation email to continue."}
        </Alert>
      </AuthShell>
    );
  }

  return <InvitationForm onComplete={onComplete} state={currentState} />;
}

function InvitationForm({
  onComplete,
  state,
}: Readonly<{
  onComplete: () => void;
  state: Extract<InvitationAcceptanceState, { status: "ready" }>;
}>) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [completionError, setCompletionError] = useState<Error>();
  const acceptMutation = useMutation({ mutationFn: () => auth.acceptInvitation(state.token) });
  const signupMutation = useMutation({ mutationFn: auth.completeInvitationSignup });
  const finish = async (workspaceSlug?: string) => {
    if (!workspaceSlug) {
      setCompletionError(
        new Error("Your account does not have an active workspace. Contact support to continue."),
      );
      return;
    }

    await navigate({
      params: { workspaceSlug },
      replace: true,
      to: "/w/$workspaceSlug/dashboard",
    });
    onComplete();
  };
  const form = useForm({
    defaultValues: { acceptTerms: false, confirmPassword: "", password: "" },
    onSubmit: async ({ value }) => {
      setCompletionError(undefined);

      try {
        const session = await signupMutation.mutateAsync({
          accept_terms: value.acceptTerms as true,
          password: value.password,
          password_confirmation: value.confirmPassword,
          token: state.token,
        });
        await finish(session.principal?.workspace.slug);
      } catch (error) {
        setCompletionError(
          error instanceof Error ? error : new Error("Unable to complete the request. Try again."),
        );
      }
    },
  });

  return (
    <AuthShell
      eyebrow="Workspace invitation"
      footerAction="Sign in"
      footerHref="/auth/login"
      footerInvitation
      footerLabel="Already have an account?"
      subtitle={`Join ${state.preview.workspace_name} as ${state.preview.role}.`}
      title="Accept your invitation"
    >
      <div className="grid gap-5">
        <dl className="grid gap-2 rounded-md border bg-secondary/35 p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Invited email</dt>
            <dd className="font-medium">{state.preview.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="font-medium">{new Date(state.preview.expires_at).toLocaleString()}</dd>
          </div>
        </dl>
        {auth.status === "authenticated" ? (
          <>
            <Button
              className="w-full"
              disabled={acceptMutation.isPending}
              onClick={() => {
                setCompletionError(undefined);
                void acceptMutation
                  .mutateAsync()
                  .then((session) => finish(session.principal?.workspace.slug))
                  .catch((error) => {
                    setCompletionError(
                      error instanceof Error
                        ? error
                        : new Error("Unable to complete the request. Try again."),
                    );
                  });
              }}
              type="button"
            >
              {acceptMutation.isPending ? "Accepting invitation" : "Accept invitation"}
            </Button>
            <MutationMessage error={completionError ?? acceptMutation.error} />
          </>
        ) : (
          <>
            <Alert>
              <AlertTitle>Have an account?</AlertTitle>
              <Button asChild className="mt-3" variant="outline">
                <Link search={{ invitation: true }} to="/auth/login">
                  Sign in to accept
                </Link>
              </Button>
            </Alert>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <p className="font-medium text-sm">New to Notify? Create your account</p>
              <form.Field
                name="password"
                validators={{
                  onBlur: ({ value }) =>
                    passwordSchema.safeParse(value).success
                      ? undefined
                      : "Enter a password of 8 to 72 characters.",
                  onSubmit: ({ value }) =>
                    passwordSchema.safeParse(value).success
                      ? undefined
                      : "Enter a password of 8 to 72 characters.",
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Password</Label>
                    <PasswordInput
                      aria-describedby={`${field.name}-error`}
                      aria-invalid={field.state.meta.errors.length > 0}
                      autoComplete="new-password"
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        signupMutation.reset();
                        field.handleChange(event.target.value);
                      }}
                      value={field.state.value}
                    />
                    <FieldError
                      id={`${field.name}-error`}
                      message={firstFieldError(field.state.meta.errors)}
                    />
                  </div>
                )}
              </form.Field>
              <form.Field
                name="confirmPassword"
                validators={{
                  onBlur: ({ value, fieldApi }) =>
                    value === fieldApi.form.getFieldValue("password")
                      ? undefined
                      : "Passwords do not match.",
                  onSubmit: ({ value, fieldApi }) =>
                    value === fieldApi.form.getFieldValue("password")
                      ? undefined
                      : "Passwords do not match.",
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Confirm password</Label>
                    <PasswordInput
                      aria-describedby={`${field.name}-error`}
                      aria-invalid={field.state.meta.errors.length > 0}
                      autoComplete="new-password"
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        signupMutation.reset();
                        field.handleChange(event.target.value);
                      }}
                      value={field.state.value}
                    />
                    <FieldError
                      id={`${field.name}-error`}
                      message={firstFieldError(field.state.meta.errors)}
                    />
                  </div>
                )}
              </form.Field>
              <form.Field
                name="acceptTerms"
                validators={{
                  onSubmit: ({ value }) => (value ? undefined : "Accept the terms to continue."),
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label className="flex items-start gap-3 text-sm" htmlFor="invitation-terms">
                      <Checkbox
                        aria-describedby="acceptTerms-error"
                        aria-invalid={field.state.meta.errors.length > 0}
                        checked={field.state.value}
                        id="invitation-terms"
                        onCheckedChange={(value) => field.handleChange(value === true)}
                      />
                      <span>I agree to Notify&apos;s terms and operational data policy.</span>
                    </Label>
                    <FieldError
                      id="acceptTerms-error"
                      message={firstFieldError(field.state.meta.errors)}
                    />
                  </div>
                )}
              </form.Field>
              <form.Subscribe
                selector={(formState) => [formState.canSubmit, formState.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    disabled={!canSubmit || isSubmitting || signupMutation.isPending}
                    type="submit"
                  >
                    {signupMutation.isPending
                      ? "Creating account"
                      : "Create account and join workspace"}
                  </Button>
                )}
              </form.Subscribe>
              <MutationMessage error={completionError ?? signupMutation.error} />
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export { InvitationAcceptancePage };
