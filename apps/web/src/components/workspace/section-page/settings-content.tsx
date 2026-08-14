import type { ApiUpdateWorkspaceSettingsRequest, ApiWorkspaceSettings } from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  StatusLine,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Save } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import {
  apiFieldError,
  firstFieldError,
  formSubmitHandler,
  requestErrorMessage,
  zodError,
} from "@/lib/form-utils";
import { accountWorkspacesQueryKey, workspaceQueryKey } from "@/lib/workspace-queries";

const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Workspace name must be at least 2 characters.")
  .max(100, "Workspace name must be at most 100 characters.");
const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required.")
  .refine(isIanaTimezone, "Enter an IANA timezone such as UTC or Asia/Kolkata.");

function SettingsContent({ workspaceSlug }: Readonly<{ workspaceSlug: string }>) {
  const auth = useAuth();
  const settingsQuery = useQuery({
    queryKey: workspaceQueryKey(workspaceSlug, "settings"),
    queryFn: () =>
      auth.authenticatedRequest((accessToken) => getWorkspaceSettings(accessToken, workspaceSlug)),
  });

  if (settingsQuery.isPending) {
    return (
      <SettingsMessage description="Loading workspace settings." title="Loading settings..." />
    );
  }

  if (settingsQuery.isError) {
    return (
      <Alert severity="error">
        <AlertTitle>Settings could not be loaded</AlertTitle>
        <div className="flex flex-wrap items-center gap-3">
          <span>{requestErrorMessage(settingsQuery.error)}</span>
          <Button onClick={() => void settingsQuery.refetch()} size="sm" variant="outline">
            <RefreshCw />
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const settings = settingsQuery.data.settings;
  const canManageWorkspace = roleCanManageWorkspace(auth.principal?.role);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      {canManageWorkspace ? (
        <WorkspaceSettingsForm key={settings.slug} settings={settings} />
      ) : (
        <ReadOnlySettings settings={settings} />
      )}
      <WorkspaceFacts settings={settings} />
    </div>
  );
}

function WorkspaceSettingsForm({ settings }: Readonly<{ settings: ApiWorkspaceSettings }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const settingsQueryKey = workspaceQueryKey(settings.slug, "settings");
  const accountId = auth.principal?.user.id;
  const mutation = useMutation({
    mutationFn: (body: ApiUpdateWorkspaceSettingsRequest) =>
      auth.authenticatedRequest((accessToken) =>
        updateWorkspaceSettings(accessToken, settings.slug, body),
      ),
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
        accountId
          ? queryClient.invalidateQueries({ queryKey: accountWorkspacesQueryKey(accountId) })
          : Promise.resolve(),
        auth.retrySession(),
      ]);
    },
  });
  const form = useForm({
    defaultValues: { name: settings.name, timezone: settings.timezone },
    onSubmit: async ({ value }) => {
      mutation.reset();

      try {
        await mutation.mutateAsync({
          name: value.name.trim(),
          timezone: value.timezone.trim(),
        });
      } catch {
        // Preserve entered values so validation or server failures can be corrected in place.
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace details</CardTitle>
        <CardDescription>
          Renaming the workspace does not change its stable URL. The timezone is the dashboard
          presentation default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={formSubmitHandler(form.handleSubmit)}>
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => zodError(workspaceNameSchema, value),
              onSubmit: ({ value }) => zodError(workspaceNameSchema, value),
            }}
          >
            {(field) => (
              <FormField
                error={
                  apiFieldError(mutation.error, "name") ?? firstFieldError(field.state.meta.errors)
                }
                inputId={field.name}
                label="Workspace name"
              >
                <Input
                  autoComplete="organization"
                  disabled={mutation.isPending}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    mutation.reset();
                    field.handleChange(event.target.value);
                  }}
                  value={field.state.value}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field
            name="timezone"
            validators={{
              onChange: ({ value }) => zodError(timezoneSchema, value),
              onSubmit: ({ value }) => zodError(timezoneSchema, value),
            }}
          >
            {(field) => (
              <FormField
                description="Use a canonical IANA identifier, for example UTC or Asia/Kolkata."
                error={
                  apiFieldError(mutation.error, "timezone") ??
                  firstFieldError(field.state.meta.errors)
                }
                inputId={field.name}
                label="Timezone"
              >
                <Input
                  autoComplete="off"
                  disabled={mutation.isPending}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    mutation.reset();
                    field.handleChange(event.target.value);
                  }}
                  spellCheck={false}
                  value={field.state.value}
                />
              </FormField>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                className="w-fit"
                disabled={!canSubmit || isSubmitting || mutation.isPending}
                type="submit"
              >
                <Save />
                {mutation.isPending ? "Saving settings" : "Save settings"}
              </Button>
            )}
          </form.Subscribe>

          {mutation.isSuccess ? (
            <Alert role="status" severity="success">
              <AlertTitle>Settings saved</AlertTitle>
              Workspace details are up to date.
            </Alert>
          ) : null}
          {mutation.error ? (
            <Alert severity="error">
              <AlertTitle>Settings could not be saved</AlertTitle>
              {requestErrorMessage(mutation.error)}
            </Alert>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function ReadOnlySettings({ settings }: Readonly<{ settings: ApiWorkspaceSettings }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace details</CardTitle>
        <CardDescription>
          Your role can view workspace settings. An owner or admin can update them.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <StatusLine label="Workspace name" value={settings.name} />
        <StatusLine label="Timezone" value={settings.timezone} />
      </CardContent>
    </Card>
  );
}

function WorkspaceFacts({ settings }: Readonly<{ settings: ApiWorkspaceSettings }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace routing</CardTitle>
        <CardDescription>System-owned values shown for reference.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <StatusLine label="Workspace slug" value={settings.slug} />
        <StatusLine
          label="Default environment"
          value={environmentLabel(settings.default_environment)}
        />
      </CardContent>
    </Card>
  );
}

function SettingsMessage({ description, title }: Readonly<{ description: string; title: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function FormField({
  children,
  description,
  error,
  inputId,
  label,
}: Readonly<{
  children: ReactNode;
  description?: string;
  error?: string;
  inputId: string;
  label: string;
}>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      {children}
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function isIanaTimezone(value: string) {
  const timezone = value.trim();

  if (timezone !== "UTC" && !/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(timezone)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function roleCanManageWorkspace(role: string | undefined) {
  return role === "owner" || role === "admin";
}

function environmentLabel(environment: ApiWorkspaceSettings["default_environment"]) {
  return environment.slice(0, 1).toUpperCase() + environment.slice(1);
}

export { isIanaTimezone, roleCanManageWorkspace, SettingsContent };
