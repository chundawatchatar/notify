defmodule ApiWeb.MetricsController do
  use ApiWeb, :controller

  alias TelemetryMetricsPrometheus.Core

  def show(conn, _params) do
    cond do
      not metrics_enabled?() ->
        send_resp(conn, :not_found, "")

      not authorized?(conn) ->
        conn
        |> put_resp_header("www-authenticate", "Bearer")
        |> send_resp(:unauthorized, "")

      true ->
        conn
        |> put_resp_header("cache-control", "no-store")
        |> put_resp_header("content-type", "text/plain; version=0.0.4; charset=utf-8")
        |> send_resp(:ok, Core.scrape(:api_prometheus_metrics))
    end
  end

  defp metrics_enabled?, do: Application.get_env(:api, :metrics_enabled, false)

  defp authorized?(conn) do
    case Application.get_env(:api, :metrics_token) do
      nil -> true
      expected_token -> bearer_token_valid?(conn, expected_token)
    end
  end

  defp bearer_token_valid?(conn, expected_token) do
    with ["Bearer " <> provided_token] <- get_req_header(conn, "authorization"),
         true <- byte_size(provided_token) == byte_size(expected_token) do
      Plug.Crypto.secure_compare(provided_token, expected_token)
    else
      _error -> false
    end
  end
end
