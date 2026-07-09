defmodule ApiWeb.HealthController do
  use ApiWeb, :controller

  alias Api.Repo

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
