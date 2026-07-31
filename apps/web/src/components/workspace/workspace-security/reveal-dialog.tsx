import type { ApiEnvironmentServerApiKeySecret } from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@notify/ui";
import { Copy } from "lucide-react";

function WorkspaceSecurityRevealDialog({
  copiedSecret,
  copyError,
  onClose,
  onCopy,
  revealSecret,
}: Readonly<{
  copiedSecret: boolean;
  copyError?: string;
  onClose: () => void;
  onCopy: () => void;
  revealSecret: ApiEnvironmentServerApiKeySecret | undefined;
}>) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={Boolean(revealSecret)}
    >
      <DialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
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
                {revealSecret.status === "active" ? "Active" : "Revoked"}
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
          <Button onClick={onCopy} type="button" variant="outline">
            <Copy />
            {copiedSecret ? "Copied" : "Copy secret"}
          </Button>
          <Button onClick={onClose} type="button">
            I copied the secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { WorkspaceSecurityRevealDialog };
