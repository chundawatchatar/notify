import type { ApiNotificationApp } from "@notify/api-client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus, RefreshCw } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { z } from "zod";
import { ApiRequestError, createNotificationApp, listNotificationApps } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { workspaceQueryKey } from "@/lib/workspace-queries";
import { WorkspacePageHeader, WorkspaceShell } from "./workspace-shell";

const appNameSchema = z
  .string()
  .trim()
  .min(1, "Enter an app name.")
  .max(100, "App names must be 100 characters or fewer.");

function NotificationAppsPage({ workspaceSlug }: Readonly<{ workspaceSlug: string }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const appsQueryKey = workspaceQueryKey(workspaceSlug, "apps");
  const appsQuery = useQuery({
    queryKey: appsQueryKey,
    queryFn: () => auth.authenticatedRequest(listNotificationApps),
  });
  const createMutation = useMutation({
    mutationFn: (name: string) =>
      auth.authenticatedRequest((accessToken) => createNotificationApp(accessToken, { name })),
    onSuccess: (app) => {
      queryClient.setQueryData<{ apps: ApiNotificationApp[] }>(appsQueryKey, (current) => ({
        apps: [...(current?.apps ?? []), app],
      }));
      void queryClient.invalidateQueries({ exact: true, queryKey: appsQueryKey });
    },
  });
  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      createMutation.reset();
      setIsCreating(true);

      try {
        await createMutation.mutateAsync(value.name.trim());
        form.reset();
        setCreateDialogOpen(false);
      } catch {
        // Keep the entered name available so it can be corrected and submitted again.
      } finally {
        setIsCreating(false);
      }
    },
  });

  return (
    <WorkspaceShell activeItem="apps">
      <div className="grid gap-8">
        <WorkspacePageHeader
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus />
              New app
            </Button>
          }
          badges={<Badge variant="secondary">Client surfaces</Badge>}
          description="Create notification apps for the products that send events through Notify."
          title="Notification apps"
        />

        <AppsContent
          error={appsQuery.error}
          isError={appsQuery.isError}
          isLoading={appsQuery.isPending}
          onCreate={() => setCreateDialogOpen(true)}
          onRetry={() => void appsQuery.refetch()}
          apps={appsQuery.data?.apps ?? []}
        />
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open && isCreating) {
            return;
          }

          setCreateDialogOpen(open);
          if (!open) createMutation.reset();
        }}
        open={createDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a notification app</DialogTitle>
            <DialogDescription>
              Give the product a display name. Notify will create Development and Production
              environments automatically.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={formSubmitHandler(form.handleSubmit)}>
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => zodError(appNameSchema, value),
                onSubmit: ({ value }) => zodError(appNameSchema, value),
              }}
            >
              {(field) => (
                <FormField
                  error={
                    apiFieldError(createMutation.error, "name") ??
                    firstFieldError(field.state.meta.errors)
                  }
                  inputId={field.name}
                  label="App name"
                >
                  <Input
                    autoComplete="organization"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      createMutation.reset();
                      field.handleChange(event.target.value);
                    }}
                    placeholder="Payments service"
                    value={field.state.value}
                  />
                </FormField>
              )}
            </form.Field>

            {createMutation.error ? (
              <Alert severity="error">
                <AlertTitle>App creation failed</AlertTitle>
                {requestErrorMessage(createMutation.error)}
              </Alert>
            ) : null}

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <DialogFooter>
                  <Button
                    disabled={isCreating || isSubmitting || createMutation.isPending}
                    onClick={() => setCreateDialogOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!canSubmit || isCreating || isSubmitting || createMutation.isPending}
                    type="submit"
                  >
                    <Plus />
                    {isCreating || createMutation.isPending ? "Creating app..." : "Create app"}
                  </Button>
                </DialogFooter>
              )}
            </form.Subscribe>
          </form>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

function AppsContent({
  apps,
  error,
  isError,
  isLoading,
  onCreate,
  onRetry,
}: Readonly<{
  apps: ApiNotificationApp[];
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onRetry: () => void;
}>) {
  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading notification apps...</p>;
  }

  if (isError) {
    return (
      <Alert severity="error">
        <AlertTitle>Apps could not be loaded</AlertTitle>
        <div className="flex flex-wrap items-center gap-3">
          <span>{requestErrorMessage(error)}</span>
          <Button onClick={onRetry} size="sm" variant="outline">
            <RefreshCw />
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  if (apps.length === 0) {
    return (
      <Card>
        <CardContent className="grid justify-items-start gap-4 py-10">
          <span className="grid size-10 place-items-center rounded-sm border bg-secondary">
            <BellRing className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-lg">Create your first notification app</h2>
            <p className="mt-1 max-w-xl text-muted-foreground text-sm">
              Apps group the environments that receive events from one product. Start with a display
              name and Notify will set up Development and Production for you.
            </p>
          </div>
          <Button onClick={onCreate}>
            <Plus />
            Create app
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your apps</CardTitle>
        <CardDescription>
          Apps available in this workspace and their initial environments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Environments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell className="font-mono text-xs">{app.slug}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {app.environments.map((environment) => (
                        <Badge
                          key={environment.id}
                          variant={environment.production ? "success" : "secondary"}
                        >
                          {environment.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({
  children,
  error,
  inputId,
  label,
}: Readonly<{ children: ReactNode; error?: string; inputId: string; label: string }>) {
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

function requestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete the request. Try again.";
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

export { NotificationAppsPage };
