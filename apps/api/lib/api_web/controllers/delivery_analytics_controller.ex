defmodule ApiWeb.DeliveryAnalyticsController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  require Logger

  alias Api.DeliveryAnalytics
  alias ApiWeb.AuthError
  alias ApiWeb.Plugs.RequirePermission
  alias NotifyOpenApi.AnalyticsSchemas
  alias NotifyOpenApi.AuthSchemas.ErrorResponse

  plug RequirePermission, :view_events

  tags ["delivery analytics"]

  operation :index,
    summary: "Get delivery analytics for the active workspace",
    operation_id: "getDeliveryAnalytics",
    security: [%{"bearerAuth" => []}],
    parameters: [
      window: [
        in: :query,
        required: true,
        description: "Fixed analytics window",
        schema: %OpenApiSpex.Schema{type: :string, enum: ["24h", "7d", "30d"]}
      ],
      appId: [
        in: :query,
        description: "Notification app ID resolved inside the active workspace",
        schema: %OpenApiSpex.Schema{type: :string, format: :uuid}
      ],
      environmentId: [
        in: :query,
        description: "Environment ID owned by the selected notification app",
        schema: %OpenApiSpex.Schema{type: :string, format: :uuid}
      ]
    ],
    responses: [
      ok: {"Delivery analytics", "application/json", AnalyticsSchemas.Response},
      not_found: {"Analytics scope unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      unprocessable_entity: {"Invalid analytics query", "application/json", ErrorResponse},
      internal_server_error: {"Analytics unavailable", "application/json", ErrorResponse}
    ]

  def index(conn, %{"window" => window} = params) do
    filters = %{
      notification_app_id: Map.get(params, "appId"),
      app_environment_id: Map.get(params, "environmentId")
    }

    case DeliveryAnalytics.query(conn.assigns.current_workspace, window, filters) do
      {:ok, analytics} -> json(conn, analytics_payload(analytics))
      {:error, :invalid_window} -> invalid_window(conn)
      {:error, :invalid_scope} -> invalid_scope(conn)
      {:error, :not_found} -> scope_not_found(conn)
      {:error, reason} -> analytics_failed(conn, reason)
    end
  end

  def index(conn, _params), do: invalid_window(conn)

  defp analytics_payload(analytics) do
    %{
      window: Map.take(analytics.window, [:name, :start_at, :as_of]),
      filters: %{
        app_id: analytics.filters.notification_app_id,
        environment_id: analytics.filters.app_environment_id
      },
      totals: analytics.totals,
      trend: analytics.trend,
      apps: analytics.apps
    }
  end

  defp invalid_window(conn) do
    AuthError.render(
      conn,
      :unprocessable_entity,
      "invalid_analytics_window",
      "Window must be one of 24h, 7d, or 30d."
    )
  end

  defp invalid_scope(conn) do
    AuthError.render(
      conn,
      :unprocessable_entity,
      "invalid_analytics_scope",
      "An environment filter requires its owning app filter."
    )
  end

  defp scope_not_found(conn) do
    AuthError.render(
      conn,
      :not_found,
      "analytics_scope_not_found",
      "The selected analytics scope is unavailable."
    )
  end

  defp analytics_failed(conn, reason) do
    Logger.error("Delivery analytics query failed: #{inspect(reason)}")

    AuthError.render(
      conn,
      :internal_server_error,
      "analytics_unavailable",
      "Delivery analytics are temporarily unavailable."
    )
  end
end
