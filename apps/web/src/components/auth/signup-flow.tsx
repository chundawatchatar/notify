import { Alert, AlertTitle, Button, Checkbox, Input, Label, PasswordInput } from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MailCheck } from "lucide-react";
import { useState } from "react";
import { completeSignup, resendVerification, startSignup } from "@/lib/api-client";
import type { SignupVerificationState } from "@/lib/signup-verification";
import {
  acceptTermsSchema,
  apiFieldError,
  emailSchema,
  FieldError,
  FormField,
  firstFieldError,
  formSubmitHandler,
  MutationMessage,
  passwordConfirmationError,
  passwordSchema,
  workspaceNameSchema,
  zodError,
} from "./shared";

function SignupForm() {
  const [sentEmail, setSentEmail] = useState<string>();
  const mutation = useMutation({ mutationFn: startSignup });
  const resendMutation = useMutation({ mutationFn: resendVerification });
  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      mutation.reset();

      try {
        await mutation.mutateAsync(value);
        setSentEmail(value.email.trim().toLowerCase());
      } catch {}
    },
  });

  if (sentEmail) {
    return (
      <div className="grid gap-5">
        <Alert role="status" severity="success">
          <AlertTitle>Check your inbox</AlertTitle>
          If this email can be registered, a verification link is on its way.
        </Alert>
        <p className="text-muted-foreground text-sm">
          Check <span className="font-medium text-foreground">{sentEmail}</span>. The link expires
          in 24 hours and can be used once.
        </p>
        <Button
          disabled={resendMutation.isPending}
          onClick={() => resendMutation.mutate({ email: sentEmail })}
          type="button"
          variant="outline"
        >
          <MailCheck />
          {resendMutation.isPending ? "Sending again" : "Resend verification email"}
        </Button>
        <Button
          onClick={() => {
            mutation.reset();
            resendMutation.reset();
            setSentEmail(undefined);
          }}
          type="button"
          variant="ghost"
        >
          Use a different email
        </Button>
        {resendMutation.isSuccess ? (
          <Alert role="status" severity="success">
            <AlertTitle>Email sent</AlertTitle>
            Verification email requested.
          </Alert>
        ) : null}
        <MutationMessage error={resendMutation.error} />
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={formSubmitHandler(form.handleSubmit)}>
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => zodError(emailSchema, value),
          onSubmit: ({ value }) => zodError(emailSchema, value),
        }}
      >
        {(field) => (
          <FormField
            error={
              apiFieldError(mutation.error, "email") ?? firstFieldError(field.state.meta.errors)
            }
            inputId={field.name}
            label="Work email"
          >
            <Input
              autoComplete="email"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="you@company.com"
              type="email"
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            className="h-11 w-full"
            disabled={!canSubmit || isSubmitting || mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Sending verification" : "Continue with email"}
            <ArrowRight />
          </Button>
        )}
      </form.Subscribe>

      <MutationMessage error={mutation.error} />
    </form>
  );
}

function VerifyEmailFlow({
  onComplete,
  verification,
}: Readonly<{ onComplete?: () => void; verification?: SignupVerificationState }>) {
  if (verification?.status === "confirmed") {
    return <CompleteSignupForm onComplete={onComplete} signupToken={verification.signupToken} />;
  }

  return (
    <div className="grid gap-4">
      <Alert severity="error">
        <AlertTitle>Verification failed</AlertTitle>
        {verification?.error ?? "This verification link is invalid or expired."}
      </Alert>
      <Button asChild className="w-full" variant="outline">
        <Link to="/auth/signup">Request a new verification link</Link>
      </Button>
    </div>
  );
}

function CompleteSignupForm({
  onComplete,
  signupToken,
}: Readonly<{ onComplete?: () => void; signupToken: string }>) {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: completeSignup,
    onSuccess: async () => {
      onComplete?.();
      await navigate({ to: "/auth/login", search: { created: true }, replace: true });
    },
  });
  const form = useForm({
    defaultValues: {
      acceptTerms: false,
      confirmPassword: "",
      password: "",
      workspaceName: "",
    },
    onSubmit: async ({ value }) => {
      mutation.reset();

      try {
        await mutation.mutateAsync({
          accept_terms: value.acceptTerms as true,
          password: value.password,
          signup_token: signupToken,
          workspace_name: value.workspaceName,
        });
      } catch {}
    },
  });

  return (
    <form className="grid gap-5" onSubmit={formSubmitHandler(form.handleSubmit)}>
      <form.Field
        name="workspaceName"
        validators={{
          onChange: ({ value }) => zodError(workspaceNameSchema, value),
          onSubmit: ({ value }) => zodError(workspaceNameSchema, value),
        }}
      >
        {(field) => (
          <FormField
            error={
              apiFieldError(mutation.error, "workspace_name") ??
              firstFieldError(field.state.meta.errors)
            }
            inputId={field.name}
            label="Workspace name"
          >
            <Input
              autoComplete="organization"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="Acme Cloud"
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => zodError(passwordSchema, value),
          onSubmit: ({ value }) => zodError(passwordSchema, value),
        }}
      >
        {(field) => (
          <FormField
            error={
              apiFieldError(mutation.error, "password") ?? firstFieldError(field.state.meta.errors)
            }
            inputId={field.name}
            label="Password"
          >
            <PasswordInput
              autoComplete="new-password"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="Create a password"
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field
        name="confirmPassword"
        validators={{
          onBlur: ({ fieldApi, value }) =>
            passwordConfirmationError(value, fieldApi.form.getFieldValue("password")),
          onSubmit: ({ fieldApi, value }) =>
            passwordConfirmationError(value, fieldApi.form.getFieldValue("password")),
        }}
      >
        {(field) => (
          <FormField
            error={firstFieldError(field.state.meta.errors)}
            inputId={field.name}
            label="Confirm password"
          >
            <PasswordInput
              autoComplete="new-password"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="Enter password again"
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field
        name="acceptTerms"
        validators={{
          onChange: ({ value }) => zodError(acceptTermsSchema, value),
          onSubmit: ({ value }) => zodError(acceptTermsSchema, value),
        }}
      >
        {(field) => (
          <div className="grid gap-2">
            <Label className="flex items-start gap-3 text-sm" htmlFor="signup-terms">
              <Checkbox
                checked={field.state.value}
                className="mt-0.5"
                id="signup-terms"
                onCheckedChange={(value) => field.handleChange(value === true)}
              />
              <span className="text-muted-foreground">
                I agree to Notify&apos;s terms and operational data policy.
              </span>
            </Label>
            <FieldError
              message={
                apiFieldError(mutation.error, "accept_terms") ??
                firstFieldError(field.state.meta.errors)
              }
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            className="h-11 w-full"
            disabled={!canSubmit || isSubmitting || mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Creating workspace" : "Create workspace"}
            <ArrowRight />
          </Button>
        )}
      </form.Subscribe>

      <MutationMessage error={mutation.error} />
    </form>
  );
}

export { CompleteSignupForm, SignupForm, VerifyEmailFlow };
