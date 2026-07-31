import type { ApiEnvironmentServerApiKey } from "@notify/api-client";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notify/ui";
import { RotateCcw, Trash2 } from "lucide-react";

function WorkspaceSecurityServerApiKeysTable({
  apiKeys,
  canManageCredentials,
  disabled,
  formatDate,
  onRevoke,
  onRotate,
}: Readonly<{
  apiKeys: readonly ApiEnvironmentServerApiKey[];
  canManageCredentials: boolean;
  disabled: boolean;
  formatDate: (value: string) => string;
  onRevoke: (apiKey: ApiEnvironmentServerApiKey) => void;
  onRotate: (apiKey: ApiEnvironmentServerApiKey) => void;
}>) {
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
          {apiKeys.map((apiKey) => {
            const active = apiKey.status === "active";

            return (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium">{apiKey.name}</TableCell>
                <TableCell className="font-mono text-xs">{apiKey.masked_hint}</TableCell>
                <TableCell>
                  <Badge variant={active ? "success" : "outline"}>
                    {active ? "Active" : "Revoked"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(apiKey.created_at)}</TableCell>
                <TableCell>{apiKey.revoked_at ? formatDate(apiKey.revoked_at) : "-"}</TableCell>
                <TableCell className="text-right">
                  {canManageCredentials && active ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        aria-label={`Rotate ${apiKey.name}`}
                        disabled={disabled}
                        onClick={() => onRotate(apiKey)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <RotateCcw />
                        Rotate
                      </Button>
                      <Button
                        aria-label={`Revoke ${apiKey.name}`}
                        disabled={disabled}
                        onClick={() => onRevoke(apiKey)}
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

export { WorkspaceSecurityServerApiKeysTable };
