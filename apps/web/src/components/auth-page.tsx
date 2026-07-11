import { Button, Checkbox, GoogleMarkIcon, Input, Label, NotifyMarkIcon } from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

type AuthMode = "forgot-password" | "login" | "signup";
type AuthValues = {
  email: string;
  password: string;
  remember: boolean;
  workspaceName: string;
  acceptTerms: boolean;
};

const emailSchema = z.email("Enter a valid work email.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");
const workspaceNameSchema = z.string().min(2, "Workspace name must be at least 2 characters.");
const acceptTermsSchema = z.literal(true, "Accept the terms to create a workspace.");

const defaultAuthValues: AuthValues = {
  email: "",
  password: "",
  remember: true,
  workspaceName: "",
  acceptTerms: false,
};

function AuthForm({ mode }: Readonly<{ mode: AuthMode }>) {
  const navigate = useNavigate();
  const isForgotPassword = mode === "forgot-password";

  const submitMutation = useMutation({
    mutationFn: async (values: AuthValues) => {
      await wait(700);

      return {
        email: values.email,
        message: authSuccessMessage(mode),
      };
    },
  });

  const googleMutation = useMutation({
    mutationFn: async () => {
      await wait(500);

      return "Google OAuth handoff is ready for backend wiring.";
    },
  });

  const form = useForm({
    defaultValues: defaultAuthValues,
    onSubmit: async ({ value }) => {
      googleMutation.reset();
      await submitMutation.mutateAsync(value);

      if (!isForgotPassword) {
        await navigate({ to: "/dashboard" });
      }
    },
  });

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {isForgotPassword ? null : (
        <>
          <Button
            className="h-11 w-full"
            disabled={googleMutation.isPending || submitMutation.isPending}
            onClick={() => {
              submitMutation.reset();
              googleMutation.mutate(undefined, {
                onSuccess: () => {
                  void navigate({ to: "/dashboard" });
                },
              });
            }}
            type="button"
            variant="outline"
          >
            <GoogleMarkIcon className="size-4" />
            {googleMutation.isPending ? "Connecting to Google" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-muted-foreground text-xs">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => zodError(emailSchema, value),
          onSubmit: ({ value }) => zodError(emailSchema, value),
        }}
      >
        {(field) => (
          <FormField
            error={firstFieldError(field.state.meta.errors)}
            inputId={field.name}
            label="Email"
          >
            <Input
              aria-invalid={!field.state.meta.isValid}
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="you@company.com"
              type="email"
              value={field.state.value}
            />
          </FormField>
        )}
      </form.Field>

      {isForgotPassword ? null : (
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => zodError(passwordSchema, value),
            onSubmit: ({ value }) => zodError(passwordSchema, value),
          }}
        >
          {(field) => (
            <FormField
              action={
                mode === "login" ? (
                  <Link
                    className="text-muted-foreground text-sm hover:text-foreground"
                    to="/auth/forgot-password"
                  >
                    Forgot password?
                  </Link>
                ) : null
              }
              error={firstFieldError(field.state.meta.errors)}
              inputId={field.name}
              label="Password"
            >
              <Input
                aria-invalid={!field.state.meta.isValid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Enter password"
                type="password"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
      )}

      {mode === "signup" ? (
        <form.Field
          name="workspaceName"
          validators={{
            onChange: ({ value }) => zodError(workspaceNameSchema, value),
            onSubmit: ({ value }) => zodError(workspaceNameSchema, value),
          }}
        >
          {(field) => (
            <FormField
              error={firstFieldError(field.state.meta.errors)}
              inputId={field.name}
              label="Workspace name"
            >
              <Input
                aria-invalid={!field.state.meta.isValid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Acme Cloud"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
      ) : null}

      {isForgotPassword ? null : (
        <form.Field
          name={mode === "login" ? "remember" : "acceptTerms"}
          validators={
            mode === "signup"
              ? {
                  onChange: ({ value }) => zodError(acceptTermsSchema, value),
                  onSubmit: ({ value }) => zodError(acceptTermsSchema, value),
                }
              : undefined
          }
        >
          {(field) => {
            const checkboxId = `${mode}-${field.name}`;

            return (
              <div className="grid gap-2">
                <Label className="flex items-start gap-3 text-sm" htmlFor={checkboxId}>
                  <Checkbox
                    aria-invalid={!field.state.meta.isValid}
                    checked={field.state.value}
                    className="mt-0.5"
                    id={checkboxId}
                    onCheckedChange={(value) => field.handleChange(value === true)}
                  />
                  <span className="text-muted-foreground">
                    {mode === "login"
                      ? "Keep me signed in on this device."
                      : "I agree to Notify's terms and operational data policy."}
                  </span>
                </Label>
                <FieldError message={firstFieldError(field.state.meta.errors)} />
              </div>
            );
          }}
        </form.Field>
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            className="h-11 w-full"
            disabled={!canSubmit || isSubmitting || submitMutation.isPending}
            type="submit"
          >
            {submitButtonLabel(mode, submitMutation.isPending)}
            {isForgotPassword ? <Mail /> : <ArrowRight />}
          </Button>
        )}
      />

      <MutationMessage
        error={submitMutation.error ?? googleMutation.error}
        message={submitMutation.data?.message ?? googleMutation.data}
      />

      {isForgotPassword ? (
        <Button asChild className="w-full" variant="ghost">
          <Link to="/auth/login">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      ) : null}
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
  footerHref: string;
  footerLabel: string;
  subtitle: string;
  title: string;
}>) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
        <section className="hidden border-r bg-secondary/35 px-12 py-8 lg:flex lg:flex-col xl:px-20 2xl:px-28">
          <a className="flex w-full max-w-2xl items-center gap-2 font-semibold text-base" href="/">
            <span className="grid size-8 place-items-center rounded-sm border bg-foreground text-background">
              <NotifyMarkIcon className="size-4" />
            </span>
            Notify
          </a>

          <div className="flex flex-1 items-center pb-24 pt-14">
            <div className="-translate-y-6 transform-gpu">
              <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
              <h1 className="mt-4 max-w-lg font-semibold text-5xl leading-tight tracking-normal">
                Notification operations for every customer app.
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground leading-8">
                Create client-facing notification apps, issue scoped API keys, and watch delivery
                health from one focused workspace.
              </p>
              <div className="mt-10 grid max-w-lg grid-cols-3 border-y">
                {[
                  ["Apps", "12"],
                  ["Events", "48k"],
                  ["Uptime", "99.9%"],
                ].map(([label, value]) => (
                  <div className="border-r py-4 last:border-r-0" key={label}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="mt-1 font-semibold text-2xl">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <a className="mb-10 flex items-center gap-2 font-semibold text-base lg:hidden" href="/">
              <span className="grid size-8 place-items-center rounded-sm border bg-foreground text-background">
                <NotifyMarkIcon className="size-4" />
              </span>
              Notify
            </a>

            <div>
              <p className="font-mono text-muted-foreground text-xs uppercase">{eyebrow}</p>
              <h2 className="mt-3 font-semibold text-3xl tracking-normal">{title}</h2>
              <p className="mt-3 text-muted-foreground">{subtitle}</p>
            </div>

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
  if (!message) {
    return null;
  }

  return (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  );
}

function MutationMessage({ error, message }: Readonly<{ error: Error | null; message?: string }>) {
  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        {error.message}
      </p>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <p className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-emerald-700 text-sm">
      {message}
    </p>
  );
}

function firstFieldError(errors: unknown[]) {
  const [error] = errors;

  if (!error) {
    return undefined;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

function zodError(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);

  if (result.success) {
    return undefined;
  }

  return result.error.issues[0]?.message ?? "Invalid value.";
}

function authSuccessMessage(mode: AuthMode) {
  if (mode === "forgot-password") {
    return "If an account exists for this email, password reset instructions will be sent.";
  }

  if (mode === "login") {
    return "Sign-in form is validated and ready for the API.";
  }

  return "Signup form is validated and ready to create a workspace.";
}

function submitButtonLabel(mode: AuthMode, pending: boolean) {
  if (mode === "forgot-password") {
    return pending ? "Sending reset link" : "Send reset link";
  }

  if (mode === "login") {
    return pending ? "Signing in" : "Sign in";
  }

  return pending ? "Creating workspace" : "Create workspace";
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export { AuthForm, AuthShell };
