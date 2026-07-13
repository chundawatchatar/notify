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
        ready: %Schema{type: :boolean, example: true}
      },
      required: [:ready],
      example: %{
        "ready" => true
      }
    })
  end

  defmodule ReadinessChecks do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ReadinessChecks",
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

  defmodule LivenessResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "LivenessResponse",
      description: "API process liveness response.",
      type: :object,
      properties: %{
        status: %Schema{type: :string, enum: ["ok"], example: "ok"},
        service: ServiceInfo
      },
      required: [:status, :service],
      example: %{
        "status" => "ok",
        "service" => %{
          "name" => "notify-api",
          "version" => "0.1.0",
          "environment" => "dev"
        }
      }
    })
  end

  defmodule ReadinessResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "ReadinessResponse",
      description: "API dependency readiness response.",
      type: :object,
      properties: %{
        status: %Schema{type: :string, enum: ["ok", "degraded"], example: "ok"},
        service: ServiceInfo,
        checks: ReadinessChecks
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
