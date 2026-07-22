import type { ApiNotificationApp } from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@notify/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Archive, Pencil } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { z } from "zod";
import { ApiRequestError, archiveNotificationApp, updateNotificationApp } from "@/lib/api-client";

const appNameSchema = z
  .string()
  .trim()
  .min(1, "Enter an app name.")
  .max(100, "App names must be 100 characters or fewer.");

type AuthenticatedRequest = <Result>(
  request: (accessToken: string) => Promise<Result>,
) => Promise<Result>;

function NotificationAppLifecycleControls({
  app,
  authenticatedRequest,
  canManageApps,
  onArchived,
  onUpdated,
}: Readonly<{
  app: ApiNotificationApp;
  authenticatedRequest: AuthenticatedRequest;
  canManageApps: boolean;
  onArchived?: () => void;
  onUpdated?: (app: ApiNotificationApp) => void;
}>) {
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const updateMutation = useMutation({
    mutationFn: (name: string) =>
      authenticatedRequest((accessToken) => updateNotificationApp(accessToken, app.slug, { name })),
    onSuccess: (updatedApp) => onUpdated?.(updatedApp),
  });
  const archiveMutation = useMutation({
    mutationFn: () =>
      authenticatedRequest((accessToken) => archiveNotificationApp(accessToken, app.slug)),
    onSuccess: () => {
      setArchiveConfirmationOpen(false);
      onArchived?.();
    },
  });
  const form = useForm({
    defaultValues: { name: app.name },
    onSubmit: async ({ value }) => {
      updateMutation.reset();

      try {
        await updateMutation.mutateAsync(value.name.trim());
      } catch {
        // Keep the entered name available so the user can correct and resubmit it.
      }
    },
  });

  if (!canManageApps) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={formSubmitHandler(form.handleSubmit)}
      >
        <form.Field
          name="name"
          validators={{
            onBlur: ({ value }) => zodError(appNameSchema, value),
            onSubmit: ({ value }) => zodError(appNameSchema, value),
          }}
        >
          {(field) => (
            <div className="grid min-w-0 flex-1 gap-2">
              <Label htmlFor="notification-app-name">App name</Label>
              <Input
                id="notification-app-name"
                onBlur={field.handleBlur}
                onChange={(event) => {
                  updateMutation.reset();
                  field.handleChange(event.target.value);
                }}
                value={field.state.value}
              />
              {(apiFieldError(updateMutation.error, "name") ??
              firstFieldError(field.state.meta.errors)) ? (
                <p className="text-destructive text-sm" role="alert">
                  {apiFieldError(updateMutation.error, "name") ??
                    firstFieldError(field.state.meta.errors)}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting || updateMutation.isPending} type="submit">
              <Pencil />
              {updateMutation.isPending ? "Saving..." : "Save name"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {updateMutation.error ? (
        <Alert severity="error">
          <AlertTitle>App name could not be updated</AlertTitle>
          {requestErrorMessage(updateMutation.error)}
        </Alert>
      ) : null}

      <div className="border-t pt-4">
        <Button
          onClick={() => setArchiveConfirmationOpen(true)}
          type="button"
          variant="destructive"
        >
          <Archive />
          Archive app
        </Button>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!archiveMutation.isPending) {
            setArchiveConfirmationOpen(open);
          }
        }}
        open={archiveConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {app.name}?</DialogTitle>
            <DialogDescription>
              This removes the app from active app lists and detail pages. Archiving cannot be
              undone from the dashboard.
            </DialogDescription>
          </DialogHeader>
          {archiveMutation.error ? (
            <Alert severity="error">
              <AlertTitle>App could not be archived</AlertTitle>
              {requestErrorMessage(archiveMutation.error)}
            </Alert>
          ) : null}
          <DialogFooter showCloseButton={!archiveMutation.isPending}>
            <Button
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
              variant="destructive"
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive app"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formSubmitHandler(handleSubmit: () => Promise<void>) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void handleSubmit();
  };
}

function zodError(schema: z.ZodType<string>, value: string) {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

function apiFieldError(error: unknown, field: string) {
  return error instanceof ApiRequestError ? error.fields?.[field]?.[0] : undefined;
}

function firstFieldError(errors: unknown[]) {
  return errors.find((error): error is string => typeof error === "string");
}

function requestErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to update the notification app. Try again.";
}

export { NotificationAppLifecycleControls };
