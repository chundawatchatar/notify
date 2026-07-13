defmodule ApiWeb.HealthController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  require Logger

  alias Api.Repo
  alias NotifyOpenApi.Schemas.{LivenessResponse, ReadinessResponse}

  tags ["system"]

  operation :live,
    summary: "Read API liveness",
    operation_id: "getApiLiveness",
    description: "Reports whether the API process is running and able to serve requests.",
    responses: [
      ok: {"Live response", "application/json", LivenessResponse}
    ]

  operation :ready,
    summary: "Read API readiness",
    operation_id: "getApiReadiness",
    description: "Reports whether the API and its required dependencies can serve traffic.",
    responses: [
      ok: {"Ready response", "application/json", ReadinessResponse},
      service_unavailable: {"Not ready response", "application/json", ReadinessResponse}
    ]

  def live(conn, _params) do
    json(conn, %{
      status: "ok",
      service: service_info()
    })
  end

  def ready(conn, _params) do
    database_ready? = database_ready?()

    status = if database_ready?, do: :ok, else: :service_unavailable

    conn
    |> put_status(status)
    |> json(%{
      status: if(database_ready?, do: "ok", else: "degraded"),
      service: service_info(),
      checks: %{
        database: %{
          ready: database_ready?
        }
      }
    })
  end

  defp database_ready? do
    case Repo.query("SELECT 1", [], timeout: 1_000) do
      {:ok, _result} ->
        true

      {:error, error} ->
        log_database_failure(error)
        false
    end
  rescue
    error ->
      log_database_failure(error)
      false
  catch
    kind, reason ->
      Logger.warning(
        "Database readiness check failed: #{Exception.format(kind, reason, __STACKTRACE__)}"
      )

      false
  end

  defp log_database_failure(error) do
    Logger.warning("Database readiness check failed: #{Exception.message(error)}")
  end

  defp service_info do
    %{
      name: "notify-api",
      version: app_version(),
      environment: :api |> Application.fetch_env!(:environment) |> Atom.to_string()
    }
  end

  defp app_version do
    :api
    |> Application.spec(:vsn)
    |> to_string()
  end
end
