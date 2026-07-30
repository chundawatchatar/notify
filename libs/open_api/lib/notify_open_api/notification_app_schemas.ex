defmodule NotifyOpenApi.NotificationAppSchemas do
  alias OpenApiSpex.Schema

  defmodule CreateNotificationAppRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CreateNotificationAppRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, minLength: 1, maxLength: 100, example: "Payments Service"}
      },
      required: [:name]
    })
  end

  defmodule UpdateNotificationAppRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "UpdateNotificationAppRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, minLength: 1, maxLength: 100, example: "Payments Platform"}
      },
      required: [:name]
    })
  end

  defmodule SetupReadiness do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentSetupReadiness",
      type: :object,
      properties: %{
        ready: %Schema{type: :boolean, example: false},
        missing_requirements: %Schema{
          type: :array,
          items: %Schema{type: :string, enum: ["client_key", "trusted_origin"]}
        }
      },
      required: [:ready, :missing_requirements]
    })
  end

  defmodule Environment do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationAppEnvironment",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, example: "Development"},
        slug: %Schema{type: :string, example: "development"},
        production: %Schema{type: :boolean, example: false},
        readiness: SetupReadiness
      },
      required: [:id, :name, :slug, :production, :readiness]
    })
  end

  defmodule NotificationApp do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationApp",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, example: "Payments Service"},
        slug: %Schema{
          type: :string,
          minLength: 1,
          maxLength: 50,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          example: "payments-service"
        },
        environments: %Schema{type: :array, items: Environment}
      },
      required: [:id, :name, :slug, :environments]
    })
  end

  defmodule NotificationAppsResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationAppsResponse",
      type: :object,
      properties: %{apps: %Schema{type: :array, items: NotificationApp}},
      required: [:apps]
    })
  end

  defmodule ClientKey do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentClientKey",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        key: %Schema{type: :string, example: "nfy_pk_7K9fjNdZOzLkQenP2tHaBi8vWcXRm1sA"},
        created_at: %Schema{type: :string, format: "date-time"},
        revoked_at: %Schema{type: :string, format: "date-time", nullable: true}
      },
      required: [:id, :key, :created_at, :revoked_at]
    })
  end

  defmodule ClientKeysResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentClientKeysResponse",
      type: :object,
      properties: %{client_keys: %Schema{type: :array, items: ClientKey}},
      required: [:client_keys]
    })
  end

  defmodule ServerApiKeyStatus do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentServerApiKeyStatus",
      type: :string,
      enum: ["active", "revoked"],
      example: "active"
    })
  end

  defmodule ServerApiKey do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentServerApiKey",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, minLength: 1, maxLength: 100, example: "Ingest Worker"},
        masked_hint: %Schema{type: :string, example: "...AbCd"},
        status: ServerApiKeyStatus,
        created_at: %Schema{type: :string, format: "date-time"},
        revoked_at: %Schema{type: :string, format: "date-time", nullable: true}
      },
      required: [:id, :name, :masked_hint, :status, :created_at, :revoked_at]
    })
  end

  defmodule ServerApiKeysResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentServerApiKeysResponse",
      type: :object,
      properties: %{api_keys: %Schema{type: :array, items: ServerApiKey}},
      required: [:api_keys]
    })
  end

  defmodule CreateServerApiKeyRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CreateEnvironmentServerApiKeyRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, minLength: 1, maxLength: 100, example: "Ingest Worker"}
      },
      required: [:name]
    })
  end

  defmodule ServerApiKeySecret do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentServerApiKeySecret",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, minLength: 1, maxLength: 100, example: "Ingest Worker"},
        masked_hint: %Schema{type: :string, example: "...AbCd"},
        status: ServerApiKeyStatus,
        secret: %Schema{
          type: :string,
          pattern: "^nfy_sk_[A-Za-z0-9_-]{43}$",
          example: "nfy_sk_BaW4lCGg6lgBZW02rPpxT-m9q8qv8SxrwP7pvA8h8KQ"
        },
        created_at: %Schema{type: :string, format: "date-time"},
        revoked_at: %Schema{type: :string, format: "date-time", nullable: true}
      },
      required: [:id, :name, :masked_hint, :status, :secret, :created_at, :revoked_at]
    })
  end

  defmodule TrustedOrigin do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentTrustedOrigin",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        origin: %Schema{type: :string, example: "https://console.example.com"},
        created_at: %Schema{type: :string, format: "date-time"}
      },
      required: [:id, :origin, :created_at]
    })
  end

  defmodule TrustedOriginsResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "EnvironmentTrustedOriginsResponse",
      type: :object,
      properties: %{trusted_origins: %Schema{type: :array, items: TrustedOrigin}},
      required: [:trusted_origins]
    })
  end

  defmodule CreateTrustedOriginRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "CreateEnvironmentTrustedOriginRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        origin: %Schema{type: :string, example: "https://console.example.com"}
      },
      required: [:origin]
    })
  end
end
