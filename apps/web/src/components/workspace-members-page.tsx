import type { ApiWorkspaceMember } from "@notify/api-client";
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
import { MailPlus, Trash2, UsersRound } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { z } from "zod";
import {
  ApiRequestError,
  createWorkspaceInvitation,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  updateWorkspaceMemberRole,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { WorkspacePageHeader, WorkspaceShell } from "./workspace-shell";

type WorkspaceRole = ApiWorkspaceMember["role"];
type Confirmation =
  | { kind: "remove-member"; member: ApiWorkspaceMember }
  | { kind: "revoke-invitation"; invitationId: string; invitationEmail: string };

const workspaceRoles = ["owner", "admin", "developer", "viewer"] as const satisfies WorkspaceRole[];
const emailSchema = z.email("Enter a valid work email.").max(160, "Email is too long.");

function WorkspaceMembersPage({ workspaceSlug }: Readonly<{ workspaceSlug: string }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [actionError, setActionError] = useState<string>();
  const currentRole = auth.principal?.role;
  const canManageMembers = currentRole === "owner" || currentRole === "admin";
  const canInviteMembers = canManageMembers;
  const roleOptions = grantableRoles(currentRole);
  const membersQueryKey = ["workspace", workspaceSlug, "members"] as const;
  const invitationsQueryKey = ["workspace", workspaceSlug, "invitations"] as const;

  const membersQuery = useQuery({
    queryKey: membersQueryKey,
    queryFn: () => auth.authenticatedRequest((token) => listWorkspaceMembers(token, workspaceSlug)),
  });
  const invitationsQuery = useQuery({
    enabled: canInviteMembers,
    queryKey: invitationsQueryKey,
    queryFn: () =>
      auth.authenticatedRequest((token) => listWorkspaceInvitations(token, workspaceSlug)),
  });
  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: membersQueryKey });
  const invalidateInvitations = () =>
    queryClient.invalidateQueries({ queryKey: invitationsQueryKey });

  const inviteMutation = useMutation({
    mutationFn: (value: { email: string; role: WorkspaceRole }) =>
      auth.authenticatedRequest((token) => createWorkspaceInvitation(token, workspaceSlug, value)),
    onSuccess: async () => {
      await invalidateInvitations();
    },
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: WorkspaceRole }) =>
      auth.authenticatedRequest((token) =>
        updateWorkspaceMemberRole(token, workspaceSlug, membershipId, { role }),
      ),
    onSuccess: async () => {
      setActionError(undefined);
      await invalidateMembers();
    },
    onMutate: () => setActionError(undefined),
    onError: (error) => setActionError(memberActionError(error)),
  });
  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) =>
      auth.authenticatedRequest((token) =>
        removeWorkspaceMember(token, workspaceSlug, membershipId),
      ),
    onSuccess: async () => {
      setActionError(undefined);
      setConfirmation(undefined);
      await invalidateMembers();
    },
    onMutate: () => setActionError(undefined),
    onError: (error) => setActionError(memberActionError(error)),
  });
  const revokeInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      auth.authenticatedRequest((token) =>
        revokeWorkspaceInvitation(token, workspaceSlug, invitationId),
      ),
    onSuccess: async () => {
      setActionError(undefined);
      setConfirmation(undefined);
      await invalidateInvitations();
    },
    onMutate: () => setActionError(undefined),
    onError: (error) => setActionError(requestErrorMessage(error)),
  });
  const form = useForm({
    defaultValues: { email: "", role: defaultInviteRole(roleOptions) },
    onSubmit: async ({ value }) => {
      inviteMutation.reset();

      try {
        await inviteMutation.mutateAsync({
          email: value.email.trim().toLowerCase(),
          role: value.role,
        });
        form.reset();
      } catch {
        // Keep form values intact so a failed invitation can be corrected and resubmitted.
      }
    },
  });

  return (
    <WorkspaceShell activeItem="settings">
      <div className="grid gap-8">
        <WorkspacePageHeader
          badges={<Badge variant="secondary">Workspace access</Badge>}
          description="Manage people who can access this workspace and review pending invitations."
          title="Members"
        />

        {actionError ? (
          <Alert severity="error">
            <AlertTitle>Member update failed</AlertTitle>
            {actionError}
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-5" />
              Active members
            </CardTitle>
            <CardDescription>People with active access to this workspace.</CardDescription>
          </CardHeader>
          <CardContent>{renderMembers()}</CardContent>
        </Card>

        {canInviteMembers ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MailPlus className="size-5" />
                  Invite a member
                </CardTitle>
                <CardDescription>
                  Invitation links are single-use and expire automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={formSubmitHandler(form.handleSubmit)}>
                  <form.Field
                    name="email"
                    validators={{
                      onChange: ({ value }) => zodError(emailSchema, value),
                      onSubmit: ({ value }) => zodError(emailSchema, value),
                    }}
                  >
                    {(field) => (
                      <FormField
                        error={
                          apiFieldError(inviteMutation.error, "email") ??
                          firstFieldError(field.state.meta.errors)
                        }
                        inputId={field.name}
                        label="Email address"
                      >
                        <Input
                          autoComplete="email"
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            inviteMutation.reset();
                            field.handleChange(event.target.value);
                          }}
                          placeholder="teammate@example.com"
                          type="email"
                          value={field.state.value}
                        />
                      </FormField>
                    )}
                  </form.Field>

                  <form.Field name="role">
                    {(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Role</Label>
                        <Select
                          onValueChange={(value) => {
                            inviteMutation.reset();
                            field.handleChange(value as WorkspaceRole);
                          }}
                          value={field.state.value}
                        >
                          <SelectTrigger id={field.name}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.Field>

                  <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        disabled={!canSubmit || isSubmitting || inviteMutation.isPending}
                        type="submit"
                      >
                        <MailPlus />
                        {inviteMutation.isPending ? "Sending invitation" : "Send invitation"}
                      </Button>
                    )}
                  </form.Subscribe>

                  {inviteMutation.isSuccess ? (
                    <Alert role="status" severity="success">
                      <AlertTitle>Invitation sent</AlertTitle>
                      The invited person can use the email link to join this workspace.
                    </Alert>
                  ) : null}
                  {inviteMutation.error ? (
                    <Alert severity="error">
                      <AlertTitle>Invitation failed</AlertTitle>
                      {requestErrorMessage(inviteMutation.error)}
                    </Alert>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending invitations</CardTitle>
                <CardDescription>Revoke an invitation when it is no longer needed.</CardDescription>
              </CardHeader>
              <CardContent>{renderInvitations()}</CardContent>
            </Card>
          </div>
        ) : (
          <Alert severity="info">
            <AlertTitle>Invitation management is restricted</AlertTitle>
            Your role can view active workspace members but cannot access pending invitations.
          </Alert>
        )}
      </div>

      <ConfirmationDialog
        confirmation={confirmation}
        error={actionError}
        isPending={removeMemberMutation.isPending || revokeInvitationMutation.isPending}
        onConfirm={() => {
          if (confirmation?.kind === "remove-member") {
            removeMemberMutation.mutate(confirmation.member.id);
          }
          if (confirmation?.kind === "revoke-invitation") {
            revokeInvitationMutation.mutate(confirmation.invitationId);
          }
        }}
        onOpenChange={(open) => {
          if (!open) setConfirmation(undefined);
        }}
      />
    </WorkspaceShell>
  );

  function renderMembers() {
    if (membersQuery.isPending) {
      return <p className="text-muted-foreground text-sm">Loading workspace members...</p>;
    }

    if (membersQuery.isError) {
      return (
        <Alert severity="error">
          <AlertTitle>Members could not be loaded</AlertTitle>
          {requestErrorMessage(membersQuery.error)}
        </Alert>
      );
    }

    const members = membersQuery.data.members;

    if (members.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">No active workspace members were found.</p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              {canManageMembers ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const canManageThisMember =
                canManageMembers && (currentRole === "owner" || member.role !== "owner");

              return (
                <TableRow key={member.id}>
                  <TableCell className="min-w-52 font-medium">{member.email}</TableCell>
                  <TableCell>
                    {canManageThisMember ? (
                      <Select
                        disabled={updateRoleMutation.isPending}
                        onValueChange={(role) => {
                          if (role !== member.role) {
                            updateRoleMutation.mutate({
                              membershipId: member.id,
                              role: role as WorkspaceRole,
                            });
                          }
                        }}
                        value={member.role}
                      >
                        <SelectTrigger aria-label={`Change ${member.email}'s role`} size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{roleLabel(member.role)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(member.joined_at)}
                  </TableCell>
                  {canManageMembers ? (
                    <TableCell className="text-right">
                      {canManageThisMember ? (
                        <Button
                          aria-label={`Remove ${member.email}`}
                          disabled={removeMemberMutation.isPending}
                          onClick={() => setConfirmation({ kind: "remove-member", member })}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 />
                          Remove
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Owner protected</span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  function renderInvitations() {
    if (invitationsQuery.isPending) {
      return <p className="text-muted-foreground text-sm">Loading pending invitations...</p>;
    }

    if (invitationsQuery.isError) {
      return (
        <Alert severity="error">
          <AlertTitle>Invitations could not be loaded</AlertTitle>
          {requestErrorMessage(invitationsQuery.error)}
        </Alert>
      );
    }

    const invitations = invitationsQuery.data.invitations;

    if (invitations.length === 0) {
      return <p className="text-muted-foreground text-sm">There are no pending invitations.</p>;
    }

    return (
      <div className="grid gap-3">
        {invitations.map((invitation) => (
          <div
            className="flex flex-col gap-3 rounded-sm border p-3 sm:flex-row sm:items-center sm:justify-between"
            key={invitation.id}
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{invitation.email}</p>
              <p className="text-muted-foreground text-sm">
                {roleLabel(invitation.role)} - expires {formatDate(invitation.expires_at)}
              </p>
            </div>
            <Button
              disabled={revokeInvitationMutation.isPending}
              onClick={() =>
                setConfirmation({
                  kind: "revoke-invitation",
                  invitationEmail: invitation.email,
                  invitationId: invitation.id,
                })
              }
              size="sm"
              variant="outline"
            >
              <Trash2 />
              Revoke
            </Button>
          </div>
        ))}
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
  confirmation?: Confirmation;
  error?: string;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}>) {
  const removingMember = confirmation?.kind === "remove-member";
  const subject =
    confirmation?.kind === "remove-member"
      ? confirmation.member.email
      : confirmation?.invitationEmail;

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(confirmation)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {removingMember ? "Remove workspace member?" : "Revoke invitation?"}
          </DialogTitle>
          <DialogDescription>
            {removingMember
              ? `${subject} will lose access to this workspace and their active sessions will be revoked.`
              : `${subject} will no longer be able to use this invitation link.`}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert severity="error">
            <AlertTitle>Action failed</AlertTitle>
            {error}
          </Alert>
        ) : null}
        <DialogFooter showCloseButton>
          <Button disabled={isPending} onClick={onConfirm} variant="destructive">
            {isPending ? "Working..." : removingMember ? "Remove member" : "Revoke invitation"}
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

function grantableRoles(role: WorkspaceRole | undefined) {
  return role === "owner" ? workspaceRoles : role === "admin" ? workspaceRoles.slice(1) : [];
}

function defaultInviteRole(roleOptions: readonly WorkspaceRole[]): WorkspaceRole {
  return roleOptions[roleOptions.length - 1] ?? "viewer";
}

function roleLabel(role: WorkspaceRole) {
  return role.slice(0, 1).toUpperCase() + role.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function memberActionError(error: unknown) {
  if (error instanceof ApiRequestError && error.code === "last_owner") {
    return "This workspace must retain at least one active owner. Assign another owner before continuing.";
  }

  return requestErrorMessage(error);
}

function requestErrorMessage(
  error: unknown,
  fallback = "Unable to complete the request. Try again.",
) {
  return error instanceof Error ? error.message : fallback;
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

export { defaultInviteRole, grantableRoles, memberActionError, WorkspaceMembersPage };
