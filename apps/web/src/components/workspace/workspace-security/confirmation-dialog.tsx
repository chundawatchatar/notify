import type { ApiEnvironmentServerApiKey } from "@notify/api-client";
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
} from "@notify/ui";

type ConfirmationState = { key: ApiEnvironmentServerApiKey; kind: "revoke" | "rotate" } | undefined;

function WorkspaceSecurityConfirmationDialog({
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
  if (!confirmation) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmation.kind === "rotate"
              ? "Rotate this server API key?"
              : "Revoke this server API key?"}
          </DialogTitle>
          <DialogDescription>
            {confirmation.kind === "rotate"
              ? `${confirmation.key.name} will be revoked and replaced with a new secret for the same environment.`
              : `${confirmation.key.name} will be revoked immediately and cannot be restored.`}
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
              : confirmation.kind === "rotate"
                ? "Rotate key"
                : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { WorkspaceSecurityConfirmationDialog };
