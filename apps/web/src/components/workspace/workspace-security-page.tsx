import type {
  ApiCreateEnvironmentServerApiKeyRequest,
  ApiEnvironmentServerApiKey,
  ApiEnvironmentServerApiKeySecret,
  ApiNotificationApp,
} from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { KeyRound, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  createEnvironmentServerApiKey,
  listEnvironmentServerApiKeys,
  listNotificationApps,
  revokeEnvironmentServerApiKey,
  rotateEnvironmentServerApiKey,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import {
  apiFieldError,
  firstFieldError,
  formatDate,
  formSubmitHandler,
  requestErrorMessage,
  zodError,
} from "@/lib/form-utils";
import { workspaceQueryKey } from "@/lib/workspace-queries";
import { WorkspaceSecurityConfirmationDialog } from "./workspace-security/confirmation-dialog";
import { WorkspaceSecurityRevealDialog } from "./workspace-security/reveal-dialog";
import { WorkspaceSecurityServerApiKeysTable } from "./workspace-security/server-api-keys-table";

type WorkspaceSecuritySearch = {
  app?: string;
  environment?: string;
};

type ConfirmationState = { key: ApiEnvironmentServerApiKey; kind: "revoke" | "rotate" } | undefined;

type RevealState = ApiEnvironmentServerApiKeySecret | undefined;

const keyNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a key name.")
  .max(100, "Key names must be 100 characters or fewer.");

function WorkspaceSecurityPage({
  search,
  workspaceSlug,
}: Readonly<{
  search: WorkspaceSecuritySearch;
  workspaceSlug: string;
}>) {
  const auth = useAuth();
  const navigate = useNavigate({ from: "/w/$workspaceSlug/$section" });
  const queryClient = useQueryClient();
  const canManageCredentials = roleCanManageCredentials(auth.principal?.role);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState>();
  const [revealSecret, setRevealSecret] = useState<RevealState>();
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copyError, setCopyError] = useState<string>();
  const appsQueryKey = workspaceQueryKey(workspaceSlug, "apps");
  const appsQuery = useQuery({
    queryKey: appsQueryKey,
    queryFn: () => auth.authenticatedRequest(listNotificationApps),
  });

  const selectedApp = selectApp(appsQuery.data?.apps ?? [], search.app);
  const selectedEnvironment = selectedApp
    ? selectEnvironment(selectedApp, search.environment)
    : undefined;
  const selectedScope =
    selectedApp && selectedEnvironment
      ? { appId: selectedApp.id, environmentId: selectedEnvironment.id }
      : undefined;
  const selectedSearch =
    selectedApp && selectedEnvironment
      ? { app: selectedApp.slug, environment: selectedEnvironment.slug }
      : undefined;

  const keysQueryKey = selectedScope
    ? workspaceQueryKey(
        workspaceSlug,
        "security",
        "server-api-keys",
        selectedScope.appId,
        selectedScope.environmentId,
      )
    : undefined;

  const keysQuery = useQuery({
    enabled: Boolean(selectedScope && keysQueryKey),
    queryKey: keysQueryKey ?? workspaceQueryKey(workspaceSlug, "security", "server-api-keys"),
    queryFn: () => {
      const scope = requireSelectedScope(selectedScope);

      return auth.authenticatedRequest((token) =>
        listEnvironmentServerApiKeys(token, scope.appId, scope.environmentId),
      );
    },
  });

  useEffect(() => {
    setConfirmation(undefined);
    setRevealSecret(undefined);
    setCopiedSecret(false);
    setCopyError(undefined);
  }, [selectedApp?.id, selectedEnvironment?.id]);

  const refreshSelectedEnvironmentKeys = async () => {
    if (!keysQueryKey) {
      return;
    }

    await queryClient.invalidateQueries({ exact: true, queryKey: keysQueryKey });
  };

  const createMutation = useMutation({
    mutationFn: (body: ApiCreateEnvironmentServerApiKeyRequest) => {
      const scope = requireSelectedScope(selectedScope);

      return auth.authenticatedRequest((token) =>
        createEnvironmentServerApiKey(token, scope.appId, scope.environmentId, body),
      );
    },
  });
  const rotateMutation = useMutation({
    mutationFn: (serverApiKeyId: string) => {
      const scope = requireSelectedScope(selectedScope);

      return auth.authenticatedRequest((token) =>
        rotateEnvironmentServerApiKey(token, scope.appId, scope.environmentId, serverApiKeyId),
      );
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (serverApiKeyId: string) => {
      const scope = requireSelectedScope(selectedScope);

      return auth.authenticatedRequest((token) =>
        revokeEnvironmentServerApiKey(token, scope.appId, scope.environmentId, serverApiKeyId),
      );
    },
  });

  const createForm = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      createMutation.reset();

      try {
        const secret = await createMutation.mutateAsync({ name: value.name.trim() });
        createMutation.reset();
        createForm.reset();
        setCreateDialogOpen(false);
        openReveal(secret);
        await refreshSelectedEnvironmentKeys();
      } catch {
        // Keep the entered value so the person can correct and retry.
      }
    },
  });

  if (appsQuery.isPending) {
    return <p className="text-muted-foreground text-sm">Loading notification apps...</p>;
  }

  if (appsQuery.isError) {
    return (
      <Alert severity="error">
        <AlertTitle>Apps could not be loaded</AlertTitle>
        <div className="flex flex-wrap items-center gap-3">
          <span>{requestErrorMessage(appsQuery.error)}</span>
          <Button onClick={() => void appsQuery.refetch()} size="sm" variant="outline">
            <RefreshCw />
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  if (appsQuery.data.apps.length === 0 || !selectedApp) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="font-medium text-sm">
            No notification apps are available in this workspace.
          </p>
          <p className="text-muted-foreground text-sm">
            Create an app first, then return here to issue environment-scoped server API keys.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEnvironment || !selectedSearch) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="font-medium text-sm">{selectedApp.name} has no available environments.</p>
          <p className="text-muted-foreground text-sm">
            Server API keys require an environment selection. Add or restore an environment for this
            app before managing backend secrets here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (search.app !== selectedSearch.app || search.environment !== selectedSearch.environment) {
    return (
      <Navigate
        params={{ section: "security", workspaceSlug }}
        replace
        search={(current) => ({ ...current, ...selectedSearch })}
        to="/w/$workspaceSlug/$section"
      />
    );
  }

  return (
    <>
      <section className="grid gap-6" aria-label="Server API key management">
        <Card>
          <CardHeader>
            <CardTitle>Environment scope</CardTitle>
            <CardDescription>
              Select the app and environment that own the server API keys shown below.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="security-app-select">Notification app</Label>
              <Select
                onValueChange={(appSlug) => {
                  const app = selectApp(appsQuery.data.apps, appSlug);
                  const environment = app ? defaultEnvironment(app) : undefined;

                  if (!app || !environment) {
                    return;
                  }

                  void navigate({
                    params: { section: "security", workspaceSlug },
                    search: (current) => ({
                      ...current,
                      app: app.slug,
                      environment: environment.slug,
                    }),
                    to: "/w/$workspaceSlug/$section",
                  });
                }}
                value={selectedApp.slug}
              >
                <SelectTrigger id="security-app-select" aria-label="Select notification app">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appsQuery.data.apps.map((app) => (
                    <SelectItem key={app.id} value={app.slug}>
                      {app.name} ({app.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="security-environment-select">Environment</Label>
              <Select
                onValueChange={(environmentSlug) => {
                  void navigate({
                    params: { section: "security", workspaceSlug },
                    search: (current) => ({
                      ...current,
                      app: selectedApp.slug,
                      environment: environmentSlug,
                    }),
                    to: "/w/$workspaceSlug/$section",
                  });
                }}
                value={selectedEnvironment.slug}
              >
                <SelectTrigger
                  id="security-environment-select"
                  aria-label="Select notification app environment"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedApp.environments.map((environment) => (
                    <SelectItem key={environment.id} value={environment.slug}>
                      {environment.name} ({environment.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!canManageCredentials ? (
          <Alert severity="info">
            <AlertTitle>Server API key management is read-only</AlertTitle>
            Your role can inspect key metadata in this environment but cannot create, rotate, or
            revoke secrets.
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Server API keys</CardTitle>
                <CardDescription>
                  Private backend credentials for {selectedApp.name} - {selectedEnvironment.name}.
                </CardDescription>
              </div>
              {canManageCredentials ? (
                <Button onClick={() => setCreateDialogOpen(true)} size="sm" type="button">
                  <KeyRound />
                  New key
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {createMutation.error ? (
              <RequestError error={createMutation.error} title="Server API key creation failed" />
            ) : null}
            {rotateMutation.error ? (
              <RequestError error={rotateMutation.error} title="Server API key rotation failed" />
            ) : null}
            {revokeMutation.error ? (
              <RequestError error={revokeMutation.error} title="Server API key revocation failed" />
            ) : null}
            {renderKeysTable()}
          </CardContent>
        </Card>
      </section>

      <Dialog
        onOpenChange={(open) => {
          if (open) {
            setCreateDialogOpen(true);
            return;
          }

          if (!createMutation.isPending) {
            closeCreateDialog();
          }
        }}
        open={createDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a server API key</DialogTitle>
            <DialogDescription>
              Issue one private backend secret for {selectedApp.name} - {selectedEnvironment.name}.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={formSubmitHandler(createForm.handleSubmit)}>
            <createForm.Field
              name="name"
              validators={{
                onChange: ({ value }) => zodError(keyNameSchema, value),
                onSubmit: ({ value }) => zodError(keyNameSchema, value),
              }}
            >
              {(field) => (
                <FormField
                  error={
                    apiFieldError(createMutation.error, "name") ??
                    firstFieldError(field.state.meta.errors)
                  }
                  inputId={field.name}
                  label="Key name"
                >
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      createMutation.reset();
                      field.handleChange(event.target.value);
                    }}
                    placeholder="Ingest Worker"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </createForm.Field>

            <createForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <DialogFooter>
                  <Button
                    disabled={createMutation.isPending || isSubmitting}
                    onClick={closeCreateDialog}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!canSubmit || createMutation.isPending || isSubmitting}
                    type="submit"
                  >
                    <KeyRound />
                    {createMutation.isPending ? "Creating key..." : "Create key"}
                  </Button>
                </DialogFooter>
              )}
            </createForm.Subscribe>
          </form>
        </DialogContent>
      </Dialog>

      <WorkspaceSecurityConfirmationDialog
        confirmation={confirmation}
        error={
          confirmation?.kind === "rotate"
            ? rotateMutation.error
              ? requestErrorMessage(rotateMutation.error)
              : undefined
            : revokeMutation.error
              ? requestErrorMessage(revokeMutation.error)
              : undefined
        }
        isPending={rotateMutation.isPending || revokeMutation.isPending}
        onConfirm={() => void confirmAction()}
        onOpenChange={(open) => {
          if (!open && !rotateMutation.isPending && !revokeMutation.isPending) {
            clearConfirmation();
          }
        }}
      />
      <WorkspaceSecurityRevealDialog
        copiedSecret={copiedSecret}
        copyError={copyError}
        onClose={closeReveal}
        onCopy={() => void copySecret()}
        revealSecret={revealSecret}
      />
    </>
  );

  function closeCreateDialog() {
    setCreateDialogOpen(false);
    createMutation.reset();
    createForm.reset();
  }

  function clearConfirmation() {
    setConfirmation(undefined);
    rotateMutation.reset();
    revokeMutation.reset();
  }

  function openReveal(secret: ApiEnvironmentServerApiKeySecret) {
    setCopiedSecret(false);
    setCopyError(undefined);
    setRevealSecret(secret);
  }

  function closeReveal() {
    setCopiedSecret(false);
    setCopyError(undefined);
    setRevealSecret(undefined);
  }

  async function copySecret() {
    if (!revealSecret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(revealSecret.secret);
      setCopiedSecret(true);
      setCopyError(undefined);
    } catch {
      setCopiedSecret(false);
      setCopyError("Unable to copy the secret. Copy it manually before closing this dialog.");
    }
  }

  async function confirmAction() {
    if (!confirmation) {
      return;
    }

    if (confirmation.kind === "rotate") {
      revokeMutation.reset();

      try {
        const secret = await rotateMutation.mutateAsync(confirmation.key.id);
        rotateMutation.reset();
        openReveal(secret);
        clearConfirmation();
        await refreshSelectedEnvironmentKeys();
      } catch {
        // Keep the confirmation dialog open so the person can retry.
      }

      return;
    }

    rotateMutation.reset();

    try {
      await revokeMutation.mutateAsync(confirmation.key.id);
      revokeMutation.reset();
      await refreshSelectedEnvironmentKeys();
      clearConfirmation();
    } catch {
      // Keep the confirmation dialog open so the person can retry.
    }
  }

  function renderKeysTable() {
    if (keysQuery.isPending) {
      return <p className="text-muted-foreground text-sm">Loading server API keys...</p>;
    }

    if (keysQuery.isError) {
      return (
        <Alert severity="error">
          <AlertTitle>Server API keys could not be loaded</AlertTitle>
          <div className="flex flex-wrap items-center gap-3">
            <span>{requestErrorMessage(keysQuery.error)}</span>
            <Button onClick={() => void keysQuery.refetch()} size="sm" variant="outline">
              <RefreshCw />
              Try again
            </Button>
          </div>
        </Alert>
      );
    }

    if (keysQuery.data.api_keys.length === 0) {
      return (
        <div className="grid gap-3 rounded-sm border border-dashed p-5">
          <p className="font-medium text-sm">No server API keys have been issued.</p>
          <p className="text-muted-foreground text-sm">
            Create a key for this environment when you need a backend credential for future ingest
            authentication.
          </p>
        </div>
      );
    }

    return (
      <WorkspaceSecurityServerApiKeysTable
        apiKeys={keysQuery.data.api_keys}
        canManageCredentials={canManageCredentials}
        disabled={rotateMutation.isPending || revokeMutation.isPending}
        formatDate={(value) => formatDate(value, { dateStyle: "medium", timeStyle: "short" })}
        onRevoke={(apiKey) => {
          rotateMutation.reset();
          revokeMutation.reset();
          setConfirmation({ key: apiKey, kind: "revoke" });
        }}
        onRotate={(apiKey) => {
          rotateMutation.reset();
          revokeMutation.reset();
          setConfirmation({ key: apiKey, kind: "rotate" });
        }}
      />
    );
  }
}

function FormField({
  children,
  error,
  inputId,
  label,
}: Readonly<{
  children: ReactNode;
  error?: string;
  inputId: string;
  label: string;
}>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RequestError({ error, title }: Readonly<{ error: unknown; title: string }>) {
  return (
    <Alert severity="error">
      <AlertTitle>{title}</AlertTitle>
      {requestErrorMessage(error)}
    </Alert>
  );
}

function selectApp(apps: readonly ApiNotificationApp[], appSlug: string | undefined) {
  if (appSlug) {
    const selected = apps.find((app) => app.slug === appSlug);

    if (selected) {
      return selected;
    }
  }

  return apps[0];
}

function selectEnvironment(app: ApiNotificationApp, environmentSlug: string | undefined) {
  if (environmentSlug) {
    const selected = app.environments.find((environment) => environment.slug === environmentSlug);

    if (selected) {
      return selected;
    }
  }

  return defaultEnvironment(app);
}

function defaultEnvironment(app: ApiNotificationApp) {
  return (
    app.environments.find((environment) => environment.production === false) ?? app.environments[0]
  );
}

function roleCanManageCredentials(role: string | undefined) {
  return role === "owner" || role === "admin" || role === "developer";
}

function requireSelectedScope(selectedScope: { appId: string; environmentId: string } | undefined) {
  if (!selectedScope) {
    throw new Error("Expected a selected app and environment scope.");
  }

  return selectedScope;
}

export type { WorkspaceSecuritySearch };
export { WorkspaceSecurityPage };
