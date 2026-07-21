defmodule NotifyOpenApi.AuthSchemas do
  alias OpenApiSpex.Schema

  defmodule SignupRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "SignupRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{
          type: :string,
          format: :email,
          maxLength: 160,
          example: "owner@example.com"
        }
      },
      required: [:email]
    })
  end

  defmodule CompleteSignupRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CompleteSignupRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        signup_token: %Schema{
          type: :string,
          minLength: 1,
          description: "Short-lived credential issued after email verification."
        },
        password: %Schema{type: :string, format: :password, minLength: 8, maxLength: 72},
        workspace_name: %Schema{
          type: :string,
          minLength: 2,
          maxLength: 100,
          example: "Acme Cloud"
        },
        accept_terms: %Schema{type: :boolean, enum: [true], example: true}
      },
      required: [:signup_token, :password, :workspace_name, :accept_terms]
    })
  end

  defmodule AcceptInvitationRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "AcceptInvitationRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        token: %Schema{type: :string, minLength: 1, example: "invitation-token"}
      },
      required: [:token]
    })
  end

  defmodule ResolveInvitationRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ResolveInvitationRequest",
      type: :object,
      additionalProperties: false,
      properties: %{token: %Schema{type: :string, minLength: 1, example: "invitation-token"}},
      required: [:token]
    })
  end

  defmodule InvitationPreviewResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "InvitationPreviewResponse",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{type: :string, format: :email},
        expires_at: %Schema{type: :string, format: :date_time},
        role: %Schema{type: :string, enum: ["owner", "admin", "developer", "viewer"]},
        workspace_name: %Schema{type: :string}
      },
      required: [:email, :expires_at, :role, :workspace_name]
    })
  end

  defmodule CompleteInvitationSignupRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CompleteInvitationSignupRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        token: %Schema{type: :string, minLength: 1, example: "invitation-token"},
        password: %Schema{type: :string, format: :password, minLength: 8, maxLength: 72},
        password_confirmation: %Schema{
          type: :string,
          format: :password,
          minLength: 8,
          maxLength: 72
        },
        accept_terms: %Schema{type: :boolean, enum: [true], example: true}
      },
      required: [:token, :password, :password_confirmation, :accept_terms]
    })
  end

  defmodule LoginRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "LoginRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{
          type: :string,
          format: :email,
          maxLength: 160,
          example: "owner@example.com"
        },
        password: %Schema{type: :string, format: :password, minLength: 8, maxLength: 72},
        remember: %Schema{type: :boolean, default: false, example: true}
      },
      required: [:email, :password]
    })
  end

  defmodule ResendVerificationRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ResendVerificationRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{
          type: :string,
          format: :email,
          maxLength: 160,
          example: "owner@example.com"
        }
      },
      required: [:email]
    })
  end

  defmodule ConfirmEmailRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ConfirmEmailRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        token: %Schema{type: :string, minLength: 1, example: "verification-token"}
      },
      required: [:token]
    })
  end

  defmodule PasswordResetRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "PasswordResetRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{
          type: :string,
          format: :email,
          maxLength: 160,
          example: "owner@example.com"
        }
      },
      required: [:email]
    })
  end

  defmodule ConfirmPasswordResetRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ConfirmPasswordResetRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        token: %Schema{type: :string, minLength: 1, example: "password-reset-token"}
      },
      required: [:token]
    })
  end

  defmodule CompletePasswordResetRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CompletePasswordResetRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        reset_token: %Schema{
          type: :string,
          minLength: 1,
          description: "Short-lived credential issued after confirming a reset link."
        },
        password: %Schema{type: :string, format: :password, minLength: 8, maxLength: 72},
        password_confirmation: %Schema{
          type: :string,
          format: :password,
          minLength: 8,
          maxLength: 72
        }
      },
      required: [:reset_token, :password, :password_confirmation]
    })
  end

  defmodule StatusResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "AuthStatusResponse",
      type: :object,
      properties: %{
        status: %Schema{
          type: :string,
          enum: ["verification_sent"],
          example: "verification_sent"
        }
      },
      required: [:status]
    })
  end

  defmodule SignupTokenResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "SignupTokenResponse",
      type: :object,
      properties: %{
        signup_token: %Schema{
          type: :string,
          description: "One-time credential for completing the verified signup."
        },
        expires_in: %Schema{type: :integer, minimum: 1, example: 900}
      },
      required: [:signup_token, :expires_in]
    })
  end

  defmodule PasswordResetRequestResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "PasswordResetRequestResponse",
      type: :object,
      properties: %{
        status: %Schema{
          type: :string,
          enum: ["password_reset_requested"],
          example: "password_reset_requested"
        }
      },
      required: [:status]
    })
  end

  defmodule PasswordResetTokenResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "PasswordResetTokenResponse",
      type: :object,
      properties: %{
        reset_token: %Schema{
          type: :string,
          description: "One-time credential for completing a password reset."
        },
        expires_in: %Schema{type: :integer, minimum: 1, example: 900}
      },
      required: [:reset_token, :expires_in]
    })
  end

  defmodule PasswordResetCompletionResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "PasswordResetCompletionResponse",
      type: :object,
      properties: %{
        status: %Schema{type: :string, enum: ["password_reset"], example: "password_reset"}
      },
      required: [:status]
    })
  end

  defmodule SignupCompletionResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "SignupCompletionResponse",
      type: :object,
      properties: %{
        status: %Schema{type: :string, enum: ["account_created"], example: "account_created"}
      },
      required: [:status]
    })
  end

  defmodule UserSummary do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "AuthUser",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        email: %Schema{type: :string, format: :email, example: "owner@example.com"}
      },
      required: [:id, :email]
    })
  end

  defmodule WorkspaceSummary do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "AuthWorkspace",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, example: "Acme Cloud"},
        slug: %Schema{
          type: :string,
          maxLength: 50,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          example: "acme-cloud"
        }
      },
      required: [:id, :name, :slug]
    })
  end

  defmodule WorkspaceRole do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "AuthWorkspaceRole",
      type: :string,
      enum: ["owner", "admin", "developer", "viewer"],
      example: "owner"
    })
  end

  defmodule WorkspaceMembershipSummary do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceMembershipSummary",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, example: "Acme Cloud"},
        slug: %Schema{
          type: :string,
          maxLength: 50,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          example: "acme-cloud"
        },
        role: WorkspaceRole
      },
      required: [:id, :name, :slug, :role]
    })
  end

  defmodule WorkspaceListResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "WorkspaceListResponse",
      type: :object,
      properties: %{
        workspaces: %Schema{type: :array, items: WorkspaceMembershipSummary}
      },
      required: [:workspaces]
    })
  end

  defmodule SwitchWorkspaceRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "SwitchWorkspaceRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        workspace_slug: %Schema{
          type: :string,
          minLength: 1,
          maxLength: 50,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          example: "notify-labs"
        }
      },
      required: [:workspace_slug]
    })
  end

  defmodule MeResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CurrentUserResponse",
      type: :object,
      properties: %{
        user: UserSummary,
        workspace: WorkspaceSummary,
        role: WorkspaceRole
      },
      required: [:user, :workspace, :role]
    })
  end

  defmodule AuthResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "AuthResponse",
      type: :object,
      properties: %{
        access_token: %Schema{type: :string, description: "Short-lived JWT access token."},
        token_type: %Schema{type: :string, enum: ["Bearer"], example: "Bearer"},
        expires_in: %Schema{type: :integer, minimum: 1, example: 900},
        user: UserSummary,
        workspace: WorkspaceSummary,
        role: WorkspaceRole
      },
      required: [:access_token, :token_type, :expires_in, :user, :workspace, :role]
    })
  end

  defmodule ErrorDetails do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ErrorDetails",
      type: :object,
      properties: %{
        code: %Schema{type: :string, example: "invalid_credentials"},
        detail: %Schema{type: :string, example: "Email or password is invalid."}
      },
      required: [:code, :detail]
    })
  end

  defmodule ErrorResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ErrorResponse",
      type: :object,
      properties: %{errors: ErrorDetails},
      required: [:errors]
    })
  end

  defmodule ValidationErrorDetails do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ValidationErrorDetails",
      type: :object,
      properties: %{
        code: %Schema{type: :string, enum: ["validation_failed"]},
        detail: %Schema{type: :string},
        fields: %Schema{
          type: :object,
          additionalProperties: %Schema{type: :array, items: %Schema{type: :string}}
        }
      },
      required: [:code, :detail, :fields]
    })
  end

  defmodule ValidationErrorResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ValidationErrorResponse",
      type: :object,
      properties: %{errors: ValidationErrorDetails},
      required: [:errors]
    })
  end
end
