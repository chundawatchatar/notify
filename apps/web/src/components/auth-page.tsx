import {
  Alert,
  AlertTitle,
  Button,
  Checkbox,
  Input,
  Label,
  NotifyLogoMark,
  PasswordInput,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  KeyRound,
  MailCheck,
  RadioTower,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { z } from "zod";
import {
  ApiRequestError,
  completePasswordReset,
  completeSignup,
  requestPasswordReset,
  resendVerification,
  startSignup,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { PasswordResetState } from "@/lib/password-reset";
import type { SignupVerificationState } from "@/lib/signup-verification";
import { resolveProductRedirect } from "@/lib/workspace-paths";

const emailSchema = z.email("Enter a valid work email.").max(160, "Email is too long.");
const loginPasswordSchema = z.string().min(1, "Enter your password.");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");
const workspaceNameSchema = z
  .string()
  .min(2, "Workspace name must be at least 2 characters.")
  .max(100, "Workspace name must be at most 100 characters.");
const acceptTermsSchema = z.literal(true, "Accept the terms to create a workspace.");

function LoginForm({
  accountCreated = false,
  passwordReset = false,
  redirectTo,
  sessionExpired = false,
}: Readonly<{
  accountCreated?: boolean;
  passwordReset?: boolean;
  redirectTo?: string;
  sessionExpired?: boolean;
}>) {
  const navigate = useNavigate();
  const auth = useAuth();
  const mutation = useMutation({
    mutationFn: auth.signIn,
    onSuccess: async (state) => {
      const workspaceSlug = state.principal?.workspace.slug;
      const redirect = resolveProductRedirect(redirectTo, workspaceSlug ?? "");

      if (!workspaceSlug) {
        return;
      }

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
      } catch {
        // The mutation renders the client-safe API error below.
      }
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
      } catch {
        // The mutation renders the client-safe API error below.
      }
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
      } catch {
        // The mutation renders the client-safe API error below.
      }
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
      } catch {
        // The mutation renders the client-safe API error below.
      }
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
            inputId={field.name}
            label="Account email"
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
      } catch {
        // The mutation renders the client-safe API error below.
      }
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
            inputId={field.name}
            label="New password"
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
            inputId={field.name}
            label="Confirm new password"
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

function AuthShell({
  children,
  eyebrow,
  footerAction,
  footerHref,
  footerLabel,
  subtitle,
  title,
}: Readonly<{
  children: ReactNode;
  eyebrow: string;
  footerAction: string;
  footerHref: "/auth/login" | "/auth/signup";
  footerLabel: string;
  subtitle: string;
  title: string;
}>) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
        <section className="relative hidden overflow-hidden border-r bg-secondary/35 px-12 py-8 lg:flex lg:flex-col xl:px-20 2xl:px-28">
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-28 h-[58%] w-full -scale-x-100 object-cover object-left opacity-45 mix-blend-multiply [mask-image:linear-gradient(90deg,transparent_0%,transparent_16%,black_42%,black_100%)]"
            src="/auth-notification-bg.png"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.35)_0%,transparent_22%,transparent_70%,hsl(var(--secondary)/0.35)_100%),linear-gradient(90deg,hsl(var(--secondary)/0.5)_0%,hsl(var(--background)/0.45)_36%,transparent_76%)]" />
          <BrandLink className="relative z-10" />

          <div className="relative z-10 flex flex-1 items-center pb-24 pt-14">
            <div className="-translate-y-6 transform-gpu">
              <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
              <h1 className="mt-4 max-w-lg font-semibold text-5xl leading-tight tracking-normal">
                Notification operations for every customer app.
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground leading-8">
                Create client-facing notification apps, issue scoped API keys, and watch delivery
                health from one focused workspace.
              </p>
              <AuthBackendGraphic />
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <BrandLink className="mb-10 lg:hidden" />
            <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
            <h2 className="mt-3 font-semibold text-3xl tracking-normal">{title}</h2>
            <p className="mt-3 text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-8 text-center text-muted-foreground text-sm">
              {footerLabel}{" "}
              <Link className="font-medium text-foreground hover:underline" to={footerHref}>
                {footerAction}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandLink({ className }: Readonly<{ className?: string }>) {
  return (
    <Link className={`flex items-center gap-2 font-semibold text-base ${className ?? ""}`} to="/">
      <NotifyLogoMark />
      Notify
    </Link>
  );
}

function AuthBackendGraphic() {
  return (
    <div
      aria-hidden="true"
      className="mt-8 max-w-lg rounded-sm border bg-background/70 p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <GraphicNode icon={<Server className="size-4" />} label="Backend event" />
        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
        <GraphicNode icon={<KeyRound className="size-4" />} label="Scoped key" />
        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
        <GraphicNode icon={<RadioTower className="size-4" />} label="Fanout" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <GraphicNode icon={<ShieldCheck className="size-4" />} label="Policy checked" />
        <GraphicNode icon={<Database className="size-4" />} label="Delivery logged" />
      </div>
    </div>
  );
}

function GraphicNode({ icon, label }: Readonly<{ icon: ReactNode; label: string }>) {
  return (
    <div className="min-w-0 flex-1 rounded-sm border bg-secondary/35 p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-background text-muted-foreground">
          {icon}
        </span>
        <p className="truncate font-medium text-xs">{label}</p>
      </div>
    </div>
  );
}

function FormField({
  action,
  children,
  error,
  inputId,
  label,
}: Readonly<{
  action?: ReactNode;
  children: ReactNode;
  error?: string;
  inputId: string;
  label: string;
}>) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        {action}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  ) : null;
}

function MutationMessage({ error }: Readonly<{ error: unknown }>) {
  return error ? (
    <Alert severity="error">
      <AlertTitle>Request failed</AlertTitle>
      {requestErrorMessage(error)}
    </Alert>
  ) : null;
}

function apiFieldError(error: unknown, field: string) {
  return error instanceof ApiRequestError ? error.fields?.[field]?.[0] : undefined;
}

function requestErrorMessage(
  error: unknown,
  fallback = "Unable to complete the request. Try again.",
) {
  return error instanceof Error ? error.message : fallback;
}

function firstFieldError(errors: unknown[]) {
  const [error] = errors;

  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

function zodError(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? undefined : (result.error.issues[0]?.message ?? "Invalid value.");
}

function passwordConfirmationError(value: string, password: string) {
  if (!value) {
    return "Confirm your password.";
  }

  return value === password ? undefined : "Passwords do not match.";
}

function formSubmitHandler(handleSubmit: () => Promise<void>) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void handleSubmit();
  };
}

export type { ProductRoute };
export {
  AuthShell,
  CompleteSignupForm,
  ForgotPasswordForm,
  LoginForm,
  PasswordResetFlow,
  ResetPasswordForm,
  SignupForm,
  VerifyEmailFlow,
};
