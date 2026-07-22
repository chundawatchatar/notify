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

  defmodule Environment do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "NotificationAppEnvironment",
      type: :object,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string, example: "Development"},
        slug: %Schema{type: :string, example: "development"},
        production: %Schema{type: :boolean, example: false}
      },
      required: [:id, :name, :slug, :production]
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
end
