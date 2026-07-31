import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, KeyRound, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { z } from "zod";
import {
  ApiRequestError,
  createEnvironmentClientKey,
  createEnvironmentTrustedOrigin,
  listEnvironmentClientKeys,
  listEnvironmentTrustedOrigins,
  removeEnvironmentTrustedOrigin,
  revokeEnvironmentClientKey,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { workspaceQueryKey } from "@/lib/workspace-queries";

const originSchema = z.string().trim().min(1, "Enter an origin.");

function EnvironmentConfigurationControls({
  appSlug,
  environmentSlug,
  workspaceSlug,
}: Readonly<{
  appSlug: string;
  environmentSlug: string;
  workspaceSlug: string;
}>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const canManageCredentials = roleCanManageCredentials(auth.principal?.role);
  const appQueryKey = workspaceQueryKey(workspaceSlug, "apps", appSlug);
  const appsQueryKey = workspaceQueryKey(workspaceSlug, "apps");
  const clientKeysQueryKey = workspaceQueryKey(
    workspaceSlug,
    "apps",
    appSlug,
    "environments",
    environmentSlug,
    "client-keys",
  );
  const trustedOriginsQueryKey = workspaceQueryKey(
    workspaceSlug,
    "apps",
    appSlug,
    "environments",
    environmentSlug,
    "trusted-origins",
  );

  const clientKeysQuery = useQuery({
    queryKey: clientKeysQueryKey,
    queryFn: () =>
      auth.authenticatedRequest((token) =>
        listEnvironmentClientKeys(token, appSlug, environmentSlug),
      ),
  });
  const trustedOriginsQuery = useQuery({
    queryKey: trustedOriginsQueryKey,
    queryFn: () =>
      auth.authenticatedRequest((token) =>
        listEnvironmentTrustedOrigins(token, appSlug, environmentSlug),
      ),
  });
  const invalidateReadiness = () =>
    Promise.all([
      queryClient.invalidateQueries({ exact: true, queryKey: appQueryKey }),
      queryClient.invalidateQueries({ exact: true, queryKey: appsQueryKey }),
    ]);
  const invalidateClientKeys = () =>
    Promise.all([
      queryClient.invalidateQueries({ exact: true, queryKey: clientKeysQueryKey }),
      invalidateReadiness(),
    ]);
  const invalidateTrustedOrigins = () =>
    Promise.all([
      queryClient.invalidateQueries({ exact: true, queryKey: trustedOriginsQueryKey }),
      invalidateReadiness(),
    ]);

  const createClientKeyMutation = useMutation({
    mutationFn: () =>
      auth.authenticatedRequest((token) =>
        createEnvironmentClientKey(token, appSlug, environmentSlug),
      ),
    onSuccess: invalidateClientKeys,
  });
  const revokeClientKeyMutation = useMutation({
    mutationFn: (clientKeyId: string) =>
      auth.authenticatedRequest((token) =>
        revokeEnvironmentClientKey(token, appSlug, environmentSlug, clientKeyId),
      ),
    onSuccess: invalidateClientKeys,
  });
  const createTrustedOriginMutation = useMutation({
    mutationFn: (origin: string) =>
      auth.authenticatedRequest((token) =>
        createEnvironmentTrustedOrigin(token, appSlug, environmentSlug, { origin }),
      ),
    onSuccess: invalidateTrustedOrigins,
  });
  const removeTrustedOriginMutation = useMutation({
    mutationFn: (trustedOriginId: string) =>
      auth.authenticatedRequest((token) =>
        removeEnvironmentTrustedOrigin(token, appSlug, environmentSlug, trustedOriginId),
      ),
    onSuccess: invalidateTrustedOrigins,
  });
  const form = useForm({
    defaultValues: { origin: "" },
    onSubmit: async ({ value }) => {
      createTrustedOriginMutation.reset();

      try {
        await createTrustedOriginMutation.mutateAsync(value.origin.trim());
        form.reset();
      } catch {
        // Keep the input intact so the person can correct and resubmit the origin.
      }
    },
  });

  return (
    <section className="grid gap-6" aria-label="Environment configuration">
      {!canManageCredentials ? (
        <Alert severity="info">
          <AlertTitle>Configuration is read-only</AlertTitle>
          Your role can inspect client configuration but cannot change it.
        </Alert>
      ) : null}

      <Card id="client-keys">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Client keys
          </CardTitle>
          <CardDescription>
            Client keys identify browser clients. They are not server ingestion secrets.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canManageCredentials ? (
            <div>
              <Button
                disabled={createClientKeyMutation.isPending}
                onClick={() => createClientKeyMutation.mutate()}
                type="button"
              >
                <Plus />
                {createClientKeyMutation.isPending ? "Creating key" : "Create client key"}
              </Button>
            </div>
          ) : null}
          {createClientKeyMutation.error ? (
            <RequestError
              error={createClientKeyMutation.error}
              title="Client key creation failed"
            />
          ) : null}
          {revokeClientKeyMutation.error ? (
            <RequestError
              error={revokeClientKeyMutation.error}
              title="Client key revocation failed"
            />
          ) : null}
          {renderClientKeys()}
        </CardContent>
      </Card>

      <Card id="trusted-origins">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="size-5" />
            Trusted origins
          </CardTitle>
          <CardDescription>
            Allow exact browser origins only. Paths, wildcards, and credentials are not supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canManageCredentials ? (
            <form
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={formSubmitHandler(form.handleSubmit)}
            >
              <form.Field
                name="origin"
                validators={{
                  onChange: ({ value }) => zodError(originSchema, value),
                  onSubmit: ({ value }) => zodError(originSchema, value),
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Origin</Label>
                    <Input
                      autoCapitalize="none"
                      autoComplete="url"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        createTrustedOriginMutation.reset();
                        field.handleChange(event.target.value);
                      }}
                      placeholder="https://console.example.com"
                      value={field.state.value}
                    />
                    {(apiFieldError(createTrustedOriginMutation.error, "origin") ??
                    firstFieldError(field.state.meta.errors)) ? (
                      <p className="text-destructive text-sm" role="alert">
                        {apiFieldError(createTrustedOriginMutation.error, "origin") ??
                          firstFieldError(field.state.meta.errors)}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    className="self-end"
                    disabled={!canSubmit || isSubmitting || createTrustedOriginMutation.isPending}
                    type="submit"
                  >
                    <Plus />
                    Add origin
                  </Button>
                )}
              </form.Subscribe>
            </form>
          ) : null}
          {createTrustedOriginMutation.error &&
          !apiFieldError(createTrustedOriginMutation.error, "origin") ? (
            <RequestError
              error={createTrustedOriginMutation.error}
              title="Trusted origin creation failed"
            />
          ) : null}
          {removeTrustedOriginMutation.error ? (
            <RequestError
              error={removeTrustedOriginMutation.error}
              title="Trusted origin removal failed"
            />
          ) : null}
          {renderTrustedOrigins()}
        </CardContent>
      </Card>
    </section>
  );

  function renderClientKeys() {
    if (clientKeysQuery.isPending) {
      return <p className="text-muted-foreground text-sm">Loading client keys...</p>;
    }

    if (clientKeysQuery.isError) {
      return <RequestError error={clientKeysQuery.error} title="Client keys could not be loaded" />;
    }

    if (clientKeysQuery.data.client_keys.length === 0) {
      return <p className="text-muted-foreground text-sm">No client keys have been created.</p>;
    }

    return (
      <div className="grid gap-3">
        {clientKeysQuery.data.client_keys.map((clientKey) => {
          const active = clientKey.revoked_at === null;

          return (
            <div
              className="flex flex-col gap-3 rounded-sm border p-3 sm:flex-row sm:items-center sm:justify-between"
              key={clientKey.id}
            >
              <div className="min-w-0">
                <code className="block truncate text-sm">{clientKey.key}</code>
                <p className="text-muted-foreground text-xs">
                  Created {formatDate(clientKey.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={active ? "secondary" : "outline"}>
                  {active ? "Active" : "Revoked"}
                </Badge>
                {canManageCredentials && active ? (
                  <Button
                    aria-label={`Revoke client key ${clientKey.key}`}
                    disabled={revokeClientKeyMutation.isPending}
                    onClick={() => revokeClientKeyMutation.mutate(clientKey.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 />
                    Revoke
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTrustedOrigins() {
    if (trustedOriginsQuery.isPending) {
      return <p className="text-muted-foreground text-sm">Loading trusted origins...</p>;
    }

    if (trustedOriginsQuery.isError) {
      return (
        <RequestError
          error={trustedOriginsQuery.error}
          title="Trusted origins could not be loaded"
        />
      );
    }

    if (trustedOriginsQuery.data.trusted_origins.length === 0) {
      return <p className="text-muted-foreground text-sm">No trusted origins have been added.</p>;
    }

    return (
      <div className="grid gap-3">
        {trustedOriginsQuery.data.trusted_origins.map((trustedOrigin) => (
          <div
            className="flex flex-col gap-3 rounded-sm border p-3 sm:flex-row sm:items-center sm:justify-between"
            key={trustedOrigin.id}
          >
            <div className="min-w-0">
              <code className="block truncate text-sm">{trustedOrigin.origin}</code>
              <p className="text-muted-foreground text-xs">
                Added {formatDate(trustedOrigin.created_at)}
              </p>
            </div>
            {canManageCredentials ? (
              <Button
                aria-label={`Remove trusted origin ${trustedOrigin.origin}`}
                disabled={removeTrustedOriginMutation.isPending}
                onClick={() => removeTrustedOriginMutation.mutate(trustedOrigin.id)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 />
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
}

function RequestError({ error, title }: Readonly<{ error: unknown; title: string }>) {
  return (
    <Alert severity="error">
      <AlertTitle>{title}</AlertTitle>
      {requestErrorMessage(error)}
    </Alert>
  );
}

function roleCanManageCredentials(role: string | undefined) {
  return role === "owner" || role === "admin" || role === "developer";
}

function apiFieldError(error: unknown, field: string) {
  return error instanceof ApiRequestError ? error.fields?.[field]?.[0] : undefined;
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

function formSubmitHandler(handleSubmit: () => Promise<void>) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void handleSubmit();
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function requestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete the request. Try again.";
}

export { EnvironmentConfigurationControls, roleCanManageCredentials };
