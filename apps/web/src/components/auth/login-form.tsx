import { Alert, AlertTitle, Button, Checkbox, Input, Label, PasswordInput } from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { resolveProductRedirect } from "@/lib/workspace-paths";
import {
  apiFieldError,
  emailSchema,
  FormField,
  firstFieldError,
  formSubmitHandler,
  loginPasswordSchema,
  MutationMessage,
  zodError,
} from "./shared";

function LoginForm({
  accountCreated = false,
  invitation = false,
  passwordReset = false,
  redirectTo,
  sessionExpired = false,
}: Readonly<{
  accountCreated?: boolean;
  invitation?: boolean;
  passwordReset?: boolean;
  redirectTo?: string;
  sessionExpired?: boolean;
}>) {
  const navigate = useNavigate();
  const auth = useAuth();
  const mutation = useMutation({
    mutationFn: auth.signIn,
    onSuccess: async (state) => {
      if (invitation) {
        await navigate({ replace: true, to: "/auth/invitations/accept" });
        return;
      }

      const workspaceSlug = state.principal?.workspace.slug;

      if (!workspaceSlug) {
        throw new Error(
          "Your account does not have an active workspace. Contact support to continue.",
        );
      }

      const redirect = resolveProductRedirect(redirectTo, workspaceSlug);

      if (redirect.kind === "section") {
        await navigate({
          params: { section: redirect.section, workspaceSlug },
          replace: true,
          to: "/w/$workspaceSlug/$section",
        });
        return;
      }

      await navigate({
        params: { workspaceSlug },
        replace: true,
        to: "/w/$workspaceSlug/dashboard",
      });
    },
  });
  const form = useForm({
    defaultValues: { email: "", password: "", remember: false },
    onSubmit: async ({ value }) => {
      mutation.reset();

      try {
        await mutation.mutateAsync(value);
      } catch {}
    },
  });
  const unsupported = auth.status === "unsupported";

  return (
    <form className="grid gap-5" onSubmit={formSubmitHandler(form.handleSubmit)}>
      {accountCreated ? (
        <Alert role="status" severity="success">
          <AlertTitle>Workspace ready</AlertTitle>
          Your account and workspace are ready. Sign in to continue.
        </Alert>
      ) : null}
      {passwordReset ? (
        <Alert role="status" severity="success">
          <AlertTitle>Password updated</AlertTitle>
          Your password was updated. Sign in with your new password.
        </Alert>
      ) : null}
      {sessionExpired ? (
        <Alert severity="error">
          <AlertTitle>Session expired</AlertTitle>
          Your session expired. Sign in again to continue.
        </Alert>
      ) : null}

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
            label="Email"
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

      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => zodError(loginPasswordSchema, value),
          onSubmit: ({ value }) => zodError(loginPasswordSchema, value),
        }}
      >
        {(field) => (
          <FormField
            action={
              <Link
                className="text-muted-foreground text-xs hover:text-foreground"
                to="/auth/forgot-password"
              >
                Forgot password?
              </Link>
            }
            error={
              apiFieldError(mutation.error, "password") ?? firstFieldError(field.state.meta.errors)
            }
            inputId={field.name}
            label="Password"
          >
            <PasswordInput
              autoComplete="current-password"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                mutation.reset();
                field.handleChange(event.target.value);
              }}
              placeholder="Enter password"
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="remember">
        {(field) => (
          <Label className="flex items-start gap-3 text-sm" htmlFor="login-remember">
            <Checkbox
              checked={field.state.value}
              className="mt-0.5"
              id="login-remember"
              onCheckedChange={(value) => field.handleChange(value === true)}
            />
            <span className="text-muted-foreground">Keep me signed in for 30 days.</span>
          </Label>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            className="h-11 w-full"
            disabled={!canSubmit || isSubmitting || mutation.isPending || unsupported}
            type="submit"
          >
            {mutation.isPending ? "Signing in" : "Sign in"}
            <ArrowRight />
          </Button>
        )}
      </form.Subscribe>

      {unsupported ? (
        <Alert severity="error">
          <AlertTitle>Browser unsupported</AlertTitle>
          {auth.error ?? "This browser is unsupported."}
        </Alert>
      ) : null}
      <MutationMessage error={mutation.error} />
    </form>
  );
}

export { LoginForm };
