import type {
  ApiCreateEnvironmentServerApiKeyRequest,
  ApiEnvironmentServerApiKey,
  ApiEnvironmentServerApiKeySecret,
  ApiNotificationApp,
} from "@notify/api-client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Copy, KeyRound, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { z } from "zod";
import {
  ApiRequestError,
  createEnvironmentServerApiKey,
  listEnvironmentServerApiKeys,
  listNotificationApps,
  revokeEnvironmentServerApiKey,
  rotateEnvironmentServerApiKey,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { workspaceQueryKey } from "@/lib/workspace-queries";

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
  const selectedSearch =
    selectedApp && selectedEnvironment
      ? { app: selectedApp.slug, environment: selectedEnvironment.slug }
      : undefined;

  const keysQueryKey =
    selectedApp && selectedEnvironment
      ? workspaceQueryKey(
          workspaceSlug,
          "security",
          "server-api-keys",
          selectedApp.id,
          selectedEnvironment.id,
        )
      : undefined;

  const keysQuery = useQuery({
    enabled: Boolean(selectedApp && selectedEnvironment && keysQueryKey),
    queryKey: keysQueryKey ?? workspaceQueryKey(workspaceSlug, "security", "server-api-keys"),
    queryFn: () =>
      auth.authenticatedRequest((token) =>
        listEnvironmentServerApiKeys(token, selectedApp!.id, selectedEnvironment!.id),
      ),
  });

  const refreshSelectedEnvironmentKeys = async () => {
    if (!keysQueryKey) {
      return;
    }

    await queryClient.invalidateQueries({ exact: true, queryKey: keysQueryKey });
  };

  const createMutation = useMutation({
    mutationFn: (body: ApiCreateEnvironmentServerApiKeyRequest) =>
      auth.authenticatedRequest((token) =>
        createEnvironmentServerApiKey(token, selectedApp!.id, selectedEnvironment!.id, body),
      ),
  });
  const rotateMutation = useMutation({
    mutationFn: (serverApiKeyId: string) =>
      auth.authenticatedRequest((token) =>
        rotateEnvironmentServerApiKey(
          token,
          selectedApp!.id,
          selectedEnvironment!.id,
          serverApiKeyId,
        ),
      ),
  });
  const revokeMutation = useMutation({
    mutationFn: (serverApiKeyId: string) =>
      auth.authenticatedRequest((token) =>
        revokeEnvironmentServerApiKey(
          token,
          selectedApp!.id,
          selectedEnvironment!.id,
          serverApiKeyId,
        ),
      ),
  });

  const createForm = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      createMutation.reset();

      try {
        const secret = await createMutation.mutateAsync({ name: value.name.trim() });
        createMutation.reset();
        await refreshSelectedEnvironmentKeys();
        createForm.reset();
        setCreateDialogOpen(false);
        openReveal(secret);
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

  if (appsQuery.data.apps.length === 0 || !selectedApp || !selectedEnvironment || !selectedSearch) {
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

      <ConfirmationDialog
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

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeReveal();
          }
        }}
        open={Boolean(revealSecret)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Copy this secret now</DialogTitle>
            <DialogDescription>
              This raw secret is shown exactly once. After this dialog closes, Notify cannot show it
              again.
            </DialogDescription>
          </DialogHeader>
          {revealSecret ? (
            <div className="grid gap-3">
              <div className="rounded-sm border bg-secondary/35 p-3">
                <p className="text-muted-foreground text-xs">Server API key secret</p>
                <code className="mt-2 block break-all text-sm">{revealSecret.secret}</code>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={revealSecret.status === "active" ? "success" : "outline"}>
                  {statusLabel(revealSecret.status)}
                </Badge>
                <span className="text-muted-foreground text-sm">{revealSecret.name}</span>
              </div>
              {copyError ? (
                <Alert severity="error">
                  <AlertTitle>Copy failed</AlertTitle>
                  {copyError}
                </Alert>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => void copySecret()} type="button" variant="outline">
              <Copy />
              {copiedSecret ? "Copied" : "Copy secret"}
            </Button>
            <Button onClick={closeReveal} type="button">
              I copied the secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        await refreshSelectedEnvironmentKeys();
        clearConfirmation();
        openReveal(secret);
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key hint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Revoked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keysQuery.data.api_keys.map((apiKey) => {
              const active = apiKey.status === "active";

              return (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell className="font-mono text-xs">{apiKey.masked_hint}</TableCell>
                  <TableCell>
                    <Badge variant={active ? "success" : "outline"}>
                      {statusLabel(apiKey.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(apiKey.created_at)}</TableCell>
                  <TableCell>
                    {apiKey.revoked_at ? formatDate(apiKey.revoked_at) : "Active"}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageCredentials && active ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Rotate ${apiKey.name}`}
                          disabled={rotateMutation.isPending || revokeMutation.isPending}
                          onClick={() => {
                            rotateMutation.reset();
                            revokeMutation.reset();
                            setConfirmation({ key: apiKey, kind: "rotate" });
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RotateCcw />
                          Rotate
                        </Button>
                        <Button
                          aria-label={`Revoke ${apiKey.name}`}
                          disabled={rotateMutation.isPending || revokeMutation.isPending}
                          onClick={() => {
                            rotateMutation.reset();
                            revokeMutation.reset();
                            setConfirmation({ key: apiKey, kind: "revoke" });
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 />
                          Revoke
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {active ? "Read-only" : "No actions"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }
}

function ConfirmationDialog({
  confirmation,
  error,
  isPending,
  onConfirm,
  onOpenChange,
}: Readonly<{
  confirmation: ConfirmationState;
  error?: string;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}>) {
  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(confirmation)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmation?.kind === "rotate"
              ? "Rotate this server API key?"
              : "Revoke this server API key?"}
          </DialogTitle>
          <DialogDescription>
            {confirmation?.kind === "rotate"
              ? `${confirmation.key.name} will be revoked and replaced with a new secret for the same environment.`
              : `${confirmation?.key.name} will be revoked immediately and cannot be restored.`}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert severity="error">
            <AlertTitle>Action failed</AlertTitle>
            {error}
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button" variant="destructive">
            {isPending
              ? "Working..."
              : confirmation?.kind === "rotate"
                ? "Rotate key"
                : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

function statusLabel(status: ApiEnvironmentServerApiKey["status"]) {
  return status === "active" ? "Active" : "Revoked";
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
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function requestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete the request. Try again.";
}

export type { WorkspaceSecuritySearch };
export { WorkspaceSecurityPage };
