defmodule NotifyOpenApi.WorkspaceSchemas do
  alias OpenApiSpex.Schema
  alias NotifyOpenApi.AuthSchemas.{ErrorResponse, ValidationErrorResponse, WorkspaceRole}

  defmodule Member do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceMember",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        email: %Schema{type: :string, format: :email, example: "developer@example.com"},
        role: WorkspaceRole,
        joined_at: %Schema{type: :string, format: "date-time"}
      },
      required: [:id, :email, :role, :joined_at]
    })
  end

  defmodule MembersResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceMembersResponse",
      type: :object,
      properties: %{members: %Schema{type: :array, items: Member}},
      required: [:members]
    })
  end

  defmodule UpdateMemberRoleRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "UpdateWorkspaceMemberRoleRequest",
      type: :object,
      additionalProperties: false,
      properties: %{role: WorkspaceRole},
      required: [:role]
    })
  end

  defmodule UpdateMemberRoleErrorResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "UpdateWorkspaceMemberRoleErrorResponse",
      type: :object,
      anyOf: [ErrorResponse, ValidationErrorResponse]
    })
  end

  defmodule Invitation do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceInvitation",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        email: %Schema{type: :string, format: :email, example: "developer@example.com"},
        role: WorkspaceRole,
        expires_at: %Schema{type: :string, format: "date-time"},
        invited_at: %Schema{type: :string, format: "date-time"}
      },
      required: [:id, :email, :role, :expires_at, :invited_at]
    })
  end

  defmodule InvitationsResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceInvitationsResponse",
      type: :object,
      properties: %{invitations: %Schema{type: :array, items: Invitation}},
      required: [:invitations]
    })
  end

  defmodule CreateInvitationRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CreateWorkspaceInvitationRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{
          type: :string,
          format: :email,
          maxLength: 160,
          example: "developer@example.com"
        },
        role: WorkspaceRole
      },
      required: [:email, :role]
    })
  end
end
