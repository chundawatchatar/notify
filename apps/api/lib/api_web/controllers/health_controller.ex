defmodule ApiWeb.HealthController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Api.Repo
  alias NotifyOpenApi.Schemas.HealthResponse

  tags ["system"]

  operation :show,
    summary: "Read API health",
    operation_id: "getApiHealth",
    description: "Returns service metadata and dependency readiness checks.",
    responses: [
      ok: {"Healthy response", "application/json", HealthResponse},
      service_unavailable: {"Degraded response", "application/json", HealthResponse}
    ]

  def show(conn, _params) do
    database = database_status()
    ready? = database.ready

    status = if ready?, do: :ok, else: :service_unavailable

    conn
    |> put_status(status)
    |> json(%{
      status: if(ready?, do: "ok", else: "degraded"),
      service: service_info(),
      checks: %{
        database: database
      }
    })
  end

  defp database_status do
    case Repo.query("SELECT 1", [], timeout: 1_000) do
      {:ok, _result} ->
        %{ready: true}

      {:error, error} ->
        %{ready: false, error: Exception.message(error)}
    end
  rescue
    error in DBConnection.ConnectionError ->
      %{ready: false, error: Exception.message(error)}
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
