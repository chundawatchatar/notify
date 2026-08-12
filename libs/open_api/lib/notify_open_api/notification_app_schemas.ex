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

  defmodule NotificationRequest do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        event: %Schema{
          type: :string,
          minLength: 1,
          maxLength: 120,
          pattern: "^[a-z0-9_]+(?:\\.[a-z0-9_]+)*$"
        },
        recipient: %Schema{
          type: :object,
          additionalProperties: false,
          properties: %{id: %Schema{type: :string, minLength: 1, maxLength: 255}},
          required: [:id]
        },
        payload: %Schema{type: :object, additionalProperties: true},
        occurredAt: %Schema{type: :string, format: "date-time"},
        metadata: %Schema{type: :object, additionalProperties: true}
      },
      required: [:event, :recipient, :payload]
    })
  end

  defmodule IngestResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationIngestResponse",
      type: :object,
      properties: %{
        data: %Schema{
          type: :object,
          properties: %{
            event_id: %Schema{type: :string, format: :uuid},
            duplicate: %Schema{type: :boolean},
            accepted_at: %Schema{type: :string, format: "date-time"}
          },
          required: [:event_id, :duplicate, :accepted_at]
        }
      },
      required: [:data]
    })
  end

  defmodule IngressDetailsResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationIngressDetailsResponse",
      type: :object,
      properties: %{
        data: %Schema{
          type: :object,
          properties: %{
            app_id: %Schema{type: :string, format: :uuid},
            environment_id: %Schema{type: :string, format: :uuid},
            endpoint: %Schema{type: :string},
            idempotency_window_hours: %Schema{type: :integer},
            source: %Schema{type: :string, enum: ["server_api_key"]}
          },
          required: [:app_id, :environment_id, :endpoint, :idempotency_window_hours, :source]
        }
      },
      required: [:data]
    })
  end

  defmodule IngressEvent do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationIngressEvent",
      type: :object,
      properties: %{
        event_id: %Schema{type: :string, format: :uuid},
        event: %Schema{type: :string},
        recipient_id: %Schema{type: :string},
        source: %Schema{type: :string, enum: ["public_api", "dashboard_test"]},
        delivery_status: %Schema{type: :string, enum: ["pending", "processing", "published"]},
        accepted_at: %Schema{type: :string, format: "date-time"},
        occurred_at: %Schema{type: :string, format: "date-time", nullable: true}
      },
      required: [
        :event_id,
        :event,
        :recipient_id,
        :source,
        :delivery_status,
        :accepted_at,
        :occurred_at
      ]
    })
  end

  defmodule IngressEventsResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationIngressEventsResponse",
      type: :object,
      properties: %{events: %Schema{type: :array, items: IngressEvent}},
      required: [:events]
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
