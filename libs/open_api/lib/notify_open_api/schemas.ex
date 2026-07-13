defmodule NotifyOpenApi.Schemas do
  alias OpenApiSpex.Schema

  defmodule ServiceInfo do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ServiceInfo",
      description: "API service metadata.",
      type: :object,
      properties: %{
        name: %Schema{type: :string, example: "notify-api"},
        version: %Schema{type: :string, example: "0.1.0"},
        environment: %Schema{type: :string, example: "dev"}
      },
      required: [:name, :version, :environment],
      example: %{
        "name" => "notify-api",
        "version" => "0.1.0",
        "environment" => "dev"
      }
    })
  end

  defmodule DatabaseCheck do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DatabaseCheck",
      description: "Database readiness check result.",
      type: :object,
      properties: %{
        ready: %Schema{type: :boolean, example: true},
        error: %Schema{type: :string, nullable: true, example: "connection not available"}
      },
      required: [:ready],
      example: %{
        "ready" => true
      }
    })
  end

  defmodule HealthChecks do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "HealthChecks",
      description: "API dependency readiness checks.",
      type: :object,
      properties: %{
        database: DatabaseCheck
      },
      required: [:database],
      example: %{
        "database" => %{
          "ready" => true
        }
      }
    })
  end

  defmodule HealthResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "HealthResponse",
      description: "API health response.",
      type: :object,
      properties: %{
        status: %Schema{type: :string, enum: ["ok", "degraded"], example: "ok"},
        service: ServiceInfo,
        checks: HealthChecks
      },
      required: [:status, :service, :checks],
      example: %{
        "status" => "ok",
        "service" => %{
          "name" => "notify-api",
          "version" => "0.1.0",
          "environment" => "dev"
        },
        "checks" => %{
          "database" => %{
            "ready" => true
          }
        }
      }
    })
  end

  defmodule VersionResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "VersionResponse",
      description: "API version response.",
      type: :object,
      properties: %{
        name: %Schema{type: :string, example: "notify-api"},
        version: %Schema{type: :string, example: "0.1.0"}
      },
      required: [:name, :version],
      example: %{
        "name" => "notify-api",
        "version" => "0.1.0"
      }
    })
  end
end
