import { Alert, AlertTitle, Button, Input, PasswordInput } from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { completePasswordReset, requestPasswordReset } from "@/lib/api-client";
import type { PasswordResetState } from "@/lib/password-reset";
import {
  apiFieldError,
  emailSchema,
  FormField,
  firstFieldError,
  formSubmitHandler,
  MutationMessage,
  passwordConfirmationError,
  passwordSchema,
  zodError,
} from "./shared";

function ForgotPasswordForm() {
  const [sentEmail, setSentEmail] = useState<string>();
  const mutation = useMutation({ mutationFn: requestPasswordReset });
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
      <div className="grid gap-4">
        <Alert role="status" severity="success">
          <AlertTitle>Check your inbox</AlertTitle>
          If an account exists for this email, a password reset link is on its way.
        </Alert>
        <p className="text-muted-foreground text-sm">
          Check <span className="font-medium text-foreground">{sentEmail}</span>. The link expires
          in one hour and can be used once.
        </p>
        <Button asChild className="w-full" variant="outline">
          <Link to="/auth/login">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
        <Button
          onClick={() => {
            mutation.reset();
            setSentEmail(undefined);
          }}
          type="button"
          variant="ghost"
        >
          Use a different email
        </Button>
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
            errorId={`${field.name}-error`}
            inputId={field.name}
            label="Account email"
          >
            <Input
              aria-describedby={
                (apiFieldError(mutation.error, "email") ?? firstFieldError(field.state.meta.errors))
                  ? `${field.name}-error`
                  : undefined
              }
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
            {mutation.isPending ? "Sending reset link" : "Send reset link"}
            <ArrowRight />
          </Button>
        )}
      </form.Subscribe>

      <Button asChild className="w-full" variant="outline">
        <Link to="/auth/login">
          <ArrowLeft />
          Back to sign in
        </Link>
      </Button>
      <MutationMessage error={mutation.error} />
    </form>
  );
}

function PasswordResetFlow({
  onComplete,
  reset,
}: Readonly<{ onComplete?: () => void; reset?: PasswordResetState }>) {
  const [requestNewLink, setRequestNewLink] = useState(false);

  if (reset?.status === "confirmed") {
    return <ResetPasswordForm onComplete={onComplete} resetToken={reset.resetToken} />;
  }

  if (reset?.status === "error" && !requestNewLink) {
    return (
      <div className="grid gap-4">
        <Alert severity="error">
          <AlertTitle>Reset link unavailable</AlertTitle>
          {reset.error}
        </Alert>
        <Button
          className="w-full"
          onClick={() => {
            onComplete?.();
            setRequestNewLink(true);
          }}
          type="button"
        >
          Request a new reset link
        </Button>
        <Button asChild className="w-full" variant="outline">
          <Link to="/auth/login">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return <ForgotPasswordForm />;
}

function ResetPasswordForm({
  onComplete,
  resetToken,
}: Readonly<{ onComplete?: () => void; resetToken: string }>) {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: completePasswordReset,
    onSuccess: async () => {
      onComplete?.();
      await navigate({ replace: true, search: { reset: true }, to: "/auth/login" });
    },
  });
  const form = useForm({
    defaultValues: { confirmPassword: "", password: "" },
    onSubmit: async ({ value }) => {
      mutation.reset();

      try {
        await mutation.mutateAsync({
          password: value.password,
          password_confirmation: value.confirmPassword,
          reset_token: resetToken,
        });
      } catch {}
    },
  });

  return (
    <form className="grid gap-5" onSubmit={formSubmitHandler(form.handleSubmit)}>
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
            errorId={`${field.name}-error`}
            inputId={field.name}
            label="New password"
          >
            <PasswordInput
              aria-describedby={
                (apiFieldError(mutation.error, "password") ??
                firstFieldError(field.state.meta.errors))
                  ? `${field.name}-error`
                  : undefined
              }
              autoComplete="new-password"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="Create a new password"
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
            error={
              apiFieldError(mutation.error, "password_confirmation") ??
              firstFieldError(field.state.meta.errors)
            }
            errorId={`${field.name}-error`}
            inputId={field.name}
            label="Confirm new password"
          >
            <PasswordInput
              aria-describedby={
                (apiFieldError(mutation.error, "password_confirmation") ??
                firstFieldError(field.state.meta.errors))
                  ? `${field.name}-error`
                  : undefined
              }
              autoComplete="new-password"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="Enter the new password again"
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
            {mutation.isPending ? "Updating password" : "Update password"}
            <ArrowRight />
          </Button>
        )}
      </form.Subscribe>

      <MutationMessage error={mutation.error} />
    </form>
  );
}

export { ForgotPasswordForm, PasswordResetFlow, ResetPasswordForm };
