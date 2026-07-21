defmodule ApiWeb.WorkspaceMemberController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  require Logger

  alias Api.Accounts.InvitationEmail
  alias Api.Workspaces
  alias Api.Workspaces.{Invitation, Membership}
  alias ApiWeb.AuthError
  alias ApiWeb.Plugs.RequirePermission

  alias NotifyOpenApi.AuthSchemas.{ErrorResponse, ValidationErrorResponse}

  alias NotifyOpenApi.WorkspaceSchemas.{
    CreateInvitationRequest,
    InvitationsResponse,
    Member,
    MembersResponse,
    UpdateMemberRoleRequest
  }

  plug RequirePermission, :view_members when action == :index
  plug RequirePermission, :invite_members when action in [:list_invitations, :create_invitation]
  plug RequirePermission, :manage_members when action in [:update, :delete, :revoke_invitation]

  tags ["workspaces"]

  operation :index,
    summary: "List active workspace members",
    operation_id: "listWorkspaceMembers",
    security: [%{"bearerAuth" => []}],
    parameters: [workspaceSlug: [in: :path, description: "Workspace slug", type: :string]],
    responses: [
      ok: {"Active members", "application/json", MembersResponse},
      not_found: {"Workspace unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse}
    ]

  def index(conn, %{"workspaceSlug" => workspace_slug}) do
    with :ok <- current_workspace?(conn, workspace_slug) do
      members =
        conn.assigns.current_workspace.id
        |> Workspaces.list_members()
        |> Enum.map(&member_payload/1)

      json(conn, %{members: members})
    else
      :error -> workspace_not_found(conn)
    end
  end

  operation :update,
    summary: "Change a workspace member role",
    operation_id: "updateWorkspaceMemberRole",
    security: [%{"bearerAuth" => []}],
    parameters: [
      workspaceSlug: [in: :path, description: "Workspace slug", type: :string],
      membershipId: [in: :path, description: "Membership ID", type: :string]
    ],
    request_body:
      {"New workspace role", "application/json", UpdateMemberRoleRequest, required: true},
    responses: [
      ok: {"Updated member", "application/json", Member},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      not_found: {"Member unavailable", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def update(conn, %{
        "workspaceSlug" => workspace_slug,
        "membershipId" => membership_id,
        "role" => role
      }) do
    with :ok <- current_workspace?(conn, workspace_slug),
         %Membership{} = membership <-
           Workspaces.get_active_membership(conn.assigns.current_workspace.id, membership_id),
         {:ok, updated_membership} <-
           Workspaces.update_membership_role(conn.assigns.current_membership, membership, role) do
      updated_membership = Api.Repo.preload(updated_membership, :user)
      json(conn, member_payload(updated_membership))
    else
      nil ->
        member_not_found(conn)

      :error ->
        workspace_not_found(conn)

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :last_active_owner} ->
        AuthError.render(
          conn,
          :unprocessable_entity,
          "last_owner",
          "A workspace must retain an active owner."
        )

      {:error, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)

      {:error, _reason} ->
        member_not_found(conn)
    end
  end

  def update(conn, _params), do: validation_error(conn, %{role: ["is required"]})

  operation :delete,
    summary: "Remove a workspace member",
    operation_id: "removeWorkspaceMember",
    security: [%{"bearerAuth" => []}],
    parameters: [
      workspaceSlug: [in: :path, description: "Workspace slug", type: :string],
      membershipId: [in: :path, description: "Membership ID", type: :string]
    ],
    responses: [
      no_content: "Member removed",
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      not_found: {"Member unavailable", "application/json", ErrorResponse},
      unprocessable_entity: {"Last owner", "application/json", ErrorResponse}
    ]

  def delete(conn, %{"workspaceSlug" => workspace_slug, "membershipId" => membership_id}) do
    with :ok <- current_workspace?(conn, workspace_slug),
         %Membership{} = membership <-
           Workspaces.get_active_membership(conn.assigns.current_workspace.id, membership_id),
         {:ok, _removed_membership} <-
           Workspaces.remove_membership(conn.assigns.current_membership, membership) do
      send_resp(conn, :no_content, "")
    else
      nil ->
        member_not_found(conn)

      :error ->
        workspace_not_found(conn)

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :last_active_owner} ->
        AuthError.render(
          conn,
          :unprocessable_entity,
          "last_owner",
          "A workspace must retain an active owner."
        )

      {:error, _reason} ->
        member_not_found(conn)
    end
  end

  operation :list_invitations,
    summary: "List pending workspace invitations",
    operation_id: "listWorkspaceInvitations",
    security: [%{"bearerAuth" => []}],
    parameters: [workspaceSlug: [in: :path, description: "Workspace slug", type: :string]],
    responses: [
      ok: {"Pending invitations", "application/json", InvitationsResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      not_found: {"Workspace unavailable", "application/json", ErrorResponse}
    ]

  def list_invitations(conn, %{"workspaceSlug" => workspace_slug}) do
    with :ok <- current_workspace?(conn, workspace_slug) do
      invitations =
        conn.assigns.current_workspace.id
        |> Workspaces.list_pending_invitations()
        |> Enum.map(&invitation_payload/1)

      json(conn, %{invitations: invitations})
    else
      :error -> workspace_not_found(conn)
    end
  end

  operation :create_invitation,
    summary: "Invite a person to a workspace",
    operation_id: "createWorkspaceInvitation",
    security: [%{"bearerAuth" => []}],
    parameters: [workspaceSlug: [in: :path, description: "Workspace slug", type: :string]],
    request_body:
      {"Invitation details", "application/json", CreateInvitationRequest, required: true},
    responses: [
      created:
        {"Invitation created", "application/json", NotifyOpenApi.WorkspaceSchemas.Invitation},
      conflict: {"Already an active member", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      not_found: {"Workspace unavailable", "application/json", ErrorResponse},
      service_unavailable: {"Invitation delivery failed", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def create_invitation(conn, %{"workspaceSlug" => workspace_slug} = params) do
    with :ok <- current_workspace?(conn, workspace_slug),
         {:ok, %{invitation: invitation, token: token}} <-
           Workspaces.create_invitation(conn.assigns.current_membership, params),
         :ok <- InvitationEmail.deliver(invitation.email, token) do
      conn
      |> put_status(:created)
      |> json(invitation_payload(invitation))
    else
      :error ->
        workspace_not_found(conn)

      {:error, :already_active_member} ->
        conflict(conn, "already_active_member", "User is already an active member.")

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :invalid_invitation} ->
        validation_error(conn, %{email: ["is required"], role: ["is required"]})

      {:error, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)

      {:error, :delivery_failed} ->
        delivery_failed(conn)

      {:error, _reason} ->
        delivery_failed(conn)
    end
  end

  operation :revoke_invitation,
    summary: "Revoke a pending workspace invitation",
    operation_id: "revokeWorkspaceInvitation",
    security: [%{"bearerAuth" => []}],
    parameters: [
      workspaceSlug: [in: :path, description: "Workspace slug", type: :string],
      invitationId: [in: :path, description: "Invitation ID", type: :string]
    ],
    responses: [
      no_content: "Invitation revoked",
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      not_found: {"Invitation unavailable", "application/json", ErrorResponse}
    ]

  def revoke_invitation(conn, %{
        "workspaceSlug" => workspace_slug,
        "invitationId" => invitation_id
      }) do
    with :ok <- current_workspace?(conn, workspace_slug),
         %Invitation{} = invitation <-
           Workspaces.get_unaccepted_invitation(conn.assigns.current_workspace.id, invitation_id),
         {:ok, _revoked_invitation} <- Workspaces.revoke_invitation(invitation) do
      send_resp(conn, :no_content, "")
    else
      nil -> invitation_not_found(conn)
      :error -> workspace_not_found(conn)
      {:error, _reason} -> invitation_not_found(conn)
    end
  end

  defp current_workspace?(conn, workspace_slug) do
    if conn.assigns.current_workspace.slug == workspace_slug, do: :ok, else: :error
  end

  defp member_payload(membership) do
    %{
      id: membership.id,
      email: membership.user.email,
      role: membership.role,
      joined_at: membership.joined_at
    }
  end

  defp invitation_payload(invitation) do
    %{
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expires_at: invitation.expires_at,
      invited_at: invitation.inserted_at
    }
  end

  defp workspace_not_found(conn),
    do: not_found(conn, "workspace_not_found", "Workspace is unavailable.")

  defp member_not_found(conn), do: not_found(conn, "member_not_found", "Member is unavailable.")

  defp invitation_not_found(conn),
    do: not_found(conn, "invitation_not_found", "Invitation is unavailable.")

  defp not_found(conn, code, detail), do: AuthError.render(conn, :not_found, code, detail)
  defp forbidden(conn), do: AuthError.render(conn, :forbidden, "forbidden", "Permission denied.")
  defp conflict(conn, code, detail), do: AuthError.render(conn, :conflict, code, detail)

  defp delivery_failed(conn) do
    Logger.error("Workspace invitation delivery failed")

    AuthError.render(
      conn,
      :service_unavailable,
      "invitation_delivery_failed",
      "Invitation delivery is temporarily unavailable."
    )
  end

  defp validation_error(conn, fields),
    do:
      AuthError.render(
        conn,
        :unprocessable_entity,
        "validation_failed",
        "Request validation failed.",
        fields
      )
end
