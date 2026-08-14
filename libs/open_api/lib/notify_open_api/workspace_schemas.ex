defmodule NotifyOpenApi.WorkspaceSchemas do
  alias OpenApiSpex.Schema
  alias NotifyOpenApi.AuthSchemas.{ErrorResponse, ValidationErrorResponse, WorkspaceRole}

  defmodule WorkspaceSettings do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceSettings",
      type: :object,
      properties: %{
        name: %Schema{type: :string, minLength: 2, maxLength: 100, example: "Acme Cloud"},
        slug: %Schema{
          type: :string,
          minLength: 1,
          maxLength: 50,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          example: "acme-cloud"
        },
        timezone: %Schema{type: :string, minLength: 1, maxLength: 255, example: "UTC"},
        default_environment: %Schema{type: :string, enum: ["development"]}
      },
      required: [:name, :slug, :timezone, :default_environment]
    })
  end

  defmodule WorkspaceSettingsResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceSettingsResponse",
      type: :object,
      properties: %{settings: WorkspaceSettings},
      required: [:settings]
    })
  end

  defmodule UpdateWorkspaceSettingsRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "UpdateWorkspaceSettingsRequest",
      type: :object,
      additionalProperties: false,
      minProperties: 1,
      properties: %{
        name: %Schema{type: :string, minLength: 2, maxLength: 100, example: "Acme Platform"},
        timezone: %Schema{
          type: :string,
          minLength: 1,
          maxLength: 255,
          example: "Asia/Kolkata"
        }
      }
    })
  end

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
